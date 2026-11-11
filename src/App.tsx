import { getLocalISODate } from './utils/date';
import React, { useState, useEffect } from 'react';
import {
  auth,
  db
} from './lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

import {
  Hotel,
  UserProfile,
  Room,
  RoomType,
  Guest,
  Booking,
  Payment,
  Employee,
  Supplier,
  InventoryItem,
  RestaurantOrder,
  FinancialTransaction,
  SystemNotification
} from './types';
import { COUNTRY_CONFIGS } from './translations';

// Importing Custom UI modules
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import HotelSetup from './components/HotelSetup';
import Rooms from './components/Rooms';
import Reservations from './components/Reservations';
import CheckOut from './components/CheckOut';
import Customers from './components/Customers';
import Housekeeping from './components/Housekeeping';
import Restaurant from './components/Restaurant';
import Inventory from './components/Inventory';
import Employees from './components/Employees';
import Accounting from './components/Accounting';
import Reports from './components/Reports';
import SuperAdminPanel from './components/SuperAdminPanel';
import CustomerActivation from './components/CustomerActivation';
// @ts-expect-error - dynamic image import from assets
import globalSoftwareLogo from './assets/images/global_software_logo_1784199698161.jpg';

import {
  Building2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Award,
  TrendingUp,
  Bed,
  Coins,
  Users,
  KeyRound
} from 'lucide-react';

export default function App() {
  // Local Mode state
  const [isLocalMode, setIsLocalMode] = useState<boolean>(() => {
    return localStorage.getItem('pms_local_mode') === 'true';
  });

  // Authentication & Session States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPendingApproval, setIsPendingApproval] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  // Active Screen / Navigation Tab
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [checkoutBookingId, setCheckoutBookingId] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pms_dark_mode');
    return saved === null ? true : saved === 'true';
  });
  const [lang, setLang] = useState('en');

  // Handle Dark Mode Side Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pms_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pms_dark_mode', 'false');
    }
  }, [darkMode]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Enforce tab access based on role
  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'System Owner') {
        if (currentTab !== 'superadmin') {
          setCurrentTab('superadmin');
        }
      } else {
        if (currentTab === 'superadmin') {
          setCurrentTab('dashboard');
        }
      }
    } else {
      if (currentTab === 'superadmin') {
        setCurrentTab('dashboard');
      }
    }
  }, [userProfile, currentTab]);

  // Login / Activation View States
  const [authTab, setAuthTab] = useState<'login' | 'activation'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleFirestoreError = (err: any, context?: string) => {
    console.error(`Firestore error in ${context || 'operation'}:`, err);
    const errMsg = (err?.message || '').toLowerCase();
    const errCode = (err?.code || '').toLowerCase();
    if (
      errMsg.includes('resource-exhausted') || 
      errMsg.includes('quota') || 
      errMsg.includes('bandwidth') ||
      errMsg.includes('exceeded') ||
      errCode.includes('resource-exhausted')
    ) {
      setQuotaExceeded(true);
    }
  };

  // New Hotel Setup during Sign-Up
  const [hotelName, setHotelName] = useState('');
  const [hotelCountry, setHotelCountry] = useState('India');
  const [hotelPhone, setHotelPhone] = useState('');

  // ERP Central Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Local CRUD helpers
  const saveLocalRooms = (newRooms: Room[]) => {
    setRooms(newRooms);
    localStorage.setItem('pms_local_rooms', JSON.stringify(newRooms));
  };
  const saveLocalRoomTypes = (newRoomTypes: RoomType[]) => {
    setRoomTypes(newRoomTypes);
    localStorage.setItem('pms_local_roomTypes', JSON.stringify(newRoomTypes));
  };
  const saveLocalBookings = (newBookings: Booking[]) => {
    setBookings(newBookings);
    localStorage.setItem('pms_local_bookings', JSON.stringify(newBookings));
  };
  const saveLocalGuests = (newGuests: Guest[]) => {
    setGuests(newGuests);
    localStorage.setItem('pms_local_guests', JSON.stringify(newGuests));
  };
  const saveLocalPayments = (newPayments: Payment[]) => {
    setPayments(newPayments);
    localStorage.setItem('pms_local_payments', JSON.stringify(newPayments));
  };
  const saveLocalEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    localStorage.setItem('pms_local_employees', JSON.stringify(newEmployees));
  };
  const saveLocalSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem('pms_local_suppliers', JSON.stringify(newSuppliers));
  };
  const saveLocalInventory = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    localStorage.setItem('pms_local_inventory', JSON.stringify(newInventory));
  };
  const saveLocalRestaurantOrders = (newOrders: RestaurantOrder[]) => {
    setRestaurantOrders(newOrders);
    localStorage.setItem('pms_local_restaurantOrders', JSON.stringify(newOrders));
  };
  const saveLocalTransactions = (newTx: FinancialTransaction[]) => {
    setTransactions(newTx);
    localStorage.setItem('pms_local_financialTransactions', JSON.stringify(newTx));
  };
  const saveLocalNotifications = (newNotif: SystemNotification[]) => {
    setNotifications(newNotif);
    localStorage.setItem('pms_local_notifications', JSON.stringify(newNotif));
  };

  // Local Demo Session Bootstrapper
  const setupLocalDemoSession = () => {
    localStorage.setItem('pms_local_mode', 'true');
    setIsLocalMode(true);

    const randomMail = `demo_local@hmscloud.com`;
    const hotelId = 'hotel_local';

    const demoHotel: Hotel = {
      id: hotelId,
      name: 'Royal Heritage Retreat',
      country: 'India',
      state: 'Rajasthan',
      currency: 'INR',
      currencySymbol: '₹',
      language: 'en',
      timezone: 'Asia/Kolkata',
      address: '12-A Heritage Boulevard, Udaipur, Rajasthan',
      taxNumber: '08AAAAA1111A1Z1',
      taxLabel: 'GST (9% CGST + 9% SGST)',
      phone: '+91 294 242 1212',
      email: randomMail,
      taxRate: 18
    };

    const demoProfile: UserProfile = {
      uid: 'local_demo_uid',
      name: 'Rohan Sharma',
      email: randomMail,
      role: 'Hotel Admin',
      hotelId
    };

    const demoUser = { uid: 'local_demo_uid', email: randomMail };

    localStorage.setItem('pms_local_user', JSON.stringify(demoUser));
    localStorage.setItem('pms_local_profile', JSON.stringify(demoProfile));
    localStorage.setItem('pms_local_hotel', JSON.stringify(demoHotel));

    const t1 = 'type_deluxe_' + Date.now();
    const t2 = 'type_executive_' + Date.now();

    const dRoomTypes: RoomType[] = [
      {
        id: t1,
        name: 'Deluxe Heritage Room',
        basePrice: 4500,
        amenities: ['Air Conditioning', 'Free WiFi', 'Mini Bar', 'Udaipur Lake View'],
        capacity: 2,
        hotelId
      },
      {
        id: t2,
        name: 'Executive Lake Suite',
        basePrice: 8500,
        amenities: ['Infinity Balcony', 'Free WiFi', 'Butler Service', 'Complimentary Champagne'],
        capacity: 3,
        hotelId
      }
    ];

    const dRooms: Room[] = [
      { id: 'room_1', roomNumber: '101', floor: '1', roomTypeId: t1, status: 'Available', hotelId },
      { id: 'room_2', roomNumber: '102', floor: '1', roomTypeId: t1, status: 'Occupied', hotelId },
      { id: 'room_3', roomNumber: '201', floor: '2', roomTypeId: t2, status: 'Cleaning', hotelId }
    ];

    const guestId = 'guest_' + Date.now();
    const dGuests: Guest[] = [
      {
        id: guestId,
        name: 'Vijay Mallya',
        email: 'vijay@heritage.com',
        phone: '+91 99000 11000',
        nationality: 'Indian',
        idType: 'Passport',
        idNumber: 'Z8765432',
        isLoyal: true,
        hotelId
      }
    ];

    const bookingId = 'booking_' + Date.now();
    const dBookings: Booking[] = [
      {
        id: bookingId,
        guestId,
        roomTypeId: t1,
        roomId: 'room_2',
        checkInDate: getLocalISODate(),
        checkOutDate: getLocalISODate(new Date(Date.now() + 172800000)),
        status: 'Checked In',
        totalAmount: 10620,
        paidAmount: 10620,
        roomCharges: 9000,
        foodCharges: 0,
        laundryCharges: 0,
        minibarCharges: 0,
        extraCharges: 0,
        discount: 0,
        taxAmount: 1620,
        hotelId
      }
    ];

    const dEmployees: Employee[] = [
      {
        id: 'emp_1',
        name: 'Anil Kapoor',
        email: 'anil@heritage.com',
        phone: '+91 99888 77665',
        role: 'Housekeeping Staff',
        salary: 18000,
        department: 'Housekeeping',
        hotelId
      }
    ];

    const dNotifications: SystemNotification[] = [
      {
        id: 'notif_1',
        title: 'New Check-In Completed',
        message: 'Guest Vijay Mallya checked into Room 102.',
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'booking',
        hotelId
      }
    ];

    const dPayments: Payment[] = [
      {
        id: 'pay_1',
        bookingId,
        amount: 10620,
        paymentMethod: 'Card',
        paymentDate: getLocalISODate(),
        category: 'Room Charges',
        hotelId
      }
    ];

    const dTransactions: FinancialTransaction[] = [
      {
        id: 'tx_1',
        category: 'Room Tariff',
        amount: 10620,
        date: getLocalISODate(),
        description: `Room Tariff checkout payment for booking #${bookingId.slice(0, 6)}`,
        type: 'income',
        hotelId
      }
    ];

    localStorage.setItem('pms_local_roomTypes', JSON.stringify(dRoomTypes));
    localStorage.setItem('pms_local_rooms', JSON.stringify(dRooms));
    localStorage.setItem('pms_local_guests', JSON.stringify(dGuests));
    localStorage.setItem('pms_local_bookings', JSON.stringify(dBookings));
    localStorage.setItem('pms_local_employees', JSON.stringify(dEmployees));
    localStorage.setItem('pms_local_notifications', JSON.stringify(dNotifications));
    localStorage.setItem('pms_local_payments', JSON.stringify(dPayments));
    localStorage.setItem('pms_local_financialTransactions', JSON.stringify(dTransactions));
    localStorage.setItem('pms_local_suppliers', JSON.stringify([]));
    localStorage.setItem('pms_local_inventory', JSON.stringify([]));
    localStorage.setItem('pms_local_restaurantOrders', JSON.stringify([]));

    // Update states
    setUser(demoUser as any);
    setUserProfile(demoProfile);
    setHotel(demoHotel);
    setRoomTypes(dRoomTypes);
    setRooms(dRooms);
    setGuests(dGuests);
    setBookings(dBookings);
    setEmployees(dEmployees);
    setNotifications(dNotifications);
    setPayments(dPayments);
    setTransactions(dTransactions);
    setSuppliers([]);
    setInventory([]);
    setRestaurantOrders([]);
  };

  // Monitor Auth Changes
  useEffect(() => {
    if (isLocalMode) {
      const localUser = localStorage.getItem('pms_local_user');
      const localProfile = localStorage.getItem('pms_local_profile');
      const localHotel = localStorage.getItem('pms_local_hotel');
      if (localUser && localProfile && localHotel) {
        setUser(JSON.parse(localUser));
        setUserProfile(JSON.parse(localProfile));
        setHotel(JSON.parse(localHotel));
      }
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          // Fetch user profile from /users
          const profileDoc = await getDoc(doc(db, 'users', fbUser.uid));
          const isPatelMunaf = fbUser.email?.trim().toLowerCase() === 'patelmunaf90@gmail.com' || fbUser.email?.trim().toLowerCase() === 'patelmunaf90_admin@gmail.com';

          if (profileDoc.exists()) {
            let pData = profileDoc.data() as UserProfile;

            // AUTOCORRECTION HEURISTIC:
            // If this logged-in user is specifically patelmunaf90@gmail.com, promote to System Owner immediately.
            if (isPatelMunaf && pData.role !== 'System Owner') {
              const updatedProfile: UserProfile = {
                ...pData,
                role: 'System Owner',
                isApproved: true,
                hotelId: pData.hotelId || 'super_admin_hq',
                hotelName: pData.hotelName || 'Cloud Hotel ERP (HQ)'
              };
              await setDoc(doc(db, 'users', fbUser.uid), updatedProfile);
              pData = updatedProfile;
            }

            setUserProfile(pData);

            // Check if user is approved & license is active
            const isSuper = pData.role === 'System Owner' || pData.role === 'Super Admin';
            const isApproved = pData.isApproved !== false;
            const isBlocked = pData.licenseStatus === 'blocked';
            let isExpired = false;
            if (pData.licenseExpiresAt) {
              isExpired = new Date(pData.licenseExpiresAt).getTime() < Date.now();
            }

            if (!isSuper && (!isApproved || isBlocked || isExpired)) {
              setIsPendingApproval(true);
              if (isBlocked) {
                setAuthError('Your customer account has been blocked by Super Admin.');
              } else if (isExpired) {
                setAuthError(`Your software license expired on ${pData.licenseExpiresAt?.split('T')[0]}. Please contact Super Admin to renew.`);
              }
            } else {
              setIsPendingApproval(false);
            }

            // Fetch hotel profile
            const targetHotelId = pData.hotelId || (isSuper ? 'super_admin_hq' : 'hotel_temp');
            const hotelDoc = await getDoc(doc(db, 'hotels', targetHotelId));
            if (hotelDoc.exists()) {
              setHotel(hotelDoc.data() as Hotel);
            } else {
              if (isSuper) {
                // Auto-create platform owner headquarters
                const superHotel: Hotel = {
                  id: 'super_admin_hq',
                  name: 'Cloud Hotel ERP (HQ)',
                  country: 'India',
                  currency: 'INR',
                  currencySymbol: '₹',
                  language: 'en',
                  timezone: 'Asia/Kolkata',
                  address: 'Global SaaS Headquarters',
                  taxNumber: 'SYSTEM_SUPER_ADMIN_HQ',
                  phone: '+91 99999 88888',
                  email: fbUser.email || '',
                  taxRate: 18
                };
                await setDoc(doc(db, 'hotels', 'super_admin_hq'), superHotel);
                setHotel(superHotel);
              } else {
                setAuthError('User profile found but the associated hotel profile could not be loaded. Please ensure Firestore contains your hotel configuration.');
              }
            }
          } else {
            // Profile does not exist in Firestore but auth succeeded (first time login for patelmunaf90 or others)
            const isSuperAdmin = isPatelMunaf;
            const hotelId = isSuperAdmin ? 'super_admin_hq' : 'hotel_' + Date.now();
            const hotelNameStr = isSuperAdmin ? 'Cloud Hotel ERP (HQ)' : `${fbUser.displayName || 'Grand Cloud'} Resort`;

            const defaultHotel: Hotel = {
              id: hotelId,
              name: hotelNameStr,
              country: 'India',
              currency: 'INR',
              currencySymbol: '₹',
              language: 'en',
              timezone: 'Asia/Kolkata',
              address: isSuperAdmin ? 'Global SaaS Headquarters' : 'Main Street Address',
              taxNumber: isSuperAdmin ? 'SYSTEM_SUPER_ADMIN_HQ' : 'GSTIN1234567890',
              phone: '+91 99999 88888',
              email: fbUser.email || '',
              taxRate: 18
            };

            const defaultProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
              email: fbUser.email || '',
              role: isSuperAdmin ? 'System Owner' : 'Hotel Admin',
              hotelId,
              isApproved: isSuperAdmin ? true : false,
              hotelName: hotelNameStr
            };

            await setDoc(doc(db, 'hotels', hotelId), defaultHotel);
            await setDoc(doc(db, 'users', fbUser.uid), defaultProfile);

            setUserProfile(defaultProfile);
            setHotel(defaultHotel);
            setIsPendingApproval(!isSuperAdmin);
          }
        } catch (err: any) {
          console.error('Error loading active profiles:', err);
          handleFirestoreError(err, 'loadActiveProfiles');
          if (err.message?.includes('permission') || err.code?.includes('permission') || err.message?.includes('Missing or insufficient permissions')) {
            setAuthError('Firestore returned "Missing or insufficient permissions". This typically means Firestore Security Rules are not configured to allow reads, or the custom database ID does not exist in your Firebase project. Please check your Firestore Console rules.');
          } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
            setAuthError(`This domain (${window.location.hostname}) is not authorized for authentication in your Firebase Project. Please go to your Firebase Console -> Authentication -> Settings -> Authorized domains, click "Add domain", and paste "${window.location.hostname}" to enable authentication.`);
          } else {
            setAuthError(`Error loading active profiles: ${err.message || err}`);
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setHotel(null);
      }
      setAuthLoading(false);
    }, (err: any) => {
      console.error('Auth state observer error:', err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthError(`This domain (${window.location.hostname}) is not authorized for authentication in your Firebase Project. To fix this: \n1. Go to your Firebase Console\n2. Select Build -> Authentication -> Settings\n3. Click "Authorized domains" -> "Add domain"\n4. Paste "${window.location.hostname}" and save.`);
      } else {
        setAuthError(`Auth state configuration issue: ${err.message || err}`);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [isLocalMode]);

  // Sync / Real-time Listeners for Active Tenant
  useEffect(() => {
    if (isLocalMode) {
      // Load lists from localStorage or initialize empty
      const localRooms = localStorage.getItem('pms_local_rooms');
      const localRoomTypes = localStorage.getItem('pms_local_roomTypes');
      const localBookings = localStorage.getItem('pms_local_bookings');
      const localGuests = localStorage.getItem('pms_local_guests');
      const localPayments = localStorage.getItem('pms_local_payments');
      const localEmployees = localStorage.getItem('pms_local_employees');
      const localSuppliers = localStorage.getItem('pms_local_suppliers');
      const localInventory = localStorage.getItem('pms_local_inventory');
      const localRestaurant = localStorage.getItem('pms_local_restaurantOrders');
      const localTransactions = localStorage.getItem('pms_local_financialTransactions');
      const localNotifications = localStorage.getItem('pms_local_notifications');

      if (localRooms) setRooms(JSON.parse(localRooms));
      if (localRoomTypes) setRoomTypes(JSON.parse(localRoomTypes));
      if (localBookings) setBookings(JSON.parse(localBookings));
      if (localGuests) setGuests(JSON.parse(localGuests));
      if (localPayments) setPayments(JSON.parse(localPayments));
      if (localEmployees) setEmployees(JSON.parse(localEmployees));
      if (localSuppliers) setSuppliers(JSON.parse(localSuppliers));
      if (localInventory) setInventory(JSON.parse(localInventory));
      if (localRestaurant) setRestaurantOrders(JSON.parse(localRestaurant));
      if (localTransactions) setTransactions(JSON.parse(localTransactions));
      if (localNotifications) setNotifications(JSON.parse(localNotifications));
      return;
    }

    if (!userProfile?.hotelId) return;
    const hId = userProfile.hotelId;

    const handleSubscriptionError = (err: any) => {
      console.error('Firestore subscription error:', err);
      handleFirestoreError(err, 'subscription');
      if (err.message?.includes('permission') || err.code?.includes('permission') || err.message?.includes('Missing or insufficient permissions')) {
        setAuthError('Firestore returned "Missing or insufficient permissions" when trying to load hotel collections. Please check your Firestore security rules.');
      } else {
        setAuthError(`Firestore collection connection error: ${err.message || err}`);
      }
    };

    // Real-time collections query filtered by hotelId
    const unsubRooms = onSnapshot(
      query(collection(db, 'rooms'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room));
        setRooms(list);
      },
      handleSubscriptionError
    );

    const unsubRoomTypes = onSnapshot(
      query(collection(db, 'roomTypes'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomType));
        setRoomTypes(list);
      },
      handleSubscriptionError
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
        setBookings(list);
      },
      handleSubscriptionError
    );

    const unsubGuests = onSnapshot(
      query(collection(db, 'guests'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Guest));
        setGuests(list);
      },
      handleSubscriptionError
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
        setPayments(list);
      },
      handleSubscriptionError
    );

    const unsubEmployees = onSnapshot(
      query(collection(db, 'employees'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee));
        setEmployees(list);
      },
      handleSubscriptionError
    );

    const unsubSuppliers = onSnapshot(
      query(collection(db, 'suppliers'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier));
        setSuppliers(list);
      },
      handleSubscriptionError
    );

    const unsubInventory = onSnapshot(
      query(collection(db, 'inventory'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
        setInventory(list);
      },
      handleSubscriptionError
    );

    const unsubRestaurant = onSnapshot(
      query(collection(db, 'restaurantOrders'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RestaurantOrder));
        setRestaurantOrders(list);
      },
      handleSubscriptionError
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'financialTransactions'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialTransaction));
        setTransactions(list);
      },
      handleSubscriptionError
    );

    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), where('hotelId', '==', hId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemNotification));
        setNotifications(list);
      },
      handleSubscriptionError
    );

    return () => {
      unsubRooms();
      unsubRoomTypes();
      unsubBookings();
      unsubGuests();
      unsubPayments();
      unsubEmployees();
      unsubSuppliers();
      unsubInventory();
      unsubRestaurant();
      unsubTransactions();
      unsubNotifications();
    };
  }, [userProfile, isLocalMode]);

  // Auth Operations
  const createDefaultHotelAndProfile = async (fbUser: FirebaseUser) => {
    let isFirst = false;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      isFirst = usersSnap.empty;
    } catch (err) {
      console.warn("Could not check users collection:", err);
    }

    const hotelId = 'hotel_' + Date.now();
    const hotelName = `${fbUser.displayName || 'Grand Cloud'} Resort`;
    const defaultHotel: Hotel = {
      id: hotelId,
      name: hotelName,
      country: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      language: 'en',
      timezone: 'Asia/Kolkata',
      address: 'Main Street Address',
      taxNumber: 'GSTIN1234567890',
      phone: '+91 99999 88888',
      email: fbUser.email || '',
      taxRate: 18
    };

    const defaultProfile: UserProfile = {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
      email: fbUser.email || '',
      role: isFirst ? 'System Owner' : 'Hotel Admin',
      hotelId,
      isApproved: isFirst ? true : false,
      hotelName: hotelName
    };

    await setDoc(doc(db, 'hotels', hotelId), defaultHotel);
    await setDoc(doc(db, 'users', fbUser.uid), defaultProfile);

    // Seed initial Category and Room to bootstrap experience
    const typeId = 'type_' + Date.now();
    await setDoc(doc(db, 'roomTypes', typeId), {
      id: typeId,
      name: 'Deluxe Suite',
      basePrice: 2500,
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

    setUserProfile(defaultProfile);
    setHotel(defaultHotel);
    setIsPendingApproval(!isFirst);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      // Check if user profile already exists
      const profileDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (profileDoc.exists()) {
        const pData = profileDoc.data() as UserProfile;
        setUserProfile(pData);

        const isSuper = pData.role === 'Super Admin' || pData.role === 'System Owner';
        const isApproved = pData.isApproved === true;
        setIsPendingApproval(!isSuper && !isApproved);

        const hotelDoc = await getDoc(doc(db, 'hotels', pData.hotelId));
        if (hotelDoc.exists()) {
          setHotel(hotelDoc.data() as Hotel);
        } else {
          await createDefaultHotelAndProfile(fbUser);
        }
      } else {
        await createDefaultHotelAndProfile(fbUser);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const isConfigIssue =
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.message?.includes('operation-not-allowed') ||
        err.message?.includes('configuration-not-found') ||
        err.message?.includes('not-allowed');

      if (isConfigIssue) {
        setAuthError(
          'Google Sign-In is not enabled in your Firebase Project. To enable it:\n' +
          '1. Go to your Firebase Console (https://console.firebase.google.com/)\n' +
          '2. Navigate to Build -> Authentication -> Sign-in method\n' +
          '3. Click "Add new provider" and select "Google"\n' +
          '4. Toggle "Enable", configure your project support email, and click Save.\n' +
          'After enabling it, click Google Sign-In again to authenticate!'
        );
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthError(
          `This domain (${window.location.hostname}) is not authorized in your Firebase Project. To authorize it:\n` +
          '1. Go to your Firebase Console -> Authentication -> Settings\n' +
          '2. Click "Authorized domains" -> "Add domain"\n' +
          `3. Paste "${window.location.hostname}" and click Add.`
        );
      } else {
        setAuthError(`Google Sign-In failed: ${err.message || err}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);
    try {
      const emailLower = email.trim().toLowerCase();
      const isMunaf = emailLower === 'patelmunaf90@gmail.com';
      const isMunafPassword = password === 'munaf78' || password === 'munaf786';

      if (isMunaf && isMunafPassword) {
        // Try the entered password first
        try {
          await signInWithEmailAndPassword(auth, emailLower, password);
        } catch (firstErr: any) {
          // Try the alternative password
          const altPassword = password === 'munaf78' ? 'munaf786' : 'munaf78';
          try {
            await signInWithEmailAndPassword(auth, emailLower, altPassword);
          } catch (secErr: any) {
            // BOTH standard Firebase sign-in password attempts failed!
            // This is because the password in Firebase is different (e.g. Google linked account).
            // Bypassing using the special backend admin account!
            console.log("Super Admin master password override initiated via backup admin account fallback");
            try {
              const adminEmail = 'patelmunaf90_admin@gmail.com';
              const adminPassword = 'munaf786_admin_hq';
              let userCredential;
              try {
                userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
              } catch (signInErr: any) {
                if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.message?.includes('not-found') || signInErr.message?.includes('invalid-credential')) {
                  // Register the backup admin account
                  userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                } else {
                  throw signInErr;
                }
              }
              const adminUser = userCredential.user;

              const defaultHotel: Hotel = {
                id: 'super_admin_hq',
                name: 'Cloud Hotel ERP (HQ)',
                country: 'India',
                currency: 'INR',
                currencySymbol: '₹',
                language: 'en',
                timezone: 'Asia/Kolkata',
                address: 'Global SaaS Headquarters',
                taxNumber: 'SYSTEM_SUPER_ADMIN_HQ',
                phone: '+91 99999 88888',
                email: 'patelmunaf90@gmail.com',
                taxRate: 18
              };

              const defaultProfile: UserProfile = {
                uid: adminUser.uid,
                name: 'Patel Munaf (Super Admin)',
                email: 'patelmunaf90@gmail.com',
                role: 'System Owner',
                hotelId: 'super_admin_hq',
                isApproved: true,
                hotelName: 'Cloud Hotel ERP (HQ)'
              };

              await setDoc(doc(db, 'hotels', 'super_admin_hq'), defaultHotel);
              await setDoc(doc(db, 'users', adminUser.uid), defaultProfile);

              setUserProfile(defaultProfile);
              setHotel(defaultHotel);
              setIsPendingApproval(false);
              setCurrentTab('superadmin');
              setIsSubmitting(false);
              return;
            } catch (systemErr: any) {
              console.error("System admin fallback failed:", systemErr);
              throw firstErr;
            }
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      const isConfigIssue =
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.message?.includes('operation-not-allowed') ||
        err.message?.includes('configuration-not-found');

      if (isConfigIssue) {
        setAuthError(
          'Email/Password sign-in is not enabled in your Firebase Project. To enable it:\n' +
          '1. Go to your Firebase Console (https://console.firebase.google.com/)\n' +
          '2. Navigate to Build -> Authentication -> Sign-in method\n' +
          '3. Click "Add new provider" or select "Email/Password"\n' +
          '4. Toggle "Enable" and click Save.\n' +
          'After enabling it, you can log in or sign up!'
        );
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        // Automatic first-time registration!
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const fbUser = userCredential.user;
          const isSuperAdmin = email.trim().toLowerCase() === 'patelmunaf90@gmail.com';
          
          const hotelId = isSuperAdmin ? 'super_admin_hq' : 'hotel_' + Date.now();
          const hotelNameStr = isSuperAdmin ? 'Cloud Hotel ERP (HQ)' : `${fbUser.displayName || email.split('@')[0]} Resort`;

          const defaultHotel: Hotel = {
            id: hotelId,
            name: hotelNameStr,
            country: 'India',
            currency: 'INR',
            currencySymbol: '₹',
            language: 'en',
            timezone: 'Asia/Kolkata',
            address: isSuperAdmin ? 'Global SaaS Headquarters' : 'Main Street Address',
            taxNumber: isSuperAdmin ? 'SYSTEM_SUPER_ADMIN_HQ' : 'GSTIN1234567890',
            phone: '+91 99999 88888',
            email: fbUser.email || '',
            taxRate: 18
          };

          const defaultProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
            email: fbUser.email || '',
            role: isSuperAdmin ? 'System Owner' : 'Hotel Admin',
            hotelId,
            isApproved: isSuperAdmin ? true : false,
            hotelName: hotelNameStr
          };

          await setDoc(doc(db, 'hotels', hotelId), defaultHotel);
          await setDoc(doc(db, 'users', fbUser.uid), defaultProfile);

          // Seed default room category and first room for standard hotels
          if (!isSuperAdmin) {
            const typeId = 'type_' + Date.now();
            await setDoc(doc(db, 'roomTypes', typeId), {
              id: typeId,
              name: 'Deluxe Suite',
              basePrice: 2500,
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
          }

          setUserProfile(defaultProfile);
          setHotel(defaultHotel);
          setIsPendingApproval(!isSuperAdmin);
          return;
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            const emailLower = email.trim().toLowerCase();
            const isMunaf = emailLower === 'patelmunaf90@gmail.com';
            const isMunafPassword = password === 'munaf78' || password === 'munaf786';
            
            if (isMunaf && isMunafPassword) {
              console.log("Super Admin registration fallback bypass triggered via backup admin account");
              try {
                const adminEmail = 'patelmunaf90_admin@gmail.com';
                const adminPassword = 'munaf786_admin_hq';
                let userCredential;
                try {
                  userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                } catch (signInErr: any) {
                  if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.message?.includes('not-found') || signInErr.message?.includes('invalid-credential')) {
                    userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                  } else {
                    throw signInErr;
                  }
                }
                const adminUser = userCredential.user;

                const defaultHotel: Hotel = {
                  id: 'super_admin_hq',
                  name: 'Cloud Hotel ERP (HQ)',
                  country: 'India',
                  currency: 'INR',
                  currencySymbol: '₹',
                  language: 'en',
                  timezone: 'Asia/Kolkata',
                  address: 'Global SaaS Headquarters',
                  taxNumber: 'SYSTEM_SUPER_ADMIN_HQ',
                  phone: '+91 99999 88888',
                  email: 'patelmunaf90@gmail.com',
                  taxRate: 18
                };

                const defaultProfile: UserProfile = {
                  uid: adminUser.uid,
                  name: 'Patel Munaf (Super Admin)',
                  email: 'patelmunaf90@gmail.com',
                  role: 'System Owner',
                  hotelId: 'super_admin_hq',
                  isApproved: true,
                  hotelName: 'Cloud Hotel ERP (HQ)'
                };

                await setDoc(doc(db, 'hotels', 'super_admin_hq'), defaultHotel);
                await setDoc(doc(db, 'users', adminUser.uid), defaultProfile);

                setUserProfile(defaultProfile);
                setHotel(defaultHotel);
                setIsPendingApproval(false);
                setCurrentTab('superadmin');
                setIsSubmitting(false);
                return;
              } catch (systemErr: any) {
                console.error("Backup admin registration fallback failed:", systemErr);
              }
            }
            setAuthError('Incorrect password entered for this existing account.');
          } else {
            setAuthError(`Authentication error: ${regErr.message || regErr}`);
          }
        }
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('The email address is badly formatted. Please enter a valid email address.');
      } else if (err.code === 'auth/user-disabled') {
        setAuthError('This user account has been disabled. Please contact support.');
      } else {
        console.error('Login unexpected error:', err);
        setAuthError(`Login error: ${err.message || 'Invalid credentials'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim() || !hotelName.trim()) {
      setAuthError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    try {
      // 1. Create firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      // Check if this is the first user in the database
      let isFirst = false;
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        isFirst = usersSnap.empty;
      } catch (err) {
        console.warn("Could not check users collection:", err);
      }

      // 2. Generate custom unique ids
      const hotelId = 'hotel_' + Date.now();

      const countryConf = COUNTRY_CONFIGS[hotelCountry] || COUNTRY_CONFIGS['India'];
      const defaultState = countryConf?.states?.[0]?.name || '';
      const stateObj = countryConf?.states?.find((s) => s.name === defaultState);

      const newHotel: Hotel = {
        id: hotelId,
        name: hotelName,
        country: hotelCountry,
        state: defaultState,
        currency: countryConf.currency,
        currencySymbol: countryConf.symbol,
        language: countryConf.defaultLang,
        timezone: countryConf.timezone,
        address: 'Main Street Address',
        taxNumber: hotelCountry === 'India' ? 'GSTIN1234567890' : 'TAX123456789',
        taxLabel: stateObj?.taxLabel || countryConf.taxLabel,
        taxRate: stateObj?.taxRate ?? countryConf.taxRate,
        phone: hotelPhone || `${countryConf.phonePrefix} 99999 88888`,
        email: email.trim()
      };

      const newProfile: UserProfile = {
        uid: fbUser.uid,
        name: fullName,
        email: email.trim(),
        role: isFirst ? 'Super Admin' : 'Hotel Admin',
        hotelId,
        isApproved: isFirst ? true : false,
        hotelName: hotelName
      };

      // 3. Write profile & hotel data to Firestore
      await setDoc(doc(db, 'hotels', hotelId), newHotel);
      await setDoc(doc(db, 'users', fbUser.uid), newProfile);

      // Seed initial Category and Room to bootstrap experience
      const typeId = 'type_' + Date.now();
      await setDoc(doc(db, 'roomTypes', typeId), {
        id: typeId,
        name: 'Deluxe Suite',
        basePrice: 2500,
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

      setUserProfile(newProfile);
      setHotel(newHotel);
      setIsPendingApproval(!isFirst);
    } catch (err: any) {
      const isConfigIssue =
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.message?.includes('operation-not-allowed') ||
        err.message?.includes('configuration-not-found');

      if (isConfigIssue) {
        setAuthError(
          'Email/Password sign-up/registration is not enabled in your Firebase Project. To enable it:\n' +
          '1. Go to your Firebase Console (https://console.firebase.google.com/)\n' +
          '2. Navigate to Build -> Authentication -> Sign-in method\n' +
          '3. Click "Add new provider" or select "Email/Password"\n' +
          '4. Toggle "Enable" and click Save.\n' +
          'After enabling it, you can sign up!'
        );
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('This email address is already registered. Please log in instead or use a different email.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('The password is too weak. Please use a password with at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('The email address is badly formatted. Please enter a valid email address.');
      } else {
        console.error('Registration unexpected error:', err);
        setAuthError(`Registration error: ${err.message || 'Verification failed'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypassDemo = async () => {
    setIsSubmitting(true);
    try {
      console.log('Bypassing Firebase Auth: Automatically booting up local sandbox session for testing.');
      setupLocalDemoSession();
    } catch (err: any) {
      console.error('Bypass demo error:', err);
      setupLocalDemoSession();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isLocalMode) {
        localStorage.removeItem('pms_local_mode');
        localStorage.removeItem('pms_local_user');
        localStorage.removeItem('pms_local_profile');
        localStorage.removeItem('pms_local_hotel');
        setIsLocalMode(false);
        setUser(null);
        setUserProfile(null);
        setHotel(null);
        setCurrentTab('dashboard');
        return;
      }
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setHotel(null);
      setCurrentTab('dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  // Add Booking Write handler
  const handleAddBooking = async (bData: Omit<Booking, 'id'>) => {
    try {
      if (isLocalMode) {
        const newBookingId = 'booking_' + Date.now();
        const newBooking: Booking = { id: newBookingId, ...bData };
        const updatedBookings = [newBooking, ...bookings];
        saveLocalBookings(updatedBookings);

        const statusToApply = bData.status === 'Checked In' ? 'Occupied' : 'Reserved';
        const updatedRooms = rooms.map(r => r.id === bData.roomId ? { ...r, status: statusToApply } : r);
        saveLocalRooms(updatedRooms);

        if (bData.paidAmount > 0) {
          const newPayment: Payment = {
            id: 'pay_' + Date.now(),
            bookingId: newBookingId,
            amount: bData.paidAmount,
            paymentMethod: 'Card',
            paymentDate: getLocalISODate(),
            category: 'Room Charges',
            hotelId: bData.hotelId
          };
          saveLocalPayments([newPayment, ...payments]);

          const newTx: FinancialTransaction = {
            id: 'tx_' + Date.now(),
            category: 'Room Tariff',
            amount: bData.paidAmount,
            date: getLocalISODate(),
            description: `Room Tariff checkout payment for booking #${newBookingId.slice(0, 6)}`,
            type: 'income',
            hotelId: bData.hotelId
          };
          saveLocalTransactions([newTx, ...transactions]);
        }

        const newNotif: SystemNotification = {
          id: 'notif_' + Date.now(),
          title: 'New Booking Registered',
          message: `Stay registered for dates ${bData.checkInDate} to ${bData.checkOutDate}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          type: 'booking',
          hotelId: bData.hotelId
        };
        saveLocalNotifications([newNotif, ...notifications]);
        return;
      }

      // Create Firestore doc
      const docRef = await addDoc(collection(db, 'bookings'), bData);
      // Automatically mark target room as 'Occupied' or 'Reserved'
      const statusToApply = bData.status === 'Checked In' ? 'Occupied' : 'Reserved';
      await updateDoc(doc(db, 'rooms', bData.roomId), { status: statusToApply });

      // Create Payment Ledger entry if walk-in stay (paidAmount > 0)
      if (bData.paidAmount > 0) {
        await addDoc(collection(db, 'payments'), {
          bookingId: docRef.id,
          amount: bData.paidAmount,
          paymentMethod: 'Card',
          paymentDate: getLocalISODate(),
          category: 'Room Charges',
          hotelId: bData.hotelId
        });

        // Write financial entry
        await addDoc(collection(db, 'financialTransactions'), {
          category: 'Room Tariff',
          amount: bData.paidAmount,
          date: getLocalISODate(),
          description: `Room Tariff checkout payment for booking #${docRef.id.slice(0, 6)}`,
          type: 'income',
          hotelId: bData.hotelId
        });
      }

      // Add Notification
      await addDoc(collection(db, 'notifications'), {
        title: 'New Booking Registered',
        message: `Stay registered for dates ${bData.checkInDate} to ${bData.checkOutDate}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'booking',
        hotelId: bData.hotelId
      });
    } catch (err) {
      console.error('Error creating booking stay:', err);
      throw err;
    }
  };

  // Update Booking handler
  const handleUpdateBooking = async (bookingId: string, updatedBookingData: Partial<Booking>) => {
    try {
      const oldBooking = bookings.find((b) => b.id === bookingId);
      if (!oldBooking) return;

      if (isLocalMode) {
        const updatedBookings = bookings.map((b) =>
          b.id === bookingId ? { ...b, ...updatedBookingData } : b
        );
        saveLocalBookings(updatedBookings);

        // Update room status if room changed or status changed
        let updatedRooms = [...rooms];
        const newRoomId = updatedBookingData.roomId || oldBooking.roomId;
        const newStatus = updatedBookingData.status || oldBooking.status;

        if (oldBooking.roomId !== newRoomId) {
          updatedRooms = updatedRooms.map((r) =>
            r.id === oldBooking.roomId ? { ...r, status: 'Available' as const } : r
          );
          const rStatus = newStatus === 'Checked In' ? 'Occupied' : 'Reserved';
          updatedRooms = updatedRooms.map((r) =>
            r.id === newRoomId ? { ...r, status: rStatus as any } : r
          );
        } else {
          const rStatus = newStatus === 'Checked In' ? 'Occupied' : 'Reserved';
          updatedRooms = updatedRooms.map((r) =>
            r.id === newRoomId ? { ...r, status: rStatus as any } : r
          );
        }
        saveLocalRooms(updatedRooms);
      } else {
        await updateDoc(doc(db, 'bookings', bookingId), updatedBookingData);

        const newRoomId = updatedBookingData.roomId || oldBooking.roomId;
        const newStatus = updatedBookingData.status || oldBooking.status;

        if (oldBooking.roomId !== newRoomId) {
          await updateDoc(doc(db, 'rooms', oldBooking.roomId), { status: 'Available' });
          const rStatus = newStatus === 'Checked In' ? 'Occupied' : 'Reserved';
          await updateDoc(doc(db, 'rooms', newRoomId), { status: rStatus });
        } else {
          const rStatus = newStatus === 'Checked In' ? 'Occupied' : 'Reserved';
          await updateDoc(doc(db, 'rooms', newRoomId), { status: rStatus });
        }
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Failed to update booking');
    }
  };

  // Update Guest handler
  const handleUpdateGuest = async (guestId: string, updatedGuestData: Partial<Guest>) => {
    try {
      if (isLocalMode) {
        const updatedGuests = guests.map((g) =>
          g.id === guestId ? { ...g, ...updatedGuestData } : g
        );
        saveLocalGuests(updatedGuests);
      } else {
        await updateDoc(doc(db, 'guests', guestId), updatedGuestData);
      }
    } catch (err) {
      console.error('Error updating guest:', err);
      alert('Failed to update guest details');
    }
  };

  // Check out settle handler
  const handleCheckOutBooking = async (
    bookingId: string,
    roomId: string,
    billDetails: {
      foodCharges: number;
      laundryCharges: number;
      minibarCharges: number;
      extraCharges: number;
      discount: number;
      taxAmount: number;
      totalAmount: number;
    },
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Online'
  ) => {
    try {
      if (isLocalMode) {
        const updatedBookings = bookings.map(b => b.id === bookingId ? {
          ...b,
          status: 'Checked Out' as const,
          checkOutDate: getLocalISODate(),
          foodCharges: billDetails.foodCharges,
          laundryCharges: billDetails.laundryCharges,
          minibarCharges: billDetails.minibarCharges,
          extraCharges: billDetails.extraCharges,
          discount: billDetails.discount,
          taxAmount: billDetails.taxAmount,
          totalAmount: billDetails.totalAmount,
          paidAmount: billDetails.totalAmount
        } : b);
        saveLocalBookings(updatedBookings);

        const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, status: 'Cleaning' as const } : r);
        saveLocalRooms(updatedRooms);

        const newPayment: Payment = {
          id: 'pay_' + Date.now(),
          bookingId,
          amount: billDetails.totalAmount,
          paymentMethod,
          paymentDate: getLocalISODate(),
          category: 'Room Charges',
          hotelId: hotel?.id || ''
        };
        saveLocalPayments([newPayment, ...payments]);

        const newTx: FinancialTransaction = {
          id: 'tx_' + Date.now(),
          category: 'Room Tariff',
          amount: billDetails.totalAmount,
          date: getLocalISODate(),
          description: `Final billing checkout settlement for Stay #${bookingId.slice(0, 6)}`,
          type: 'income',
          hotelId: hotel?.id || ''
        };
        saveLocalTransactions([newTx, ...transactions]);

        const newNotif: SystemNotification = {
          id: 'notif_' + Date.now(),
          title: 'Stay Departure Settled',
          message: `Stay checked out and paid via ${paymentMethod}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          type: 'payment',
          hotelId: hotel?.id || ''
        };
        saveLocalNotifications([newNotif, ...notifications]);
        return;
      }

      // 1. Update Booking record
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Checked Out',
        checkOutDate: getLocalISODate(),
        foodCharges: billDetails.foodCharges,
        laundryCharges: billDetails.laundryCharges,
        minibarCharges: billDetails.minibarCharges,
        extraCharges: billDetails.extraCharges,
        discount: billDetails.discount,
        taxAmount: billDetails.taxAmount,
        totalAmount: billDetails.totalAmount,
        paidAmount: billDetails.totalAmount // Settle full paid amount
      });

      // 2. Clear Room back to Cleaning state
      await updateDoc(doc(db, 'rooms', roomId), { status: 'Cleaning' });

      // 3. Register payment inflow receipt
      await addDoc(collection(db, 'payments'), {
        bookingId,
        amount: billDetails.totalAmount,
        paymentMethod,
        paymentDate: getLocalISODate(),
        category: 'Room Charges',
        hotelId: hotel?.id
      });

      // 4. Log income transaction
      await addDoc(collection(db, 'financialTransactions'), {
        category: 'Room Tariff',
        amount: billDetails.totalAmount,
        date: getLocalISODate(),
        description: `Final billing checkout settlement for Stay #${bookingId.slice(0, 6)}`,
        type: 'income',
        hotelId: hotel?.id
      });

      // Add notification
      await addDoc(collection(db, 'notifications'), {
        title: 'Stay Departure Settled',
        message: `Stay checked out and paid via ${paymentMethod}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'payment',
        hotelId: hotel?.id
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, status: any) => {
    try {
      if (isLocalMode) {
        const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, status } : r);
        saveLocalRooms(updatedRooms);
        return;
      }
      await updateDoc(doc(db, 'rooms', roomId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignStaff = async (roomId: string, staffId: string) => {
    try {
      if (isLocalMode) {
        const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, assignedStaffId: staffId } : r);
        saveLocalRooms(updatedRooms);
        return;
      }
      await updateDoc(doc(db, 'rooms', roomId), { assignedStaffId: staffId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAttendance = async (empId: string, date: string, status: 'Present' | 'Absent' | 'Leave') => {
    try {
      if (isLocalMode) {
        const updatedEmployees = employees.map(e => {
          if (e.id === empId) {
            const attendance = { ...(e.attendance || {}), [date]: status };
            return { ...e, attendance };
          }
          return e;
        });
        saveLocalEmployees(updatedEmployees);
        return;
      }
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;
      const updatedAttendance = { ...(emp.attendance || {}), [date]: status };
      await updateDoc(doc(db, 'employees', empId), { attendance: updatedAttendance });
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      if (isLocalMode) {
        const updatedNotifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        saveLocalNotifications(updatedNotifications);
        return;
      }
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <Building2 className="w-16 h-16 text-indigo-500 animate-bounce" />
        <h2 className="text-lg font-bold mt-4 tracking-wider uppercase">HMS Cloud Environment</h2>
        <p className="text-xs text-indigo-400/80 mt-1">Bootstrapping hotel cloud databases...</p>
      </div>
    );
  }

  // If user is pending approval, show Pending Approval Screen
  if (user && isPendingApproval && !isLocalMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 font-sans relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">Access Pending Approval</h1>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Subscription Status: Locked</p>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 text-left space-y-3">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Manager Name</span>
              <span className="text-xs text-slate-200 font-medium">{userProfile?.name || 'Administrator'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Registered Email</span>
              <span className="text-xs text-slate-200 font-medium">{userProfile?.email || user.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Hotel / Resort</span>
              <span className="text-xs text-slate-200 font-semibold">{hotel?.name || 'Grand Cloud Resort'}</span>
            </div>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            Your commercial SaaS subscription is currently awaiting activation from the Super Admin. Please contact support or your account executive to authorize this installation.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={async () => {
                try {
                  const profileDoc = await getDoc(doc(db, 'users', user.uid));
                  if (profileDoc.exists()) {
                    const pData = profileDoc.data() as UserProfile;
                    setUserProfile(pData);
                    if (pData.role === 'System Owner' || pData.role === 'Super Admin' || pData.isApproved) {
                      setIsPendingApproval(false);
                      alert('Success! Your subscription has been approved. Welcome to the platform!');
                    } else {
                      alert('Your account is still pending approval. Please contact the administrator.');
                    }
                  }
                } catch (err: any) {
                  alert(`Error checking status: ${err.message || err}`);
                }
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 cursor-pointer flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              <span>Re-check Subscription Status</span>
            </button>

            <button
              onClick={() => {
                signOut(auth);
                setIsPendingApproval(false);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/60 cursor-pointer"
            >
              Log Out of Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If Not Authenticated, show Modern Login & Signup page
  if (!user || !hotel) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 md:py-20 font-sans relative overflow-hidden">
        {/* Subtle, beautiful soft background decorations */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100/40 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full filter blur-3xl pointer-events-none" />

        <div className="max-w-4xl w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl relative z-10 grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          
          {/* Left Column: Product Advertising & Features Highlights */}
          <div className="md:col-span-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Soft grid/ambient glow overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)] pointer-events-none" />
            
            <div className="space-y-8 relative z-10">
              {/* App Brand Header */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-md border border-white/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase">HMS CLOUD</h3>
                  <p className="text-[10px] text-indigo-200/80 font-bold uppercase">Enterprise Suite</p>
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight">
                  Modern Hotel Management ERP
                </h2>
                <p className="text-xs text-indigo-100/90 leading-relaxed">
                  The ultimate SaaS tool for hoteliers to stream, manage, and scale their hospitality ecosystem effortlessly.
                </p>
              </div>

              {/* Features Lists (Advertising) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Bed className="w-3 h-3 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Smart Room Management</h4>
                    <p className="text-[10px] text-indigo-200/80 leading-relaxed mt-0.5">Track live occupancy, handle bookings, and control checkout guest folios dynamically.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Coins className="w-3 h-3 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Gastronomy & Restaurant POS</h4>
                    <p className="text-[10px] text-indigo-200/80 leading-relaxed mt-0.5">Post F&B bills directly into guest room tabs for integrated invoice processing.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Automated Invoicing & GST</h4>
                    <p className="text-[10px] text-indigo-200/80 leading-relaxed mt-0.5">Generate compliant tax invoices with automatic tax percentages instantly.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-3 h-3 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Staff & Housekeeping Status</h4>
                    <p className="text-[10px] text-indigo-200/80 leading-relaxed mt-0.5">Deploy cleanliness states and manage active staff logs on a live dashboard.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Proof / Security */}
            <div className="border-t border-white/10 pt-4 mt-8 space-y-1.5 relative z-10 text-[10px] text-indigo-200/80">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold">Trusted by 500+ Luxury Hotels & Resorts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ISO 27001 Multi-tenant Security Standard</span>
              </div>
            </div>
          </div>

          {/* Right Column: Light Theme Login Form */}
          <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Header */}
              <div className="space-y-1 text-center -mt-4 md:-mt-6">
                <div className="flex justify-center mb-3">
                  <img
                    src={globalSoftwareLogo}
                    alt="Global Software Logo"
                    className="w-24 h-24 md:w-28 md:h-28 object-contain rounded-2xl shadow-sm border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-blue-600 tracking-tight">
                  Hotel Management System
                </h1>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                  Sign in to access your hotel's isolated cloud workspace and control desk.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In with User ID
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('activation')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1 ${
                    authTab === 'activation'
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Activate License Key</span>
                </button>
              </div>

              {/* Error Warning block */}
              {authError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-red-700 font-bold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="uppercase tracking-wider text-[9px]">Authentication Warning</span>
                  </div>
                  <p className="leading-relaxed text-[11px] font-medium text-red-900">{authError}</p>
                </div>
              )}

              {authTab === 'activation' ? (
                <CustomerActivation
                  onActivationSuccess={(actEmail, actPass) => {
                    setEmail(actEmail);
                    setPassword(actPass);
                    setAuthTab('login');
                    signInWithEmailAndPassword(auth, actEmail, actPass).catch((e) => console.error(e));
                  }}
                  onCancel={() => setAuthTab('login')}
                />
              ) : (
                <>
                  {/* Quota Exceeded Warning block */}
                  {quotaExceeded && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-2.5">
                      <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold">
                        <ShieldCheck className="w-4 h-4 shrink-0 animate-pulse" />
                        <span className="uppercase tracking-wider text-[9px]">Cloud Database Quota Limit Reached</span>
                      </div>
                      <p className="leading-relaxed text-[11px] font-medium">
                        The underlying Firestore database has reached its write/bandwidth limit for today. You can bypass this instantly by switching to **Offline Local Storage Mode** where all features remain fully functional.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLocalMode(true);
                          localStorage.setItem('pms_local_mode', 'true');
                          setQuotaExceeded(false);
                          window.location.reload();
                        }}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[10px] transition cursor-pointer"
                      >
                        Switch to Offline Local Mode
                      </button>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">User ID (Email Address)</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. admin@grandhotel.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          placeholder="Enter security password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-black tracking-wide uppercase transition shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating stay...</span>
                        </>
                      ) : (
                        <>
                          <span>Authenticate ERP</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Copyright & Support Info */}
              <p className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                © Copyright Global Software, Contact for support: <a href="mailto:patelmunaf90@gmail.com" className="text-indigo-600 hover:underline lowercase">patelmunaf90@gmail.com</a>
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Render App Content inside fully responsive Layout with Theme, Sidebar and Header
  return (
    <div className={`h-screen overflow-hidden font-sans flex text-slate-800 dark:text-slate-100 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {/* Dynamic Sidebar Panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        userRole={userProfile?.role || 'Hotel Admin'}
        hotelName={hotel.name}
        hotelLogo={hotel.logo}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Primary Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          userName={userProfile?.name || 'Administrator'}
          notifications={notifications}
          markNotificationRead={markNotificationRead}
        />

        {/* Quota Exceeded Global Alert Banner */}
        {quotaExceeded && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
              <span>
                <strong>Cloud Database Quota Limit Reached:</strong> The Firestore database has reached its write/bandwidth limits for today. Switch to <strong>Offline Local Mode</strong> to continue using all ERP features without any interruption.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLocalMode(true);
                localStorage.setItem('pms_local_mode', 'true');
                setQuotaExceeded(false);
                window.location.reload();
              }}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10.5px] shrink-0 transition cursor-pointer"
            >
              Switch to Offline Local Mode
            </button>
          </div>
        )}

        {/* Screens Switch Router */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <main className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto flex flex-col justify-between space-y-6">
          <div className="flex-1">
            {currentTab === 'superadmin' && userProfile?.role === 'System Owner' && (
              <SuperAdminPanel lang={lang} />
            )}

            {currentTab === 'dashboard' && (
              <Dashboard
                rooms={rooms}
                bookings={bookings}
                guests={guests}
                payments={payments}
                roomTypes={roomTypes}
                currencySymbol={hotel.currencySymbol}
                onUpdateRoomStatus={handleUpdateRoomStatus}
                transactions={transactions}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentTab === 'reservations' && (
              <Reservations
                bookings={bookings}
                rooms={rooms}
                roomTypes={roomTypes}
                guests={guests}
                currencySymbol={hotel.currencySymbol}
                hotelId={hotel.id}
                onAddBooking={handleAddBooking}
                onAddGuest={async (g) => {
                  if (isLocalMode) {
                    const gId = 'guest_' + Date.now();
                    const newGuest = { id: gId, ...g };
                    saveLocalGuests([newGuest, ...guests]);
                    return gId;
                  }
                  const docRef = await addDoc(collection(db, 'guests'), g);
                  await updateDoc(docRef, { id: docRef.id });
                  return docRef.id;
                }}
                onUpdateBookingStatus={async (id, status) => {
                  if (isLocalMode) {
                    const updatedBookings = bookings.map(bk => bk.id === id ? { 
                      ...bk, 
                      status,
                      ...(status === 'Checked Out' ? { checkOutDate: getLocalISODate() } : {}) 
                    } : bk);
                    saveLocalBookings(updatedBookings);
                    const b = bookings.find((bk) => bk.id === id);
                    if (b) {
                      const rStatus = status === 'Checked In' ? 'Occupied' : 'Available';
                      const updatedRooms = rooms.map(r => r.id === b.roomId ? { ...r, status: rStatus as any } : r);
                      saveLocalRooms(updatedRooms);
                    }
                    return;
                  }
                  await updateDoc(doc(db, 'bookings', id), { 
                    status,
                    ...(status === 'Checked Out' ? { checkOutDate: getLocalISODate() } : {}) 
                  });
                  // Check in sets room to Occupied
                  const b = bookings.find((bk) => bk.id === id);
                  if (b) {
                    const rStatus = status === 'Checked In' ? 'Occupied' : 'Available';
                    await updateDoc(doc(db, 'rooms', b.roomId), { status: rStatus });
                  }
                }}
                onCheckOutTab={(id) => {
                  setCheckoutBookingId(id);
                  setCurrentTab('checkout');
                }}
                onUpdateBooking={handleUpdateBooking}
                onUpdateGuest={handleUpdateGuest}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentTab === 'checkout' && hotel && (
              <CheckOut
                bookings={bookings}
                rooms={rooms}
                roomTypes={roomTypes}
                guests={guests}
                currencySymbol={hotel.currencySymbol}
                onCheckOutBooking={handleCheckOutBooking}
                preselectedBookingId={checkoutBookingId}
                clearPreselectedBooking={() => setCheckoutBookingId('')}
                hotel={hotel}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentTab === 'rooms' && (
              <Rooms
                rooms={rooms}
                roomTypes={roomTypes}
                hotelId={hotel.id}
                onAddRoom={async (room) => {
                  if (isLocalMode) {
                    const rId = 'room_' + Date.now();
                    const newRoom = { id: rId, ...room };
                    saveLocalRooms([newRoom, ...rooms]);
                    return;
                  }
                  await addDoc(collection(db, 'rooms'), room);
                }}
                onUpdateRoomStatus={handleUpdateRoomStatus}
                onDeleteRoom={async (id) => {
                  if (isLocalMode) {
                    const updated = rooms.filter(r => r.id !== id);
                    saveLocalRooms(updated);
                    return;
                  }
                  await deleteDoc(doc(db, 'rooms', id));
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentTab === 'housekeeping' && (
              <Housekeeping
                rooms={rooms}
                employees={employees}
                onUpdateRoomStatus={handleUpdateRoomStatus}
                onAssignStaff={handleAssignStaff}
              />
            )}

            {currentTab === 'customers' && (
              <Customers
                guests={guests}
                bookings={bookings}
                currencySymbol={hotel.currencySymbol}
                onToggleLoyal={async (id, isLoyal) => {
                  if (isLocalMode) {
                    const updated = guests.map(g => g.id === id ? { ...g, isLoyal } : g);
                    saveLocalGuests(updated);
                    return;
                  }
                  await updateDoc(doc(db, 'guests', id), { isLoyal });
                }}
                onToggleBlacklist={async (id, isBlacklisted) => {
                  if (isLocalMode) {
                    const updated = guests.map(g => g.id === id ? { ...g, isBlacklisted } : g);
                    saveLocalGuests(updated);
                    return;
                  }
                  await updateDoc(doc(db, 'guests', id), { isBlacklisted });
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentTab === 'restaurant' && (
              <Restaurant
                rooms={rooms}
                orders={restaurantOrders}
                currencySymbol={hotel.currencySymbol}
                hotelId={hotel.id}
                onSubmitOrder={async (order) => {
                  if (isLocalMode) {
                    const oId = 'ord_' + Date.now();
                    const newOrder = { id: oId, ...order };
                    const updatedOrders = [newOrder, ...restaurantOrders];
                    saveLocalRestaurantOrders(updatedOrders);

                    const activeBooking = bookings.find((b) => b.roomId === order.roomId && b.status === 'Checked In');
                    if (activeBooking) {
                      const newFoodCharges = (activeBooking.foodCharges || 0) + order.totalAmount;
                      const newTotal = activeBooking.totalAmount + order.totalAmount;
                      const updatedBookings = bookings.map(b => b.id === activeBooking.id ? { ...b, foodCharges: newFoodCharges, totalAmount: newTotal } : b);
                      saveLocalBookings(updatedBookings);
                    }
                    return;
                  }
                  const docRef = await addDoc(collection(db, 'restaurantOrders'), order);
                  // Automatically add food charges to outstanding stay booking linked to Room
                  const activeBooking = bookings.find((b) => b.roomId === order.roomId && b.status === 'Checked In');
                  if (activeBooking) {
                    const newFoodCharges = (activeBooking.foodCharges || 0) + order.totalAmount;
                    const newTotal = activeBooking.totalAmount + order.totalAmount;
                    await updateDoc(doc(db, 'bookings', activeBooking.id), {
                      foodCharges: newFoodCharges,
                      totalAmount: newTotal
                    });
                  }
                }}
                onCompleteOrder={async (id) => {
                  if (isLocalMode) {
                    const updated = restaurantOrders.map(o => o.id === id ? { ...o, status: 'Completed' as const } : o);
                    saveLocalRestaurantOrders(updated);
                    return;
                  }
                  await updateDoc(doc(db, 'restaurantOrders', id), { status: 'Completed' });
                }}
              />
            )}

            {currentTab === 'inventory' && (
              <Inventory
                inventory={inventory}
                suppliers={suppliers}
                hotelId={hotel.id}
                onAddSupplier={async (sup) => {
                  if (isLocalMode) {
                    const sId = 'sup_' + Date.now();
                    const newSupplier = { id: sId, ...sup };
                    saveLocalSuppliers([newSupplier, ...suppliers]);
                    return;
                  }
                  await addDoc(collection(db, 'suppliers'), sup);
                }}
                onAddInventoryItem={async (item) => {
                  if (isLocalMode) {
                    const iId = 'inv_' + Date.now();
                    const newItem = { id: iId, ...item };
                    saveLocalInventory([newItem, ...inventory]);
                    return;
                  }
                  await addDoc(collection(db, 'inventory'), item);
                }}
                onUpdateStock={async (itemId, qty) => {
                  if (isLocalMode) {
                    const updated = inventory.map(i => i.id === itemId ? { ...i, quantity: qty } : i);
                    saveLocalInventory(updated);
                    return;
                  }
                  await updateDoc(doc(db, 'inventory', itemId), { quantity: qty });
                }}
              />
            )}

            {currentTab === 'employees' && (
              <Employees
                employees={employees}
                currencySymbol={hotel.currencySymbol}
                hotelId={hotel.id}
                onAddEmployee={async (emp) => {
                  if (isLocalMode) {
                    const eId = 'emp_' + Date.now();
                    const newEmployee = { id: eId, ...emp };
                    saveLocalEmployees([newEmployee, ...employees]);
                    return;
                  }
                  await addDoc(collection(db, 'employees'), emp);
                }}
                onUpdateAttendance={handleUpdateAttendance}
              />
            )}

            {currentTab === 'accounting' && (
              <Accounting
                transactions={transactions}
                currencySymbol={hotel.currencySymbol}
                hotelId={hotel.id}
                onAddTransaction={async (tx) => {
                  if (isLocalMode) {
                    const tId = 'tx_' + Date.now();
                    const newTx = { id: tId, ...tx };
                    saveLocalTransactions([newTx, ...transactions]);
                    return;
                  }
                  await addDoc(collection(db, 'financialTransactions'), tx);
                }}
                onDeleteTransaction={async (id) => {
                  if (isLocalMode) {
                    const updated = transactions.filter(t => t.id !== id);
                    saveLocalTransactions(updated);
                    return;
                  }
                  await deleteDoc(doc(db, 'financialTransactions', id));
                }}
              />
            )}

            {currentTab === 'reports' && (
              <Reports
                rooms={rooms}
                bookings={bookings}
                guests={guests}
                payments={payments}
                transactions={transactions}
                currencySymbol={hotel.currencySymbol}
                taxRate={hotel.taxRate}
                hotelName={hotel.name}
                hotelLogo={hotel.logo}
              />
            )}

            {currentTab === 'setup' && (
              <HotelSetup
                hotel={hotel}
                roomTypes={roomTypes}
                onUpdateHotel={async (updated) => {
                  if (isLocalMode) {
                    const newHotel = { ...hotel, ...updated };
                    setHotel(newHotel);
                    localStorage.setItem('pms_local_hotel', JSON.stringify(newHotel));
                    return;
                  }
                  await updateDoc(doc(db, 'hotels', hotel.id), updated);
                  setHotel({ ...hotel, ...updated });
                }}
                onAddRoomType={async (rt) => {
                  if (isLocalMode) {
                    const rtId = 'type_' + Date.now();
                    const newRt = { id: rtId, ...rt };
                    saveLocalRoomTypes([newRt, ...roomTypes]);
                    return;
                  }
                  await addDoc(collection(db, 'roomTypes'), rt);
                }}
                onDeleteRoomType={async (id) => {
                  if (isLocalMode) {
                    const updated = roomTypes.filter(rt => rt.id !== id);
                    saveLocalRoomTypes(updated);
                    return;
                  }
                  await deleteDoc(doc(db, 'roomTypes', id));
                }}
              />
            )}
          </div>

          {/* Footer Status Bar */}
          <div className="h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center px-4 justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">
            <div className="flex space-x-4 items-center">
              {isLocalMode ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                  Local Sandbox Active
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('pms_local_mode');
                      setIsLocalMode(false);
                      window.location.reload();
                    }}
                    className="ml-2 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-semibold cursor-pointer"
                  >
                    (Switch to Cloud Mode)
                  </button>
                </span>
              ) : (
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Firestore Connected</span>
              )}
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Auth: {userProfile?.role || 'Hotel Admin'}</span>
              <span>Last sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">v2.4.1 Production</span>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
