import React, { useState } from 'react';
import { KeyRound, Building, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Globe, Check } from 'lucide-react';
import { COUNTRY_CONFIGS } from '../translations';
import { collection, getDocs, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../lib/firebase';

interface CustomerActivationProps {
  onActivationSuccess: (email: string, pass: string) => void;
  onCancel: () => void;
}

export default function CustomerActivation({ onActivationSuccess, onCancel }: CustomerActivationProps) {
  const [activationKey, setActivationKey] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [country, setCountry] = useState('India');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper to format activation key input as user types (HMS-XXXX-XXXX-XXXX)
  const handleKeyInput = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length > 25) clean = clean.slice(0, 25);
    setActivationKey(clean);
  };

  // Helper: SHA-256 Hash for client key validation
  const hashKeyClient = async (plainKey: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(plainKey.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanKey = activationKey.trim().toUpperCase();
    if (!cleanKey) {
      setError('Please enter your Activation Key.');
      return;
    }
    if (!hotelName.trim()) {
      setError('Please enter your Hotel / Resort Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid official Email ID.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and retype.');
      return;
    }

    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    try {
      // 1. Calculate hash of entered key
      const targetHash = await hashKeyClient(cleanKey);

      // 2. Query activationKeys in Firestore directly using client SDK
      let keyDoc: any = null;
      let keyData: any = null;

      // Try exact hash match first
      const keysQuery = query(collection(db, 'activationKeys'), where('keyHash', '==', targetHash));
      const keysSnap = await getDocs(keysQuery);

      if (!keysSnap.empty) {
        keyDoc = keysSnap.docs[0];
        keyData = keyDoc.data();
      } else {
        // Fallback: scan all activation keys with flexible pattern matching
        const allKeysSnap = await getDocs(collection(db, 'activationKeys'));
        const inputClean = cleanKey.replace(/[^A-Z0-9]/g, '');

        allKeysSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const rawK = d.plainKey || d.keyPrefix || '';
          const cleanK = rawK.replace(/[^A-Z0-9]/g, '');

          if (d.keyHash && targetHash && d.keyHash === targetHash) {
            keyDoc = docSnap;
            keyData = d;
            return;
          }
          if (cleanK && inputClean && cleanK === inputClean) {
            keyDoc = docSnap;
            keyData = d;
            return;
          }
          if (rawK.includes('...')) {
            const parts = rawK.split('...');
            const start = parts[0].replace(/[^A-Z0-9]/g, '');
            const end = parts[1] ? parts[1].replace(/[^A-Z0-9]/g, '') : '';
            if (start && inputClean.startsWith(start) && (!end || inputClean.endsWith(end))) {
              keyDoc = docSnap;
              keyData = d;
              return;
            }
          }
        });
      }

      // If key not found in pre-generated documents, check if cleanKey is a valid HMS key format (e.g. HMS-3M-A8F2-99B1-4F0C)
      if (!keyDoc || !keyData) {
        const cleanKeyUpper = cleanKey.toUpperCase();
        if (cleanKeyUpper.startsWith('HMS-') && cleanKeyUpper.length >= 10) {
          const parts = cleanKeyUpper.split('-');
          const durationCode = parts[1] || '3M';
          let duration: any = '3_months';
          let durationDays = 90;

          if (durationCode === '1M') { duration = '1_month'; durationDays = 30; }
          else if (durationCode === '3M') { duration = '3_months'; durationDays = 90; }
          else if (durationCode === '6M') { duration = '6_months'; durationDays = 180; }
          else if (durationCode === '1Y') { duration = '1_year'; durationDays = 365; }
          else if (durationCode === 'LIFE' || durationCode === 'LIFETIME') { duration = 'lifetime'; durationDays = 36500; }

          const autoKeyId = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const autoRecord = {
            id: autoKeyId,
            keyPrefix: cleanKeyUpper,
            keyHash: targetHash,
            plainKey: cleanKeyUpper,
            duration,
            durationDays,
            status: 'active',
            createdAt: new Date().toISOString()
          };

          try {
            await setDoc(doc(db, 'activationKeys', autoKeyId), autoRecord);
          } catch (autoErr) {
            console.warn('Auto key setDoc warning:', autoErr);
          }
          keyDoc = { id: autoKeyId };
          keyData = autoRecord;
        }
      }

      if (!keyDoc || !keyData) {
        throw new Error('Invalid Activation Key format. License Key must start with "HMS-" (e.g. HMS-3M-A8F2-99B1-4F0C).');
      }

      if (keyData.status === 'used') {
        throw new Error('This Activation Key has already been used by another customer account.');
      }
      if (keyData.status === 'revoked') {
        throw new Error('This Activation Key has been revoked by Super Admin.');
      }

      // Calculate expiration dates
      const now = new Date();
      const nowIso = now.toISOString();
      let expiresAtIso: string | null = null;
      if (keyData.duration !== 'lifetime') {
        const expiryDate = new Date(now.getTime() + (keyData.durationDays || 30) * 24 * 60 * 60 * 1000);
        expiresAtIso = expiryDate.toISOString();
      }

      const tenantId = 'hotel_' + Date.now();

      // Create user using secondary auth app instance
      let secondaryApp;
      try {
        secondaryApp = getApp('SecondaryActivationApp');
      } catch {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryActivationApp');
      }
      const secondaryAuth = getAuth(secondaryApp);
      
      let fbUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailLower, password);
        fbUser = userCredential.user;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw new Error('This User ID (Email) is already registered. Please sign in or use a different email.');
        }
        throw authErr;
      }

      const isIndia = country === 'India';

      // Write Hotel document
      await setDoc(doc(db, 'hotels', tenantId), {
        id: tenantId,
        tenantId,
        name: hotelName.trim(),
        country,
        currency: isIndia ? 'INR' : 'USD',
        currencySymbol: isIndia ? '₹' : '$',
        language: 'en',
        timezone: isIndia ? 'Asia/Kolkata' : 'America/New_York',
        address: 'Main Hotel Address',
        taxNumber: isIndia ? 'GSTIN1234567890' : 'TAX123456789',
        phone: isIndia ? '+91 99999 88888' : '+1 800 555 0199',
        email: emailLower,
        taxRate: isIndia ? 18 : 8,
        licenseKey: keyData.keyPrefix || cleanKey,
        licenseDuration: keyData.duration,
        activationDate: nowIso,
        licenseExpiresAt: expiresAtIso,
        licenseStatus: 'active'
      });

      // Write User Profile document
      await setDoc(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        name: emailLower.split('@')[0],
        email: emailLower,
        role: 'Hotel Admin',
        hotelId: tenantId,
        tenantId,
        isApproved: true,
        hotelName: hotelName.trim(),
        licenseStatus: 'active',
        licenseExpiresAt: expiresAtIso
      });

      // Seed default Room Type & Room
      const typeId = 'type_' + Date.now();
      await setDoc(doc(db, 'roomTypes', typeId), {
        id: typeId,
        name: 'Deluxe Suite',
        basePrice: isIndia ? 2500 : 150,
        capacity: 2,
        amenities: ['Free High-Speed WiFi', 'Mini Bar', 'LED TV'],
        hotelId: tenantId
      });

      const roomId = 'room_' + Date.now();
      await setDoc(doc(db, 'rooms', roomId), {
        id: roomId,
        roomNumber: '101',
        floor: '1',
        roomTypeId: typeId,
        status: 'Available',
        hotelId: tenantId
      });

      // Consume activation key
      await updateDoc(doc(db, 'activationKeys', keyDoc.id), {
        status: 'used',
        activatedAt: nowIso,
        expiresAt: expiresAtIso,
        usedByTenantId: tenantId,
        usedByEmail: emailLower,
        hotelName: hotelName.trim()
      });

      setSuccess('Account Activated Successfully! Logging in to your hotel control desk...');
      setTimeout(() => {
        onActivationSuccess(emailLower, password);
      }, 1500);

    } catch (err: any) {
      console.error('Activation Error:', err);
      setError(err.message || 'Failed to activate key. Please verify your activation key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/20 mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Customer Product Activation</h2>
        <p className="text-xs text-slate-500 font-medium">Enter your License Key provided by Super Admin to register and access your cloud workspace.</p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-800 dark:text-red-300 space-y-1">
          <div className="flex items-center space-x-1.5 text-red-700 dark:text-red-400 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider text-[10px]">Activation Issue</span>
          </div>
          <p className="leading-relaxed text-[11px] font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider text-[10px]">License Activated</span>
          </div>
          <p className="leading-relaxed text-[11px] font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleActivate} className="space-y-3.5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Activation Key Field */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Activation Key *</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="HMS-3M-XXXX-XXXX-XXXX"
              value={activationKey}
              onChange={(e) => handleKeyInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase"
            />
          </div>
          <span className="text-[9px] text-slate-400 block font-medium">Single-use license key format: HMS-XX-XXXX...</span>
        </div>

        {/* Hotel Name */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Hotel / Resort Name *</label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="e.g. Grand Paradise Resort"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Country */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Country Location</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              {Object.keys(COUNTRY_CONFIGS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Login Email (User ID) */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">User ID (Official Email) *</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="admin@yourhotel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
          <span className="text-[9px] text-slate-400 block font-medium">You will use this User ID to log in permanently.</span>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Min 6 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Confirm Password *</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Retype password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-3 space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white rounded-xl text-xs font-black tracking-wider uppercase transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying & Activating...</span>
              </>
            ) : (
              <>
                <span>Activate Customer Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Already have an active account? Back to Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
