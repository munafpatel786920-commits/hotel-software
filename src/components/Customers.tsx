import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  Award,
  ShieldAlert,
  Ban,
  Phone,
  Mail,
  MapPin,
  History
} from 'lucide-react';
import { Guest, Booking } from '../types';

interface CustomersProps {
  guests: Guest[];
  bookings: Booking[];
  currencySymbol: string;
  onToggleLoyal: (guestId: string, isLoyal: boolean) => Promise<void>;
  onToggleBlacklist: (guestId: string, isBlacklisted: boolean) => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Customers({
  guests,
  bookings,
  currencySymbol,
  onToggleLoyal,
  onToggleBlacklist,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: CustomersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery !== undefined ? propSetSearchQuery : setLocalSearchQuery;

  const [filterType, setFilterType] = useState<'All' | 'Loyal' | 'Blacklisted'>('All');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.phone.includes(searchQuery) ||
      (guest.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'All' ||
      (filterType === 'Loyal' && guest.isLoyal) ||
      (filterType === 'Blacklisted' && guest.isBlacklisted);

    return matchesSearch && matchesFilter;
  });

  const selectedGuest = guests.find((g) => g.id === selectedGuestId);
  const selectedGuestBookings = selectedGuest
    ? bookings.filter((b) => b.guestId === selectedGuest.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Guest Relations Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track loyal customers, manage blacklisted guests, and review historical stays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Listings Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guest name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Loyal', 'Blacklisted'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterType === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t === 'All' ? 'All Guests' : t === 'Loyal' ? 'VIP Loyal' : 'Blacklist'}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50 dark:divide-slate-800/40 max-h-[500px] overflow-y-auto">
            {filteredGuests.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGuestId(g.id)}
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  selectedGuestId === g.id
                    ? 'bg-indigo-50/20 dark:bg-indigo-950/25'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shrink-0">
                    {g.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{g.name}</h4>
                      {g.isLoyal && (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                          <Award className="w-2.5 h-2.5" />
                          <span>VIP</span>
                        </span>
                      )}
                      {g.isBlacklisted && (
                        <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                          <Ban className="w-2.5 h-2.5" />
                          <span>Banned</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{g.phone}</span>
                      </span>
                      {g.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{g.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLoyal(g.id, !g.isLoyal);
                    }}
                    className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      g.isLoyal
                        ? 'border-amber-200 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30'
                        : 'border-slate-200 text-slate-400 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    VIP
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBlacklist(g.id, !g.isBlacklisted);
                    }}
                    className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      g.isBlacklisted
                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30'
                        : 'border-slate-200 text-slate-400 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ban
                  </button>
                </div>
              </div>
            ))}
            {filteredGuests.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-12">No registered guests match filter.</p>
            )}
          </div>
        </div>

        {/* Guest History & Details */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
            <History className="w-4 h-4 text-indigo-600" />
            <span>Stay History</span>
          </h3>

          {selectedGuest ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm">{selectedGuest.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Nationality: {selectedGuest.nationality}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  ID: {selectedGuest.idType} - {selectedGuest.idNumber || 'None'}
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-50 dark:border-slate-800 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Previous & Active Stays</span>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                  {selectedGuestBookings.map((b) => (
                    <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {b.checkInDate} to {b.checkOutDate}
                        </p>
                        <span className="text-[10px] text-slate-400">{b.status}</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {currencySymbol}
                        {b.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {selectedGuestBookings.length === 0 && (
                    <p className="text-[11px] text-slate-400">No previous bookings registered.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">Select a guest from the directory to inspect history.</p>
          )}
        </div>
      </div>
    </div>
  );
}
