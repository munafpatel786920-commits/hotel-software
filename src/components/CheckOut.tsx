import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Receipt,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Building2,
  FileSpreadsheet,
  User,
  Home,
  Search
} from 'lucide-react';
import { Booking, Room, RoomType, Guest } from '../types';

interface CheckOutProps {
  bookings: Booking[];
  rooms: Room[];
  roomTypes: RoomType[];
  guests: Guest[];
  currencySymbol: string;
  onCheckOutBooking: (
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
  ) => Promise<void>;
  preselectedBookingId?: string;
  clearPreselectedBooking?: () => void;
  hotel: any;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function CheckOut({
  bookings,
  rooms,
  roomTypes,
  guests,
  currencySymbol,
  onCheckOutBooking,
  preselectedBookingId,
  clearPreselectedBooking,
  hotel,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: CheckOutProps) {
  const [stayTab, setStayTab] = useState<'active' | 'history'>('active');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery !== undefined ? propSetSearchQuery : setLocalSearchQuery;

  const checkedInStays = bookings.filter((b) => b.status === 'Checked In');
  const checkedOutStays = bookings.filter((b) => b.status === 'Checked Out');

  const filteredStays = (stayTab === 'active' ? checkedInStays : checkedOutStays).filter((b) => {
    const guestObj = guests.find((g) => g.id === b.guestId);
    const roomObj = rooms.find((r) => r.id === b.roomId);
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      (guestObj?.name || '').toLowerCase().includes(query) ||
      (guestObj?.phone || '').toLowerCase().includes(query) ||
      (roomObj?.roomNumber || '').toLowerCase().includes(query)
    );
  });

  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [showInvoice, setShowInvoice] = useState(false);

  // Bill custom items states
  const [food, setFood] = useState(0);
  const [laundry, setLaundry] = useState(0);
  const [minibar, setMinibar] = useState(0);
  const [extras, setExtras] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Online'>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettledJustNow, setIsSettledJustNow] = useState(false);

  // Sync selected booking from preselectedBookingId prop (from reservations screen)
  useEffect(() => {
    if (preselectedBookingId) {
      setSelectedBookingId(preselectedBookingId);
      const b = bookings.find((bk) => bk.id === preselectedBookingId);
      if (b) {
        setFood(b.foodCharges || 0);
        setLaundry(b.laundryCharges || 0);
        setMinibar(b.minibarCharges || 0);
        setExtras(b.extraCharges || 0);
        setDiscount(b.discount || 0);
      }
      if (clearPreselectedBooking) {
        clearPreselectedBooking();
      }
    }
  }, [preselectedBookingId, bookings, clearPreselectedBooking]);

  // Keep reference to booking even after it goes out of active list
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const selectedGuest = selectedBooking ? guests.find((g) => g.id === selectedBooking.guestId) : null;
  const selectedRoom = selectedBooking ? rooms.find((r) => r.id === selectedBooking.roomId) : null;
  const selectedType = selectedBooking ? roomTypes.find((t) => t.id === selectedBooking.roomTypeId) : null;

  // Nights calculation
  const calculateNights = () => {
    if (!selectedBooking) return 1;
    try {
      const start = new Date(selectedBooking.checkInDate).getTime();
      const end = new Date(selectedBooking.checkOutDate).getTime();
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays || 1;
    } catch {
      return 1;
    }
  };

  const nightsCount = calculateNights();

  // Invoice calculations
  const calculateInvoice = () => {
    if (!selectedBooking) return { subtotal: 0, tax: 0, total: 0 };
    const roomSubtotal = selectedBooking.roomCharges;
    const itemizedSubtotal = food + laundry + minibar + extras;
    const subtotal = Math.max(0, roomSubtotal + itemizedSubtotal - discount);
    const tax = Math.round(subtotal * (hotel?.taxRate ? hotel.taxRate / 100 : 0.18)); // Dynamic tax rate from setup
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const invoice = calculateInvoice();

  const handleSettleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || !selectedBooking) return;

    setIsSubmitting(true);
    try {
      await onCheckOutBooking(
        selectedBookingId,
        selectedBooking.roomId,
        {
          foodCharges: Number(food),
          laundryCharges: Number(laundry),
          minibarCharges: Number(minibar),
          extraCharges: Number(extras),
          discount: Number(discount),
          taxAmount: invoice.tax,
          totalAmount: invoice.total
        },
        paymentMethod
      );

      setIsSettledJustNow(true);
      setShowInvoice(true); // Automatically open the gorgeous invoice modal for printing
    } catch (err) {
      console.error(err);
      alert('Checkout settlement failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoice(false);
    if (isSettledJustNow) {
      // Complete reset only after departing guest invoice is closed/printed
      setSelectedBookingId('');
      setFood(0);
      setLaundry(0);
      setMinibar(0);
      setExtras(0);
      setDiscount(0);
      setIsSettledJustNow(false);
    }
  };

  const generateAndDownloadInvoiceHTML = () => {
    if (!selectedBooking) return;
    
    const invoiceNo = `INV-${selectedBookingId.toUpperCase().slice(-8)}`;
    const issueDate = new Date().toLocaleString();
    const statusText = selectedBooking.status === 'Checked Out' ? 'Paid & Settled' : 'Payment Pending';
    const hotelName = hotel?.name || 'HMS Royal Retreat';
    const hotelAddress = hotel?.address || 'Hotel Boulevard, Heritage Road';
    const hotelPhone = hotel?.phone || '+91 99999 99999';
    const hotelEmail = hotel?.email || 'billing@hmscloud.com';
    const taxNumber = hotel?.taxNumber || 'GSTIN878A9876Z0';
    const taxLabel = hotel?.taxLabel || 'GST';
    const taxRate = hotel?.taxRate || 18;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoiceNo}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; color: black !important; padding: 0 !important; }
    }
  </style>
</head>
<body class="bg-slate-50 min-h-screen py-10 px-4 flex justify-center items-start">
  <div class="bg-white w-full max-w-2xl border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 text-slate-800">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
      <div>
        <div class="flex items-center space-x-2.5">
          ${hotel?.logo ? `
            <img
              src="${hotel.logo}"
              alt="Hotel Logo"
              class="w-10 h-10 object-contain rounded bg-slate-50 p-0.5 border border-slate-200"
              referrerpolicy="no-referrer"
            />
          ` : `
            <div class="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-xl">
              ${hotelName[0]}
            </div>
          `}
          <div>
            <h4 class="font-bold text-slate-900 text-lg leading-tight">${hotelName}</h4>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600">Stay Invoice Receipt</span>
              ${selectedBooking.status === 'Checked Out' ? `
                <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #e11d48; border: 1px solid #fecdd3; background-color: #fff1f2; padding: 1px 4px; borderRadius: 4px;">
                  Duplicate Copy
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="text-[11px] text-slate-500 mt-3 space-y-0.5">
          <p>${hotelAddress}</p>
          <p>Phone: ${hotelPhone} | Email: ${hotelEmail}</p>
          <p class="font-mono text-[10px]">Tax Registration No: ${taxNumber}</p>
        </div>
      </div>

      <div class="sm:text-right text-[11px] text-slate-500 space-y-1">
        <div>
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Invoice Number</span>
          <span class="font-mono font-bold text-slate-800 text-xs">${invoiceNo}</span>
        </div>
        <div>
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Issue Date & Time</span>
          <span class="font-medium text-slate-800">${issueDate}</span>
        </div>
        <div>
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Status</span>
          <span class="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/50">
            ${statusText}
          </span>
        </div>
      </div>
    </div>

    <!-- Guest & Stay details -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
      <div>
        <h5 class="font-black text-slate-900 uppercase text-[10px] tracking-wider mb-2">Guest Details</h5>
        <div class="space-y-1 text-slate-600">
          <p><span class="font-semibold text-slate-400">Name:</span> ${selectedGuest?.name}</p>
          <p><span class="font-semibold text-slate-400">Contact Phone:</span> ${selectedGuest?.phone}</p>
          <p><span class="font-semibold text-slate-400">Email Address:</span> ${selectedGuest?.email || 'N/A'}</p>
          <p><span class="font-semibold text-slate-400">ID / Passport No:</span> ${selectedGuest?.idNumber} (${selectedGuest?.idType})</p>
        </div>
      </div>
      <div>
        <h5 class="font-black text-slate-900 uppercase text-[10px] tracking-wider mb-2">Stay Details</h5>
        <div class="space-y-1 text-slate-600">
          <p><span class="font-semibold text-slate-400">Assigned Room:</span> Room ${selectedRoom?.roomNumber} (Floor ${selectedRoom?.floor})</p>
          <p><span class="font-semibold text-slate-400">Room Category:</span> ${selectedType?.name}</p>
          <p><span class="font-semibold text-slate-400">Check-In:</span> ${selectedBooking.checkInDate}</p>
          <p><span class="font-semibold text-slate-400">Check-Out:</span> ${selectedBooking.checkOutDate} (${nightsCount} Nights)</p>
        </div>
      </div>
    </div>

    <!-- Itemized table -->
    <div class="space-y-2">
      <h5 class="font-black text-slate-900 uppercase text-[10px] tracking-wider mb-1">Itemized Ledger Statement</h5>
      <div class="border border-slate-100 rounded-xl overflow-hidden">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
              <th class="py-2.5 px-4">Particulars / Description</th>
              <th class="py-2.5 px-3 text-right">Unit Rate</th>
              <th class="py-2.5 px-3 text-center">Qty / Nights</th>
              <th class="py-2.5 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td class="py-3 px-4">
                <p class="font-bold text-slate-800">${selectedType?.name || 'Room Charges'}</p>
                <p class="text-[10px] text-slate-400">Base tariff charges for lodging</p>
              </td>
              <td class="py-3 px-3 text-right">${currencySymbol}${(selectedType?.basePrice || Math.round(selectedBooking.roomCharges / nightsCount)).toLocaleString()}</td>
              <td class="py-3 px-3 text-center">${nightsCount} Nights</td>
              <td class="py-3 px-4 text-right font-bold text-slate-800">${currencySymbol}${selectedBooking.roomCharges.toLocaleString()}</td>
            </tr>
            ${food > 0 ? `
            <tr>
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-800">Dining & Room Service</p>
                <p class="text-[10px] text-slate-400">Restaurant orders & refreshments</p>
              </td>
              <td class="py-3 px-3 text-right">${currencySymbol}${food.toLocaleString()}</td>
              <td class="py-3 px-3 text-center">1</td>
              <td class="py-3 px-4 text-right font-semibold text-slate-800">${currencySymbol}${food.toLocaleString()}</td>
            </tr>` : ''}
            ${laundry > 0 ? `
            <tr>
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-800">Laundry & Dry Cleaning</p>
                <p class="text-[10px] text-slate-400">Valet garment services</p>
              </td>
              <td class="py-3 px-3 text-right">${currencySymbol}${laundry.toLocaleString()}</td>
              <td class="py-3 px-3 text-center">1</td>
              <td class="py-3 px-4 text-right font-semibold text-slate-800">${currencySymbol}${laundry.toLocaleString()}</td>
            </tr>` : ''}
            ${minibar > 0 ? `
            <tr>
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-800">Mini Bar Consumables</p>
                <p class="text-[10px] text-slate-400">Snacks, sodas & premium beverages</p>
              </td>
              <td class="py-3 px-3 text-right">${currencySymbol}${minibar.toLocaleString()}</td>
              <td class="py-3 px-3 text-center">1</td>
              <td class="py-3 px-4 text-right font-semibold text-slate-800">${currencySymbol}${minibar.toLocaleString()}</td>
            </tr>` : ''}
            ${extras > 0 ? `
            <tr>
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-800">Miscellaneous Extras</p>
                <p class="text-[10px] text-slate-400">Facility usage, spa or late checkout charges</p>
              </td>
              <td class="py-3 px-3 text-right">${currencySymbol}${extras.toLocaleString()}</td>
              <td class="py-3 px-3 text-center">1</td>
              <td class="py-3 px-4 text-right font-semibold text-slate-800">${currencySymbol}${extras.toLocaleString()}</td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary -->
    <div class="flex flex-col sm:flex-row sm:justify-between items-start gap-4 border-t border-slate-100 pt-4 text-xs">
      <div class="text-[11px] text-slate-400 max-w-xs space-y-1">
        <p class="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Invoicing Declarations</p>
        <p>1. All disputes are subject to local judicial jurisdiction.</p>
        <p>2. Thank you for choosing us! We look forward to welcoming you again soon.</p>
      </div>

      <div class="w-full sm:w-64 space-y-2 text-slate-600 text-xs">
        <div class="flex justify-between">
          <span>Taxable Subtotal:</span>
          <span class="font-bold text-slate-800">${currencySymbol}${invoice.subtotal.toLocaleString()}</span>
        </div>
        ${discount > 0 ? `
        <div class="flex justify-between text-rose-500 font-bold">
          <span>Discount (Cr):</span>
          <span>-${currencySymbol}${discount.toLocaleString()}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span>${taxLabel} (${taxRate}%):</span>
          <span class="font-bold text-slate-800">${currencySymbol}${invoice.tax.toLocaleString()}</span>
        </div>
        <div class="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900">
          <span>Grand Total Paid:</span>
          <span class="text-indigo-600">${currencySymbol}${invoice.total.toLocaleString()}</span>
        </div>
        <div class="text-[9px] font-bold text-slate-400 text-right uppercase tracking-wider">
          Settled via ${paymentMethod}
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="flex justify-between items-center pt-8 border-t border-dashed border-slate-100 text-xs">
      <div class="text-center w-36">
        <div class="border-b border-slate-200 h-8"></div>
        <p class="text-[10px] text-slate-400 font-semibold uppercase mt-1.5">Guest Signature</p>
      </div>
      <div class="text-center w-36">
        <div class="h-8 flex items-center justify-center">
          <span class="font-serif italic text-xs text-indigo-500 font-bold">HMS Verified</span>
        </div>
        <div class="border-b border-slate-200"></div>
        <p class="text-[10px] text-slate-400 font-semibold uppercase mt-1.5">Authorized Signatory</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    }
  </script>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${invoiceNo}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerSystemPrint = () => {
    if (window.self !== window.top) {
      // Inside iframe sandbox: natively print fails, so trigger the auto-printing download instantly
      generateAndDownloadInvoiceHTML();
    } else {
      // Direct window context: trigger normal system print modal
      try {
        window.print();
      } catch (err) {
        console.error("Print blocked, downloading HTML instead:", err);
        generateAndDownloadInvoiceHTML();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic CSS Print Helper for isolates printing of the receipt */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide everything on screen except our printable invoice container */
          #sidebar-container, 
          header, 
          main > div:not(#printable-invoice-modal-wrapper),
          .no-print,
          #sidebar-backdrop,
          button,
          aside {
            display: none !important;
          }
          #printable-invoice-modal-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 99999 !important;
          }
          .invoice-card-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Check-Out & Billing Hub</h2>
          <p className="text-xs text-slate-400 mt-0.5">Settle guest invoices, add extra service/restaurant charges, and print professional bills.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Guest List Panel with Active vs History Tabs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs h-fit space-y-4">
          {/* Subtabs */}
          <div className="flex p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setStayTab('active');
                setSelectedBookingId('');
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stayTab === 'active'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Active Checked-In
            </button>
            <button
              type="button"
              onClick={() => {
                setStayTab('history');
                setSelectedBookingId('');
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stayTab === 'history'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Checkout History
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search guest or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs outline-none transition text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Stays Found</span>
            <span>{filteredStays.length}</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredStays.map((b) => {
              const guestObj = guests.find((g) => g.id === b.guestId);
              const roomObj = rooms.find((r) => r.id === b.roomId);
              const isChosen = b.id === selectedBookingId;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBookingId(b.id);
                    setIsSettledJustNow(false);
                    // Reset add-on charges to booking's current values
                    setFood(b.foodCharges || 0);
                    setLaundry(b.laundryCharges || 0);
                    setMinibar(b.minibarCharges || 0);
                    setExtras(b.extraCharges || 0);
                    setDiscount(b.discount || 0);
                  }}
                  className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isChosen
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                        {guestObj?.name || 'Guest Details'}
                      </h4>
                      {b.status === 'Checked Out' && (
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                          Checked Out
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Stay dates: {b.checkInDate} to {b.checkOutDate}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-mono mt-0.5">
                      Bill #{b.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Room</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      {roomObj?.roomNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredStays.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-10">
                {stayTab === 'active' 
                  ? 'No active checked-in guests found.' 
                  : 'No checkout history entries found.'}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Itemization & Settler */}
        {selectedBooking ? (
          <form onSubmit={handleSettleCheckout} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bill calculator */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Settle Bill & Add Services</span>
                </h3>
                {selectedBooking.status === 'Checked Out' && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                    Already Settled
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Room Base Charges</label>
                  <input
                    type="text"
                    disabled
                    value={`${currencySymbol}${selectedBooking.roomCharges} (${nightsCount} Nights)`}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs font-bold text-slate-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Food / Room Service</label>
                    <input
                      type="number"
                      min="0"
                      disabled={selectedBooking.status === 'Checked Out'}
                      value={food}
                      onChange={(e) => setFood(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Laundry Service</label>
                    <input
                      type="number"
                      min="0"
                      disabled={selectedBooking.status === 'Checked Out'}
                      value={laundry}
                      onChange={(e) => setLaundry(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Mini Bar Consumables</label>
                    <input
                      type="number"
                      min="0"
                      disabled={selectedBooking.status === 'Checked Out'}
                      value={minibar}
                      onChange={(e) => setMinibar(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Extra / Other Charges</label>
                    <input
                      type="number"
                      min="0"
                      disabled={selectedBooking.status === 'Checked Out'}
                      value={extras}
                      onChange={(e) => setExtras(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Apply Discount ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    disabled={selectedBooking.status === 'Checked Out'}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Bill Summary & Depart Trigger */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Checkout Summary</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Guest Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedGuest?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Room</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Room {selectedRoom?.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category</span>
                  <span>{selectedType?.name}</span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Room Tariff ({nightsCount} Nights)</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {currencySymbol}{selectedBooking.roomCharges}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amenities & Dining add-ons</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {currencySymbol}{food + laundry + minibar + extras}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-bold">
                      <span>Discount Given</span>
                      <span>
                        -{currencySymbol}{discount}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxes / {hotel?.taxLabel || 'GST'} ({hotel?.taxRate || 18}%)</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {currencySymbol}{invoice.tax}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-base font-black text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800/60 pt-3.5">
                  <span>Grand Total</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {currencySymbol}{invoice.total.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    disabled={selectedBooking.status === 'Checked Out'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoice(true)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View & Print Bill</span>
                  </button>

                  {selectedBooking.status === 'Checked In' ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Departing...' : 'Settle Stay'}</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 select-none">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Stay Departed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center py-20">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mt-3">Settle Departure Bills</h3>
            <p className="text-xs text-slate-400 mt-1">Select an active stay on the left panel to calculate additional charges and checkout guests.</p>
          </div>
        )}
      </div>

      {/* GORGEOUS INVOICE PREVIEW MODAL */}
      {showInvoice && selectedBooking && (
        <div id="printable-invoice-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 md:p-6">
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 text-slate-800 dark:text-slate-100 invoice-card-container">
            
            {/* Modal actions - hidden during printing */}
            <div className="no-print flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Guest Invoice Preview</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={triggerSystemPrint}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Bill</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseInvoiceModal}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area starts */}
            <div className="space-y-6">
              {/* Header: Hotel logo & metadata */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                <div>
                  <div className="flex items-center space-x-2.5">
                    {hotel?.logo ? (
                      <img
                        src={hotel.logo}
                        alt="Hotel Logo"
                        className="w-10 h-10 object-contain rounded bg-slate-50 p-0.5 border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-xl">
                        {hotel?.name?.[0] || 'H'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-sans font-black text-slate-900 dark:text-white text-base leading-tight">
                        {hotel?.name || 'HMS Royal Retreat'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] uppercase tracking-wider font-black text-indigo-600 dark:text-indigo-400">
                          Stay Invoice Receipt
                        </p>
                        {selectedBooking.status === 'Checked Out' && (
                          <span className="text-[8px] tracking-wider font-extrabold uppercase text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded animate-pulse">
                            Duplicate Copy
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-3 space-y-0.5">
                    <p className="flex items-center"><Building2 className="w-3 h-3 mr-1 text-slate-400" /> {hotel?.address || 'Hotel Boulevard, Heritage Road'}</p>
                    <p>Phone: {hotel?.phone || '+91 99999 99999'} | Email: {hotel?.email || 'billing@hmscloud.com'}</p>
                    <p className="font-mono text-[10px]">Tax Registration No: {hotel?.taxNumber || 'GSTIN878A9876Z0'}</p>
                  </div>
                </div>

                <div className="sm:text-right text-[11px] text-slate-500 space-y-1">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Invoice Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      INV-{selectedBookingId.toUpperCase().slice(-8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Issue Date & Time</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      selectedBooking.status === 'Checked Out'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                        : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50'
                    }`}>
                      {selectedBooking.status === 'Checked Out' ? 'Paid & Settled' : 'Payment Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest & Stay information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl text-xs">
                <div>
                  <h5 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-wider mb-2 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Guest Details
                  </h5>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-400">Name:</span> {selectedGuest?.name}</p>
                    <p><span className="font-semibold text-slate-400">Contact Phone:</span> {selectedGuest?.phone}</p>
                    <p><span className="font-semibold text-slate-400">Email Address:</span> {selectedGuest?.email || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-400">ID / Passport No:</span> {selectedGuest?.idNumber} ({selectedGuest?.idType})</p>
                  </div>
                </div>
                <div>
                  <h5 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-wider mb-2 flex items-center">
                    <Home className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Stay Details
                  </h5>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-400">Assigned Room:</span> Room {selectedRoom?.roomNumber} (Floor {selectedRoom?.floor})</p>
                    <p><span className="font-semibold text-slate-400">Room Category:</span> {selectedType?.name}</p>
                    <p><span className="font-semibold text-slate-400">Check-In:</span> {selectedBooking.checkInDate}</p>
                    <p><span className="font-semibold text-slate-400">Check-Out:</span> {selectedBooking.checkOutDate} ({nightsCount} Nights)</p>
                  </div>
                </div>
              </div>

              {/* Itemized charges table */}
              <div className="space-y-2">
                <h5 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-wider mb-1">
                  Itemized Ledger Statement
                </h5>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2.5 px-4">Particulars / Description</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-center">Qty / Nights</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                      {/* Room charges row */}
                      <tr>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{selectedType?.name || 'Room Charges'}</p>
                          <p className="text-[10px] text-slate-400">Base tariff charges for lodging</p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {currencySymbol}
                          {(selectedType?.basePrice || Math.round(selectedBooking.roomCharges / nightsCount)).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">{nightsCount} Nights</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-100">
                          {currencySymbol}
                          {selectedBooking.roomCharges.toLocaleString()}
                        </td>
                      </tr>

                      {/* Dining / Food Charges */}
                      {food > 0 && (
                        <tr>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Dining & Room Service</p>
                            <p className="text-[10px] text-slate-400">Restaurant orders & refreshments</p>
                          </td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{food.toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">1</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                            {currencySymbol}{food.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {/* Laundry Charges */}
                      {laundry > 0 && (
                        <tr>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Laundry & Dry Cleaning</p>
                            <p className="text-[10px] text-slate-400">Valet garment services</p>
                          </td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{laundry.toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">1</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                            {currencySymbol}{laundry.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {/* Minibar Charges */}
                      {minibar > 0 && (
                        <tr>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Mini Bar Consumables</p>
                            <p className="text-[10px] text-slate-400">Snacks, sodas & premium beverages</p>
                          </td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{minibar.toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">1</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                            {currencySymbol}{minibar.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {/* Other Extra Charges */}
                      {extras > 0 && (
                        <tr>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Miscellaneous Extras</p>
                            <p className="text-[10px] text-slate-400">Facility usage, spa or late checkout charges</p>
                          </td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{extras.toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">1</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                            {currencySymbol}{extras.toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ledger Summary and Totals Block */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs">
                <div className="text-[11px] text-slate-400 max-w-xs space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Invoicing Declarations</p>
                  <p>1. All disputes are subject to local judicial jurisdiction.</p>
                  <p>2. Thank you for choosing {hotel?.name || 'us'}! We look forward to welcoming you again soon.</p>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-slate-600 dark:text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {currencySymbol}{invoice.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-bold">
                      <span>Discount (Cr):</span>
                      <span>-{currencySymbol}{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{hotel?.taxLabel || 'GST/Tax'} ({hotel?.taxRate || 18}%):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {currencySymbol}{invoice.tax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 text-sm font-black text-slate-900 dark:text-white">
                    <span>Grand Total Paid:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {currencySymbol}{invoice.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-wider">
                    Settled via {paymentMethod}
                  </div>
                </div>
              </div>

              {/* Signatures block */}
              <div className="flex justify-between items-center pt-8 border-t border-dashed border-slate-100 dark:border-slate-800/60 text-xs">
                <div className="text-center w-36">
                  <div className="border-b border-slate-200 dark:border-slate-800 h-8"></div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1.5">Guest Signature</p>
                </div>
                <div className="text-center w-36">
                  <div className="h-8 flex items-center justify-center">
                    <span className="font-serif italic text-xs text-indigo-500 font-bold">HMS Verified</span>
                  </div>
                  <div className="border-b border-slate-200 dark:border-slate-800"></div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1.5">Authorized Signatory</p>
                </div>
              </div>

            </div>
            {/* Printable Area ends */}

          </div>
        </div>
      )}
    </div>
  );
}
