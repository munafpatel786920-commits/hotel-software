import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../lib/firebase';
import { UserProfile, Hotel, ActivationKey, LicenseDuration } from '../types';
import {
  Shield,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Trash2,
  Lock,
  Unlock,
  Building,
  KeyRound,
  Plus,
  X,
  Mail,
  Eye,
  EyeOff,
  User,
  MapPin,
  Globe,
  Copy,
  Check
} from 'lucide-react';

interface SuperAdminPanelProps {
  lang: string;
}

export default function SuperAdminPanel({ lang }: SuperAdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'keys'>('clients');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activationKeys, setActivationKeys] = useState<ActivationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Activation Key Generation Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<LicenseDuration>('3_months');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Add Client Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addClientMode, setAddClientMode] = useState<'key' | 'direct'>('key');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formHotelName, setFormHotelName] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formAddress, setFormAddress] = useState('Main Street Address');
  const [formApproved, setFormApproved] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Custom Confirmation & Toast Feedback States
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setPanelFeedback({ type, message });
    setTimeout(() => {
      setPanelFeedback(null);
    }, 4000);
  };

  // Helper: SHA-256 Hash for client key generation
  const hashKeyClient = async (plainKey: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(plainKey.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper: Format random key
  const generatePlainKeyString = (duration: string): { plainKey: string; days: number } => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand = (len: number) => Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    
    let code = '1M';
    let days = 30;
    if (duration === '3_months') { code = '3M'; days = 90; }
    else if (duration === '6_months') { code = '6M'; days = 180; }
    else if (duration === '1_year') { code = '1Y'; days = 365; }
    else if (duration === 'lifetime') { code = 'LIFE'; days = 36500; }

    return { plainKey: `HMS-${code}-${rand(4)}-${rand(4)}-${rand(4)}`, days };
  };

  // Load all users, hotels, and activation keys
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = [];
      const seenSuperAdmins = new Set<string>();
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.role === 'Super Admin' || u.role === 'System Owner') {
          const emailLower = (u.email || '').toLowerCase().trim();
          if (seenSuperAdmins.has(emailLower)) {
            return; // Skip duplicate Super Admin profile to display only one
          }
          seenSuperAdmins.add(emailLower);
        }
        usersList.push(u);
      });

      // Fetch hotels
      const hotelsSnap = await getDocs(collection(db, 'hotels'));
      const hotelsList: Hotel[] = [];
      hotelsSnap.forEach((d) => {
        hotelsList.push(d.data() as Hotel);
      });

      // Fetch activation keys directly from Firestore
      try {
        const keysSnap = await getDocs(collection(db, 'activationKeys'));
        const keysList: ActivationKey[] = [];
        keysSnap.forEach((d) => {
          keysList.push(d.data() as ActivationKey);
        });
        keysList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setActivationKeys(keysList);
      } catch (keyErr) {
        console.warn('Fallback: Could not fetch keys from Firestore directly:', keyErr);
        try {
          const res = await fetch('/api/keys/list');
          if (res.ok) {
            const data = await res.json();
            if (data.success) setActivationKeys(data.keys || []);
          }
        } catch (apiErr) {
          console.warn('API fetch also failed:', apiErr);
        }
      }

      setUsers(usersList);
      setHotels(hotelsList);
    } catch (err: any) {
      console.error('Error fetching admin panel data:', err);
      setError(err.message || 'Failed to load system data. Please verify your Firestore security rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate a new Activation Key
  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    setGeneratedPlainKey(null);
    setCopied(false);
    try {
      const { plainKey, days } = generatePlainKeyString(selectedDuration);
      const keyHash = await hashKeyClient(plainKey);
      const keyPrefix = plainKey;
      const keyId = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();

      const keyRecord: ActivationKey = {
        id: keyId,
        keyPrefix: plainKey,
        keyHash,
        duration: selectedDuration,
        durationDays: days,
        status: 'active',
        createdAt: now
      };

      // Direct Firestore write
      await setDoc(doc(db, 'activationKeys', keyId), keyRecord);

      setGeneratedPlainKey(plainKey);
      showFeedback('success', 'New Activation Key generated successfully!');
      fetchData();
    } catch (err: any) {
      console.error('Error generating key:', err);
      // Try API route as fallback
      try {
        const res = await fetch('/api/keys/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: selectedDuration })
        });
        const data = await res.json();
        if (data.success) {
          setGeneratedPlainKey(data.plainKey);
          showFeedback('success', 'New Activation Key generated!');
          fetchData();
          return;
        }
      } catch (apiErr) {
        console.error(apiErr);
      }
      showFeedback('error', err.message || 'Error generating key');
    } finally {
      setGeneratingKey(false);
    }
  };

  // Revoke an Activation Key
  const handleRevokeKey = async (keyId: string) => {
    setActionLoading(keyId);
    try {
      await updateDoc(doc(db, 'activationKeys', keyId), {
        status: 'revoked',
        revokedAt: new Date().toISOString()
      });
      showFeedback('success', 'Activation key revoked.');
      fetchData();
    } catch (err: any) {
      console.error('Revoke key error:', err);
      showFeedback('error', err.message || 'Error revoking key');
    } finally {
      setActionLoading(null);
    }
  };

  // Block / Unblock Customer License
  const handleToggleBlockAccount = async (hotelId: string, isCurrentlyBlocked: boolean) => {
    setActionLoading(hotelId);
    try {
      const newStatus = isCurrentlyBlocked ? 'active' : 'blocked';
      const isApproved = isCurrentlyBlocked ? true : false;

      // Update Hotel record
      await updateDoc(doc(db, 'hotels', hotelId), {
        licenseStatus: newStatus
      });

      // Update matching user profile documents
      const usersToUpdate = users.filter((u) => u.hotelId === hotelId);
      for (const u of usersToUpdate) {
        await updateDoc(doc(db, 'users', u.uid), {
          isApproved,
          licenseStatus: newStatus
        });
      }

      showFeedback('success', `Customer account ${isCurrentlyBlocked ? 'unblocked' : 'blocked'} successfully.`);
      fetchData();
    } catch (err: any) {
      console.error('Toggle account block error:', err);
      showFeedback('error', err.message || 'Error updating account status');
    } finally {
      setActionLoading(null);
    }
  };

  // Update a user's approval status
  const handleUpdateApproval = async (uid: string, approved: boolean) => {
    setActionLoading(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isApproved: approved
      });

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, isApproved: approved } : u))
      );
      showFeedback('success', approved ? 'Access approved successfully.' : 'Access revoked successfully.');
    } catch (err: any) {
      showFeedback('error', `Error updating subscription status: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete a user profile (de-register)
  const handleDeleteUser = async (uid: string) => {
    setActionLoading(uid);
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      showFeedback('success', 'Client profile deleted successfully.');
    } catch (err: any) {
      showFeedback('error', `Error deleting user profile: ${err.message || err}`);
    } finally {
      setActionLoading(null);
      setDeleteConfirmUser(null);
    }
  };

  // Create a new client (customer) directly with email/password
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim() || !formHotelName.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      let secondaryApp;
      try {
        secondaryApp = getApp('SecondaryApp');
      } catch {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      }

      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Create the Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formEmail.trim(), formPassword);
      const fbUser = userCredential.user;

      // Immediately sign out secondary auth so it doesn't log in the Super Admin as this user
      await signOut(secondaryAuth);

      // 2. Prepare Hotel Document
      const hotelId = 'hotel_' + Date.now();
      const newHotel: Hotel = {
        id: hotelId,
        name: formHotelName.trim(),
        country: formCountry,
        currency: formCountry === 'India' ? 'INR' : 'USD',
        currencySymbol: formCountry === 'India' ? '₹' : '$',
        language: 'en',
        timezone: formCountry === 'India' ? 'Asia/Kolkata' : 'America/New_York',
        address: formAddress.trim() || 'Main Street Address',
        taxNumber: formCountry === 'India' ? 'GSTIN1234567890' : 'TX987654321',
        phone: '+91 99999 88888',
        email: formEmail.trim(),
        taxRate: formCountry === 'India' ? 18 : 8
      };

      // 3. Prepare User Profile Document
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: 'Hotel Admin',
        hotelId,
        isApproved: formApproved,
        hotelName: formHotelName.trim()
      };

      // 4. Write documents to Firestore using primary DB app!
      await setDoc(doc(db, 'hotels', hotelId), newHotel);
      await setDoc(doc(db, 'users', fbUser.uid), newProfile);

      // 5. Seed default room category & deluxe room for this hotel
      const typeId = 'type_' + Date.now();
      await setDoc(doc(db, 'roomTypes', typeId), {
        id: typeId,
        name: 'Deluxe Suite',
        basePrice: formCountry === 'India' ? 2500 : 150,
        amenities: ['Free High-Speed WiFi', 'Premium Mini Bar', 'Sea View Balcony', 'Led Smart TV'],
        capacity: 2,
        hotelId
      });

      await addDoc(collection(db, 'rooms'), {
        roomNumber: '101',
        floor: '1',
        roomTypeId: typeId,
        status: 'Available',
        hotelId
      });

      setFormSuccess('Client registered successfully! They can now log in with their email & password.');
      
      // Clear inputs
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormHotelName('');
      setFormAddress('Main Street Address');
      setFormApproved(true);

      // Refresh data
      await fetchData();
      
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess(null);
      }, 2500);

    } catch (err: any) {
      console.error('Error creating new customer:', err);
      if (err.code === 'auth/email-already-in-use') {
        setFormError('This login email ID is already registered in Firebase.');
      } else {
        setFormError(err.message || 'Registration failed. Please check your credentials or network.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper: Find hotel name if not directly saved in profile
  const getHotelName = (user: UserProfile) => {
    if (user.hotelName) return user.hotelName;
    const h = hotels.find((hotel) => hotel.id === user.hotelId);
    return h ? h.name : 'Unknown Resort / Hotel';
  };

  // Statistics Computations
  const totalHotels = hotels.filter((h) => 
    users.some((u) => u.hotelId === h.id && u.isApproved === true && u.role !== 'Super Admin' && u.role !== 'System Owner')
  ).length;
  const totalUsers = users.filter((u) => u.role !== 'Super Admin' && u.role !== 'System Owner').length;
  const approvedHotels = users.filter((u) => u.isApproved === true && u.role !== 'Super Admin' && u.role !== 'System Owner').length;
  const pendingApprovals = users.filter((u) => u.isApproved !== true && u.role !== 'Super Admin' && u.role !== 'System Owner').length;

  // Filtered list
  const filteredUsers = users.filter((user) => {
    // Exclude Super Admins from being managed (or show them with special tag)
    const hotelNameStr = getHotelName(user).toLowerCase();
    const adminNameStr = (user.name || '').toLowerCase();
    const emailStr = (user.email || '').toLowerCase();
    const matchesSearch =
      hotelNameStr.includes(searchTerm.toLowerCase()) ||
      adminNameStr.includes(searchTerm.toLowerCase()) ||
      emailStr.includes(searchTerm.toLowerCase());

    const isUserApproved = user.isApproved === true || user.role === 'Super Admin' || user.role === 'System Owner';

    if (statusFilter === 'approved') {
      return matchesSearch && isUserApproved;
    }
    if (statusFilter === 'pending') {
      return matchesSearch && !isUserApproved && user.role !== 'Super Admin' && user.role !== 'System Owner';
    }
    return matchesSearch;
  });

  return (
    <div id="super-admin-panel" className="space-y-6 relative">
      {/* Toast Feedback Notification */}
      {panelFeedback && (
        <div className={`fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4.5 py-3 rounded-xl border shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
          panelFeedback.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 backdrop-blur-md' 
            : 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300 backdrop-blur-md'
        }`}>
          {panelFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{panelFeedback.message}</span>
          <button onClick={() => setPanelFeedback(null)} className="hover:opacity-70 pl-1.5 shrink-0 text-slate-400 font-bold transition-opacity cursor-pointer">✕</button>
        </div>
      )}
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold tracking-wider text-xs uppercase mb-1">
              <Shield className="w-4 h-4" />
              <span>Multi-Tenant Master Control</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Super Admin Hub</h2>
            <p className="text-slate-400 text-xs mt-1">
              Manage client hotel registrations, approve software subscriptions, and oversee global system infrastructure.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 relative z-10">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Generate Activation Key</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Client</span>
            </button>
            <button
              onClick={fetchData}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/60 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Databases</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mt-5 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'clients'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Customer Accounts ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('keys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'keys'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Activation Keys & Licensing ({activationKeys.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hotels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Hotels</span>
            <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{totalHotels}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Approved Hotels</span>
            <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{approvedHotels}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Approvals</span>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingApprovals}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Total Admin Operators */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Operator Profiles</span>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{totalUsers}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center space-x-3 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
        {activeSubTab === 'clients' ? (
          <>
            {/* Controls Panel */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by client, email, or hotel name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40 w-full sm:w-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  All Clients
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'approved'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Pending Approval
                </button>
              </div>
            </div>

            {/* Users / Hotels Table */}
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Scanning multi-tenant databases...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <Building className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold">No hotel registration accounts found.</p>
                <p className="text-xs text-slate-400/80 mt-1">Try resetting search filters or register a new client hotel account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                      <th className="py-4 px-6">Client Profile</th>
                      <th className="py-4 px-6">Hotel Details</th>
                      <th className="py-4 px-6">Assigned Role</th>
                      <th className="py-4 px-6">Access Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                    {filteredUsers.map((user) => {
                      const isSuper = user.role === 'Super Admin' || user.role === 'System Owner';
                      const isApproved = user.isApproved === true || isSuper;

                      return (
                        <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                              <span>{user.name}</span>
                              {isSuper && (
                                <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center space-x-0.5">
                                  <Shield className="w-2.5 h-2.5" />
                                  <span>System Owner</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{user.email}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{getHotelName(user)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 font-mono select-all">
                              ID: {user.hotelId}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {isApproved ? (
                              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                <CheckCircle className="w-4 h-4" />
                                <span>Active / Approved</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                                <Clock className="w-4 h-4" />
                                <span>Access Suspended / Blocked</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {isSuper ? (
                                <span className="text-[10px] text-slate-400 italic">Owner Account (Protected)</span>
                              ) : (
                                <>
                                  {isApproved ? (
                                    <button
                                      onClick={() => handleToggleBlockAccount(user.hotelId, false)}
                                      disabled={actionLoading === user.hotelId}
                                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:text-amber-400 rounded-lg text-[11px] font-bold border border-amber-200/40 dark:border-amber-900/40 transition-colors cursor-pointer"
                                      title="Block customer account access"
                                    >
                                      <Lock className="w-3 h-3" />
                                      <span>Block Access</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleBlockAccount(user.hotelId, true)}
                                      disabled={actionLoading === user.hotelId}
                                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-[11px] font-bold border border-emerald-200/40 dark:border-emerald-900/40 transition-colors cursor-pointer"
                                      title="Unblock customer account"
                                    >
                                      <Unlock className="w-3 h-3" />
                                      <span>Unblock Account</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setDeleteConfirmUser(user)}
                                    disabled={actionLoading === user.uid}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                                    title="Delete manager profile from system"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* Activation Keys Management View */
          <div>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <span>Activation Keys Registry & Licensing</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">List of generated product activation keys, durations, and consumption details.</p>
              </div>

              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Key</span>
              </button>
            </div>

            {activationKeys.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <KeyRound className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold">No activation keys generated yet.</p>
                <p className="text-xs text-slate-400/80 mt-1">Click "Generate Key" above to create activation keys for new customers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                      <th className="py-4 px-6">Key Identifier</th>
                      <th className="py-4 px-6">License Duration</th>
                      <th className="py-4 px-6">Created On</th>
                      <th className="py-4 px-6">Status & Customer</th>
                      <th className="py-4 px-6">Expiry Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                    {activationKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-4 px-6">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs select-all">
                            {k.keyPrefix}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold uppercase">
                            {k.duration.replace('_', ' ')} ({k.durationDays} days)
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {k.createdAt ? k.createdAt.split('T')[0] : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          {k.status === 'used' ? (
                            <div>
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold uppercase inline-block mb-0.5">
                                Used / Activated
                              </span>
                              <p className="font-medium text-slate-800 dark:text-slate-200">{k.hotelName || k.usedByEmail}</p>
                            </div>
                          ) : k.status === 'revoked' ? (
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold uppercase">
                              Revoked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold uppercase">
                              Active / Available
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-600 dark:text-slate-400">
                          {k.expiresAt ? k.expiresAt.split('T')[0] : k.duration === 'lifetime' ? 'Lifetime' : 'Pending Activation'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {k.status === 'active' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => {
                                  const text = `Activation Key: ${k.keyPrefix}\nDuration: ${k.duration.replace('_', ' ')}\n\nInstructions for Client Activation:\n1. Open the Hotel Management System login page.\n2. Click "Activate License Key".\n3. Enter your Activation Key, Hotel Name, User ID (Email), and Password.\n4. Click "Activate Customer Account" to complete registration & log in.`;
                                  navigator.clipboard.writeText(text);
                                  showFeedback('success', 'Activation Key & client instructions copied!');
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg text-[11px] font-bold border border-indigo-200/40 transition-colors cursor-pointer flex items-center space-x-1"
                                title="Copy activation key & setup instructions"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Key</span>
                              </button>
                              <button
                                onClick={() => handleRevokeKey(k.id)}
                                disabled={actionLoading === k.id}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-[11px] font-bold border border-rose-200/40 transition-colors cursor-pointer"
                              >
                                Revoke Key
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Add Client / Hotel Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between relative">
              <div>
                <h3 className="font-sans font-bold text-lg tracking-tight">Register New Client Hotel</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Issue an activation key for client self-registration or set up directly.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                  setFormSuccess(null);
                  setGeneratedPlainKey(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-1.5">
              <button
                type="button"
                onClick={() => { setAddClientMode('key'); setFormError(null); setFormSuccess(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  addClientMode === 'key'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Issue Key (Self-Registration)</span>
              </button>
              <button
                type="button"
                onClick={() => { setAddClientMode('direct'); setFormError(null); setFormSuccess(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  addClientMode === 'direct'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>2. Direct Admin Creation</span>
              </button>
            </div>

            {addClientMode === 'key' ? (
              /* Key Generation Form for Client Self Registration */
              <div className="p-6 space-y-4">
                {generatedPlainKey ? (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider block">
                        Client Activation Key Issued Successfully
                      </span>
                      <div className="font-mono font-black text-xl text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 select-all tracking-wider">
                        {generatedPlainKey}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        License Plan: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{selectedDuration.replace('_', ' ')}</span>
                      </p>
                    </div>

                    {/* How Client Registers Guide */}
                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-left space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Client Registration Instructions</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                        <li>Send this Activation Key to your client.</li>
                        <li>Client opens app login screen & clicks <strong>"Activate License Key"</strong>.</li>
                        <li>Client enters key, creates their own <strong>User ID (Email) & Password</strong>.</li>
                        <li>Client logs in permanently with their created credentials.</li>
                      </ol>
                    </div>

                    <button
                      onClick={() => {
                        const fullGuide = `Activation Key: ${generatedPlainKey}\nDuration: ${selectedDuration.replace('_', ' ')}\n\nClient Activation Steps:\n1. Open the Hotel Management System login page.\n2. Click "Activate License Key".\n3. Enter this Activation Key (${generatedPlainKey}), your Hotel Name, desired User ID (Email), and Password.\n4. Click "Activate Customer Account" to log in permanently.`;
                        navigator.clipboard.writeText(fullGuide);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Key & Setup Guide Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Key & Share Guide with Client</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setGeneratedPlainKey(null)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer block mx-auto"
                    >
                      Issue Key for Another Client
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                      Generate an activation key for your client. The client will use this key on the login screen to set up their User ID and password.
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Select License Duration
                      </label>
                      <select
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value as LicenseDuration)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1_month">1 Month (30 Days)</option>
                        <option value="3_months">3 Months (90 Days)</option>
                        <option value="6_months">6 Months (180 Days)</option>
                        <option value="1_year">1 Year (365 Days)</option>
                        <option value="lifetime">Lifetime License (Permanent)</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={generatingKey}
                        onClick={handleGenerateKey}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-75"
                      >
                        {generatingKey ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating Key...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Generate Activation Key</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Direct Manual Account Setup Form */
              <form onSubmit={handleAddClient} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start space-x-2 text-emerald-700 dark:text-emerald-400 text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="space-y-4">
                  {/* Manager Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Manager Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rajesh Kumar"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Login ID / Email */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Login ID (Email Address) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. customer@cloud-hotel-erp.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Login Password */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Login Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Enter minimum 6 characters"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Hotel Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Hotel / Resort Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Royal Palace Resort"
                        value={formHotelName}
                        onChange={(e) => setFormHotelName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Country Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 appearance-none"
                        >
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="UAE">UAE</option>
                          <option value="Saudi Arabia">Saudi Arabia</option>
                          <option value="Canada">Canada</option>
                          <option value="Australia">Australia</option>
                          <option value="France">France</option>
                        </select>
                      </div>
                    </div>

                    {/* Initial Account Status */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Account Status
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={formApproved ? 'true' : 'false'}
                          onChange={(e) => setFormApproved(e.target.value === 'true')}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 appearance-none"
                        >
                          <option value="true">Approved / Active</option>
                          <option value="false">Pending Approval</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Hotel Address */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Hotel Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <textarea
                        rows={2}
                        placeholder="e.g. Main Street, Sector 5, New Delhi"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormError(null);
                      setFormSuccess(null);
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {formSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Register Hotel</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-red-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-lg tracking-tight flex items-center space-x-2">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Client Profile?</span>
                </h3>
                <p className="text-red-200 text-[11px] mt-0.5">Confirm permanent deletion of client account</p>
              </div>
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="p-1.5 rounded-lg text-red-200 hover:bg-red-700 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-red-800 dark:text-red-300 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[13px] text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Warning</span>
                </p>
                <p>
                  Are you sure you want to permanently delete this hotel manager profile? This action is immediate and cannot be undone.
                </p>
              </div>

              {/* Target Profile Details Card */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-medium">Manager Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deleteConfirmUser.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-medium">Login Email:</span>
                  <span className="font-mono font-bold select-all text-slate-800 dark:text-slate-200">{deleteConfirmUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Hotel / Resort:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{getHotelName(deleteConfirmUser)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === deleteConfirmUser.uid}
                  onClick={() => handleDeleteUser(deleteConfirmUser.uid)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {actionLoading === deleteConfirmUser.uid ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Client</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Activation Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-lg tracking-tight flex items-center space-x-2">
                  <KeyRound className="w-5 h-5" />
                  <span>Generate Activation Key</span>
                </h3>
                <p className="text-emerald-100 text-[11px] mt-0.5">Select license duration to mint a single-use key</p>
              </div>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGeneratedPlainKey(null);
                }}
                className="p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-700 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {generatedPlainKey ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
                      Generated License Key (Share with Customer)
                    </span>
                    <div className="font-mono font-black text-lg text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 select-all tracking-wider">
                      {generatedPlainKey}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Duration: <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedDuration.replace('_', ' ')}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPlainKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Activation Key</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedPlainKey(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                  >
                    Generate Another Key
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Select License Duration
                    </label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value as LicenseDuration)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="1_month">1 Month (30 Days)</option>
                      <option value="3_months">3 Months (90 Days)</option>
                      <option value="6_months">6 Months (180 Days)</option>
                      <option value="1_year">1 Year (365 Days)</option>
                      <option value="lifetime">Lifetime License (Permanent)</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={generatingKey}
                      onClick={handleGenerateKey}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-75"
                    >
                      {generatingKey ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Minting Key...</span>
                        </>
                      ) : (
                        <span>Generate Key</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
