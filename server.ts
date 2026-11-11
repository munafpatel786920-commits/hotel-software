import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  let projectId = 'inspired-stratum-652jj';
  let databaseId = '(default)';
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    projectId = parsed.projectId || projectId;
    if (parsed.firestoreDatabaseId) {
      databaseId = parsed.firestoreDatabaseId;
    }
  }

  const adminApp = !getApps().length ? initializeApp({ projectId }) : getApps()[0];

  adminDb = getFirestore(adminApp, databaseId);
  adminAuth = getAuth(adminApp);
  console.log(`[Firebase Admin] Initialized for project: ${projectId}, databaseId: ${databaseId}`);
} catch (err) {
  console.error('[Firebase Admin] Initialization warning:', err);
}

const app = express();
app.use(express.json());

// Utility: Hash activation key using SHA-256
function hashKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey.trim().toUpperCase()).digest('hex');
}

// Utility: Generate random formatted key: e.g. HMS-3M-A8F2-99B1-4F0C
function generatePlainKey(durationCode: string): string {
  const segment1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const segment2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const segment3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HMS-${durationCode}-${segment1}-${segment2}-${segment3}`;
}

// Map duration enum to duration code and days
function getDurationDetails(duration: string): { code: string; days: number } {
  switch (duration) {
    case '1_month':
      return { code: '1M', days: 30 };
    case '3_months':
      return { code: '3M', days: 90 };
    case '6_months':
      return { code: '6M', days: 180 };
    case '1_year':
      return { code: '1Y', days: 365 };
    case 'lifetime':
      return { code: 'LIFE', days: 36500 };
    default:
      return { code: '1M', days: 30 };
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Generate Activation Key (Super Admin)
app.post('/api/keys/generate', async (req, res) => {
  try {
    const { duration = '3_months' } = req.body;
    const { code, days } = getDurationDetails(duration);
    
    const plainKey = generatePlainKey(code);
    const keyHash = hashKey(plainKey);
    const keyPrefix = `${plainKey.slice(0, 11)}...${plainKey.slice(-4)}`;
    const keyId = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const now = new Date().toISOString();
    const keyRecord = {
      id: keyId,
      keyPrefix,
      keyHash,
      duration,
      durationDays: days,
      status: 'active',
      createdAt: now
    };

    if (adminDb) {
      await adminDb.collection('activationKeys').doc(keyId).set(keyRecord);
    }

    res.json({
      success: true,
      plainKey,
      keyRecord
    });
  } catch (err: any) {
    console.error('[API /api/keys/generate Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate activation key' });
  }
});

// 2. List All Activation Keys (Super Admin)
app.get('/api/keys/list', async (req, res) => {
  try {
    if (!adminDb) {
      return res.json({ success: true, keys: [] });
    }
    const snap = await adminDb.collection('activationKeys').orderBy('createdAt', 'desc').get();
    const keys: any[] = [];
    snap.forEach((doc) => keys.push(doc.data()));
    res.json({ success: true, keys });
  } catch (err: any) {
    console.error('[API /api/keys/list Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to list keys' });
  }
});

// 3. Revoke Activation Key (Super Admin)
app.post('/api/keys/revoke', async (req, res) => {
  try {
    const { keyId } = req.body;
    if (!keyId) return res.status(400).json({ success: false, error: 'Key ID is required' });

    if (adminDb) {
      await adminDb.collection('activationKeys').doc(keyId).update({
        status: 'revoked',
        revokedAt: new Date().toISOString()
      });
    }
    res.json({ success: true, message: 'Key revoked successfully' });
  } catch (err: any) {
    console.error('[API /api/keys/revoke Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to revoke key' });
  }
});

// 4. Activate Customer Account (Public Activation Page)
app.post('/api/activate', async (req, res) => {
  try {
    const { activationKey, hotelName, country = 'India', email, password } = req.body;

    if (!activationKey || !hotelName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please fill in all required activation fields.' });
    }

    const cleanKey = activationKey.trim().toUpperCase();
    const targetHash = hashKey(cleanKey);

    if (!adminDb || !adminAuth) {
      return res.status(500).json({ success: false, error: 'Server database service unavailable.' });
    }

    // 1. Search for matching activation key
    const keysSnap = await adminDb.collection('activationKeys').where('keyHash', '==', targetHash).get();

    if (keysSnap.empty) {
      return res.status(400).json({ success: false, error: 'Invalid Activation Key. Please double check the key provided by Super Admin.' });
    }

    const keyDoc = keysSnap.docs[0];
    const keyData = keyDoc.data();

    if (keyData.status === 'used') {
      return res.status(400).json({ success: false, error: 'This Activation Key has already been used by another customer account.' });
    }
    if (keyData.status === 'revoked') {
      return res.status(400).json({ success: false, error: 'This Activation Key has been revoked by Super Admin.' });
    }

    // Calculate dates
    const now = new Date();
    const nowIso = now.toISOString();
    let expiresAtIso: string | null = null;
    if (keyData.duration !== 'lifetime') {
      const expiryDate = new Date(now.getTime() + (keyData.durationDays || 30) * 24 * 60 * 60 * 1000);
      expiresAtIso = expiryDate.toISOString();
    }

    const tenantId = 'hotel_' + Date.now();
    const emailLower = email.trim().toLowerCase();

    // 2. Create User in Firebase Auth
    let fbUser;
    try {
      fbUser = await adminAuth.createUser({
        email: emailLower,
        password,
        displayName: hotelName.trim()
      });
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ success: false, error: 'This email ID is already registered. Please sign in or use a different email.' });
      }
      throw authErr;
    }

    // 3. Atomically consume key & write Hotel, User, and default Rooms documents
    const batch = adminDb.batch();

    // Update Key doc
    batch.update(keyDoc.ref, {
      status: 'used',
      activatedAt: nowIso,
      expiresAt: expiresAtIso,
      usedByTenantId: tenantId,
      usedByEmail: emailLower,
      hotelName: hotelName.trim()
    });

    // Create Hotel doc
    const isIndia = country === 'India';
    const newHotel = {
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
      licenseKey: keyData.keyPrefix,
      licenseDuration: keyData.duration,
      activationDate: nowIso,
      licenseExpiresAt: expiresAtIso,
      licenseStatus: 'active'
    };
    batch.set(adminDb.collection('hotels').doc(tenantId), newHotel);

    // Create User Profile doc
    const newProfile = {
      uid: fbUser.uid,
      name: fbUser.displayName || emailLower.split('@')[0],
      email: emailLower,
      role: 'Hotel Admin',
      hotelId: tenantId,
      tenantId,
      isApproved: true,
      hotelName: hotelName.trim(),
      licenseStatus: 'active',
      licenseExpiresAt: expiresAtIso
    };
    batch.set(adminDb.collection('users').doc(fbUser.uid), newProfile);

    // Seed default room category and room
    const typeId = 'type_' + Date.now();
    batch.set(adminDb.collection('roomTypes').doc(typeId), {
      id: typeId,
      name: 'Deluxe Suite',
      basePrice: isIndia ? 2500 : 150,
      capacity: 2,
      amenities: ['Free WiFi', 'Mini Bar', 'TV'],
      hotelId: tenantId
    });

    const roomId = 'room_' + Date.now();
    batch.set(adminDb.collection('rooms').doc(roomId), {
      id: roomId,
      roomNumber: '101',
      floor: '1',
      roomTypeId: typeId,
      status: 'Available',
      hotelId: tenantId
    });

    await batch.commit();

    res.json({
      success: true,
      message: 'Account activated successfully! You can now log in.',
      tenantId,
      uid: fbUser.uid
    });

  } catch (err: any) {
    console.error('[API /api/activate Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Activation failed.' });
  }
});

// 5. Update Customer License Status / Block / Extend (Super Admin)
app.post('/api/license/update-status', async (req, res) => {
  try {
    const { tenantId, action, extraDays = 30 } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID required' });

    if (!adminDb) return res.status(500).json({ success: false, error: 'Database unavailable' });

    const hotelRef = adminDb.collection('hotels').doc(tenantId);
    const hotelSnap = await hotelRef.get();
    if (!hotelSnap.exists) {
      return res.status(404).json({ success: false, error: 'Hotel account not found' });
    }

    const hotelData = hotelSnap.data();

    if (action === 'block' || action === 'unblock') {
      const newStatus = action === 'block' ? 'blocked' : 'active';
      await hotelRef.update({ licenseStatus: newStatus });

      // Also update all users belonging to this hotel
      const usersSnap = await adminDb.collection('users').where('hotelId', '==', tenantId).get();
      const batch = adminDb.batch();
      usersSnap.forEach((uDoc) => {
        batch.update(uDoc.ref, {
          isApproved: action === 'unblock',
          licenseStatus: newStatus
        });
      });
      await batch.commit();

      return res.json({ success: true, message: `Account ${action}ed successfully.` });
    }

    if (action === 'extend') {
      const currentExpiry = hotelData?.licenseExpiresAt ? new Date(hotelData.licenseExpiresAt) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + extraDays * 24 * 60 * 60 * 1000).toISOString();

      await hotelRef.update({
        licenseExpiresAt: newExpiry,
        licenseStatus: 'active'
      });

      const usersSnap = await adminDb.collection('users').where('hotelId', '==', tenantId).get();
      const batch = adminDb.batch();
      usersSnap.forEach((uDoc) => {
        batch.update(uDoc.ref, {
          isApproved: true,
          licenseStatus: 'active',
          licenseExpiresAt: newExpiry
        });
      });
      await batch.commit();

      return res.json({ success: true, message: `License extended by ${extraDays} days until ${newExpiry.split('T')[0]}.` });
    }

    res.status(400).json({ success: false, error: 'Invalid action specified' });

  } catch (err: any) {
    console.error('[API /api/license/update-status Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update license' });
  }
});

// Vite Middleware for Development Server
async function setupViteDev() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupViteDev().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Express Backend] HMS Server running on port ${PORT}`);
  });
});
