import { getLocalISODate } from '../utils/date';
import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Check,
  ChevronRight,
  User,
  Phone,
  Bed,
  CalendarDays,
  Sparkles,
  CreditCard,
  Receipt,
  MapPin,
  Paperclip,
  Trash2,
  Image,
  Eye,
  Edit
} from 'lucide-react';
import { Booking, Room, RoomType, Guest } from '../types';

interface ReservationsProps {
  bookings: Booking[];
  rooms: Room[];
  roomTypes: RoomType[];
  guests: Guest[];
  currencySymbol: string;
  hotelId: string;
  onAddBooking: (booking: Omit<Booking, 'id'>) => Promise<void>;
  onAddGuest: (guest: Omit<Guest, 'id'>) => Promise<string>;
  onUpdateBookingStatus: (id: string, status: 'Reserved' | 'Checked In' | 'Checked Out' | 'Cancelled') => Promise<void>;
  onCheckOutTab?: (id: string) => void;
  onUpdateBooking?: (id: string, updatedFields: Partial<Booking>) => Promise<void>;
  onUpdateGuest?: (id: string, updatedFields: Partial<Guest>) => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Reservations({
  bookings,
  rooms,
  roomTypes,
  guests,
  currencySymbol,
  hotelId,
  onAddBooking,
  onAddGuest,
  onUpdateBookingStatus,
  onCheckOutTab,
  onUpdateBooking,
  onUpdateGuest,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: ReservationsProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // New Booking Form States
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNationality, setGuestNationality] = useState('Indian');
  const [guestIdType, setGuestIdType] = useState<'Passport' | 'National ID' | 'Driving License'>('National ID');
  const [guestIdNumber, setGuestIdNumber] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestIdImage, setGuestIdImage] = useState<string>('');

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestNationality('Indian');
    setGuestIdType('National ID');
    setGuestIdNumber('');
    setGuestAddress('');
    setGuestIdImage('');
    setSelectedRoomId('');
    setSelectedRoomTypeId('');
    setEditingBookingId(null);
  };

  const handleStartEdit = (booking: Booking) => {
    const guest = guests.find(g => g.id === booking.guestId);
    if (!guest) {
      alert("Guest details not found for this reservation!");
      return;
    }
    setEditingBookingId(booking.id);
    
    // Set guest fields
    setGuestName(guest.name || '');
    setGuestPhone(guest.phone || '');
    setGuestEmail(guest.email || '');
    setGuestNationality(guest.nationality || 'Indian');
    setGuestIdType(guest.idType || 'National ID');
    setGuestIdNumber(guest.idNumber || '');
    setGuestAddress(guest.address || '');
    setGuestIdImage(guest.idImage || '');

    // Set booking fields
    setSelectedRoomTypeId(booking.roomTypeId);
    setSelectedRoomId(booking.roomId);
    setCheckInDate(booking.checkInDate);
    setCheckOutDate(booking.checkOutDate);
    setIsWalkIn(booking.status === 'Checked In');
    
    setActiveTab('add');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuestIdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState(getLocalISODate());
  const [checkOutDate, setCheckOutDate] = useState(
    getLocalISODate(new Date(Date.now() + 86400000))
  );
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/Filters
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery !== undefined ? propSetSearchQuery : setLocalSearchQuery;
  const [selectedGuestDetails, setSelectedGuestDetails] = useState<Guest | null>(null);

  // Find available rooms for selected dates/types
  const getAvailableRooms = () => {
    if (!selectedRoomTypeId) return [];
    // Rooms of selected type
    const typedRooms = rooms.filter((r) => r.roomTypeId === selectedRoomTypeId);

    // Filter out rooms that have overlapping active bookings
    return typedRooms.filter((room) => {
      const isOverlapping = bookings.some((b) => {
        if (b.id === editingBookingId) return false;
        if (b.roomId !== room.id || b.status === 'Cancelled' || b.status === 'Checked Out') return false;
        // Overlap conditions
        return (
          (checkInDate >= b.checkInDate && checkInDate < b.checkOutDate) ||
          (checkOutDate > b.checkInDate && checkOutDate <= b.checkOutDate) ||
          (checkInDate <= b.checkInDate && checkOutDate >= b.checkOutDate)
        );
      });
      return !isOverlapping;
    });
  };

  const availableRooms = getAvailableRooms();

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim() || !selectedRoomId || !selectedRoomTypeId) {
      alert('Please fill out all required fields and assign a room.');
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      alert('Check-out date must be after Check-in date!');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate stay nights and price
      const typeObj = roomTypes.find((t) => t.id === selectedRoomTypeId);
      const rate = typeObj?.basePrice || 100;
      const stayNights = Math.max(
        1,
        Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000)
      );
      const roomCharges = rate * stayNights;
      const taxAmount = Math.round(roomCharges * 0.18); // default 18%
      const totalAmount = roomCharges + taxAmount;

      if (editingBookingId) {
        // 1. Update existing guest details
        const currentBooking = bookings.find((b) => b.id === editingBookingId);
        if (currentBooking) {
          if (onUpdateGuest) {
            await onUpdateGuest(currentBooking.guestId, {
              name: guestName,
              email: guestEmail,
              phone: guestPhone,
              nationality: guestNationality,
              idType: guestIdType,
              idNumber: guestIdNumber,
              address: guestAddress,
              idImage: guestIdImage
            });
          }

          // 2. Update existing Booking details
          if (onUpdateBooking) {
            await onUpdateBooking(editingBookingId, {
              roomTypeId: selectedRoomTypeId,
              roomId: selectedRoomId,
              checkInDate,
              checkOutDate,
              totalAmount,
              roomCharges,
              taxAmount,
              status: isWalkIn ? 'Checked In' : 'Reserved'
            });
          }

          alert('Reservation updated successfully!');
          resetForm();
          setActiveTab('list');
        }
        return;
      }

      // 1. Create or reference guest
      const existingGuest = guests.find((g) => g.phone === guestPhone.trim());
      let guestId = '';
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        guestId = await onAddGuest({
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          nationality: guestNationality,
          idType: guestIdType,
          idNumber: guestIdNumber,
          address: guestAddress,
          idImage: guestIdImage,
          hotelId
        });
      }

      // 2. Add Booking
      await onAddBooking({
        guestId,
        roomTypeId: selectedRoomTypeId,
        roomId: selectedRoomId,
        checkInDate,
        checkOutDate,
        status: isWalkIn ? 'Checked In' : 'Reserved',
        totalAmount,
        paidAmount: isWalkIn ? totalAmount : 0, // walk-in pays upfront, reserved pending
        roomCharges,
        foodCharges: 0,
        laundryCharges: 0,
        minibarCharges: 0,
        extraCharges: 0,
        discount: 0,
        taxAmount,
        hotelId
      });

      alert('Reservation submitted successfully!');
      resetForm();
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      alert('Failed to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const guestObj = guests.find((g) => g.id === b.guestId);
    const roomObj = rooms.find((r) => r.id === b.roomId);
    return (
      (guestObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (guestObj?.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (roomObj?.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Reservations Menu Header */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => {
            resetForm();
            setActiveTab('list');
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'list'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Bookings Directory
        </button>
        <button
          onClick={() => {
            if (roomTypes.length === 0) {
              alert('Setup some Room Categories/Types first!');
              return;
            }
            if (editingBookingId) {
              // If already editing, clicking this starts a clean creation
              resetForm();
            }
            if (!selectedRoomTypeId && roomTypes.length > 0) {
              setSelectedRoomTypeId(roomTypes[0].id);
            }
            setActiveTab('add');
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'add'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {editingBookingId ? 'Edit Reservation' : 'Create Reservation'}
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          {/* Search toolbar */}
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guest name, phone, room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3.5 pl-4">Guest Name</th>
                    <th className="py-3.5">Stay Interval</th>
                    <th className="py-3.5">Room</th>
                    <th className="py-3.5 text-right">Bill Amount</th>
                    <th className="py-3.5 text-right">Paid Amount</th>
                    <th className="py-3.5 text-center">Status</th>
                    <th className="py-3.5 text-center pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {filteredBookings.map((b) => {
                    const guestObj = guests.find((g) => g.id === b.guestId);
                    const roomObj = rooms.find((r) => r.id === b.roomId);
                    const typeObj = roomTypes.find((t) => t.id === b.roomTypeId);
                    return (
                      <tr key={b.id} className="text-xs text-slate-700 dark:text-slate-300">
                        <td className="py-3.5 pl-4 font-semibold">
                          <div className="flex items-center space-x-3">
                            {guestObj?.idImage ? (
                              <button
                                type="button"
                                onClick={() => guestObj && setSelectedGuestDetails(guestObj)}
                                className="w-8 h-8 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 cursor-pointer shrink-0"
                                title="Click to view ID"
                              >
                                <img src={guestObj.idImage} alt="ID" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => guestObj && setSelectedGuestDetails(guestObj)}
                              className="text-left cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 group focus:outline-none"
                              title="View Guest Profile"
                            >
                              <p className="text-slate-800 dark:text-slate-100 font-bold group-hover:underline flex items-center gap-1.5">
                                <span>{guestObj?.name || 'Guest Deleted'}</span>
                                <Eye className="w-3 h-3 text-slate-400" />
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">{guestObj?.phone}</p>
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <p>{b.checkInDate} to {b.checkOutDate}</p>
                        </td>
                        <td className="py-3.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100">
                            {roomObj?.roomNumber || 'Not assigned'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">({typeObj?.name})</p>
                        </td>
                        <td className="py-3.5 text-right font-semibold">
                          {currencySymbol}
                          {b.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {currencySymbol}
                          {b.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Checked In'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                : b.status === 'Reserved'
                                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                                : b.status === 'Checked Out'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-center pr-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {b.status === 'Reserved' && (
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, 'Checked In')}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] cursor-pointer shadow-xs transition"
                              >
                                Check-In Guest
                              </button>
                            )}

                            {b.status === 'Checked In' && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200/50 mr-1">
                                  Active Stay
                                </span>
                                {onCheckOutTab && (
                                  <button
                                    onClick={() => onCheckOutTab(b.id)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-xs transition"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Bill & Settle</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {(b.status === 'Reserved' || b.status === 'Checked In') && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(b)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black rounded text-[10px] cursor-pointer flex items-center gap-1 shadow-xs transition"
                                title="Edit Reservation & Guest Details"
                              >
                                <Edit className="w-3 h-3 shrink-0 text-white" />
                                <span>Edit Stay</span>
                              </button>
                            )}

                            {b.status === 'Checked Out' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-medium">Completed</span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(b)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition"
                                  title="Edit Completed Booking Record"
                                >
                                  <Edit className="w-3 h-3 shrink-0" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        No bookings matching active criteria. Create a reservation to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guest Info */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Guest Details</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">ID Type</label>
                  <select
                    value={guestIdType}
                    onChange={(e) => setGuestIdType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">ID Number</label>
                  <input
                    type="text"
                    placeholder="ID info"
                    value={guestIdNumber}
                    onChange={(e) => setGuestIdNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Residential Address</label>
                <textarea
                  placeholder="e.g. 123 Street Name, City, Country"
                  rows={2}
                  value={guestAddress}
                  onChange={(e) => setGuestAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Guest Photo / ID Document</label>
                {guestIdImage ? (
                  <div className="relative group border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/50 flex items-center justify-center">
                      <img src={guestIdImage} alt="Attachment Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">Photo_Attached.jpg</p>
                      <p className="text-[9px] text-slate-400">Successfully attached</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuestIdImage('')}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 rounded-xl p-3.5 transition cursor-pointer text-center group">
                    <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition mb-1" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Attach Guest Photo
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG up to 2MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Stay Settings & Room Selection */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <Bed className="w-4 h-4 text-indigo-600" />
              <span>Stay & Room Allocation</span>
            </h3>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Check-out Date</label>
                  <input
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Booking Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWalkIn(true)}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      isWalkIn
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Walk-In Stay
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWalkIn(false)}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      !isWalkIn
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Advance Booking
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Room Category *</label>
                <select
                  value={selectedRoomTypeId}
                  onChange={(e) => {
                    setSelectedRoomTypeId(e.target.value);
                    setSelectedRoomId(''); // reset assigned room
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({currencySymbol}
                      {rt.basePrice}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Assign Room *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Choose Available Room --</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} (Floor {r.floor})
                    </option>
                  ))}
                </select>
                {availableRooms.length === 0 && selectedRoomTypeId && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">No rooms currently available for selected interval!</p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Preview & Confirmation */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Bill Calculation</span>
            </h3>

            {selectedRoomTypeId ? (
              <div className="space-y-3.5">
                {(() => {
                  const typeObj = roomTypes.find((t) => t.id === selectedRoomTypeId);
                  const rate = typeObj?.basePrice || 0;
                  const stayNights = Math.max(
                    1,
                    Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000)
                  );
                  const subtotal = rate * stayNights;
                  const tax = Math.round(subtotal * 0.18); // 18% tax
                  const grandTotal = subtotal + tax;

                  return (
                    <>
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Night Rate</span>
                        <span>
                          {currencySymbol}
                          {rate}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Nights</span>
                        <span>{stayNights} Nights</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200 border-t border-slate-50 dark:border-slate-800 pt-3">
                        <span>Subtotal</span>
                        <span>
                          {currencySymbol}
                          {subtotal}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>GST/VAT Tax (18%)</span>
                        <span>
                          {currencySymbol}
                          {tax}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <span>Grand Total Due</span>
                        <span>
                          {currencySymbol}
                          {grandTotal.toLocaleString()}
                        </span>
                      </div>
                      {isWalkIn && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-emerald-800 dark:text-emerald-400">
                          <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Walk-in payment will be fully settled automatically upon check-in confirmation.</span>
                        </div>
                      )}
                    </>
                  );
                })()}

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRoomId}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer"
                >
                  {isSubmitting 
                    ? (editingBookingId ? 'Saving Changes...' : 'Registering Stay...') 
                    : (editingBookingId ? 'Save Changes' : 'Confirm Stay Reservation')}
                </button>

                {editingBookingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition border border-slate-200/50 dark:border-slate-700/60"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-10">Select room category to calculate charges.</p>
            )}
          </div>
        </form>
      )}

      {/* GUEST PROFILE DETAILS MODAL */}
      {selectedGuestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedGuestDetails(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="p-2 bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Guest Profile Details</h3>
                <p className="text-[10px] text-slate-400">View ID documentation and verification documents</p>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Primary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedGuestDetails.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone Number</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedGuestDetails.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email Address</span>
                  <span className="text-slate-600 dark:text-slate-300 truncate block">{selectedGuestDetails.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nationality</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedGuestDetails.nationality}</span>
                </div>
              </div>

              {/* ID info */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">ID Type</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedGuestDetails.idType}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">ID Document Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedGuestDetails.idNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Address */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Residential Address</span>
                </span>
                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                  {selectedGuestDetails.address || 'No residential address registered.'}
                </p>
              </div>

              {/* Photo attachment */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Attached Photo / Document</span>
                </span>
                {selectedGuestDetails.idImage ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 max-h-[220px] flex items-center justify-center p-2">
                    <img
                      src={selectedGuestDetails.idImage}
                      alt="Verification ID Document"
                      className="max-w-full max-h-[200px] object-contain rounded-lg shadow-xs"
                    />
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                    No document photo uploaded for this guest.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGuestDetails(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
