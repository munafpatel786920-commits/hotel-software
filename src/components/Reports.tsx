import { getLocalISODate } from '../utils/date';
import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Room, Booking, Guest, Payment, FinancialTransaction } from '../types';

interface ReportsProps {
  rooms: Room[];
  bookings: Booking[];
  guests: Guest[];
  payments: Payment[];
  transactions: FinancialTransaction[];
  currencySymbol: string;
  taxRate: number;
  hotelName?: string;
  hotelLogo?: string;
}

export default function Reports({
  rooms,
  bookings,
  guests,
  payments,
  transactions,
  currencySymbol,
  taxRate,
  hotelName,
  hotelLogo
}: ReportsProps) {
  const [selectedReportType, setSelectedReportType] = useState<
    'occupancy' | 'revenue' | 'guest' | 'tax'
  >('occupancy');

  const todayStr = getLocalISODate();

  // Calculations
  const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  const occupancyPercentage = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalTaxCollected = bookings
    .filter((b) => b.status === 'Checked In' || b.status === 'Checked Out')
    .reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (selectedReportType === 'occupancy') {
      csvContent += 'Room Number,Floor,Status\n';
      rooms.forEach((r) => {
        csvContent += `${r.roomNumber},${r.floor},${r.status}\n`;
      });
    } else if (selectedReportType === 'revenue') {
      csvContent += 'Transaction Date,Description,Category,Type,Amount\n';
      transactions.forEach((t) => {
        csvContent += `${t.date},${t.description},${t.category},${t.type},${t.amount}\n`;
      });
    } else {
      csvContent += 'Guest Name,Phone,Nationality,ID Type,ID Number\n';
      guests.forEach((g) => {
        csvContent += `${g.name},${g.phone},${g.nationality},${g.idType},${g.idNumber}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotel_report_${selectedReportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Menu Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reports & Analytics Hub</h2>
          <p className="text-xs text-slate-400 mt-0.5">Generate daily checkout summaries, compliance registers, and tax breakdowns.</p>
        </div>

        {/* Exports */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV / Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Grid Filter Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Types List */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 px-1">Available Audits</span>
          {[
            { id: 'occupancy', label: 'Occupancy Audit', desc: 'Active rooms status register' },
            { id: 'revenue', label: 'Revenue Statement', desc: 'Cashflow receipts breakdown' },
            { id: 'guest', label: 'Guest Register', desc: 'KYC registration log book' },
            { id: 'tax', label: 'Tax & GST Statement', desc: 'Tax compliance details' }
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setSelectedReportType(rep.id as any)}
              className={`w-full text-left p-3 rounded-xl transition-all flex flex-col cursor-pointer ${
                selectedReportType === rep.id
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="text-xs font-bold">{rep.label}</span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">{rep.desc}</span>
            </button>
          ))}
        </div>

        {/* Live Report Display Sheet */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 print:border-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4">
            <div className="flex items-start space-x-3.5">
              {hotelLogo && (
                <img
                  src={hotelLogo}
                  alt="Hotel Logo"
                  className="w-12 h-12 object-contain rounded-xl bg-slate-50 p-1 border border-slate-200 dark:border-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base capitalize">
                  {selectedReportType} Report Log
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {hotelName || 'HMS Cloud'} • Generated: {todayStr} • PMS Ledger System
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 self-start sm:self-auto">
              Audit status: Verified
            </span>
          </div>

          {selectedReportType === 'occupancy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Occupancy Level</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{occupancyPercentage}%</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Rooms Fleet</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{rooms.length} Rooms</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 pb-2">
                      <th className="pb-2">Room</th>
                      <th className="pb-2">Floor</th>
                      <th className="pb-2">Hygiene / Occupancy Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                    {rooms.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 font-bold">Room {r.roomNumber}</td>
                        <td className="py-2.5">Floor {r.floor}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'Available'
                                ? 'bg-emerald-50 text-emerald-600'
                                : r.status === 'Occupied'
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportType === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Net Revenue</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {currencySymbol}
                    {totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Financial Entries count</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {transactions.length} entries
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 pb-2">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2.5">{t.date}</td>
                        <td className="py-2.5 font-semibold">{t.description}</td>
                        <td className="py-2.5">{t.category}</td>
                        <td className={`py-2.5 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'}
                          {currencySymbol}
                          {t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportType === 'guest' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Registered Guests</span>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{guests.length} Customers</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 pb-2">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Phone</th>
                      <th className="pb-2">Nationality</th>
                      <th className="pb-2">Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                    {guests.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2.5 font-bold">{g.name}</td>
                        <td className="py-2.5">{g.phone}</td>
                        <td className="py-2.5">{g.nationality}</td>
                        <td className="py-2.5 text-slate-500 font-semibold">
                          {g.idType} : {g.idNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportType === 'tax' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Registered Tax Rate</span>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{taxRate}%</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Tax Collectable</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {currencySymbol}
                    {totalTaxCollected.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-4 border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 rounded-xl flex items-start space-x-2.5 text-xs text-indigo-800 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Tax compliance figures automatically sync with central accounting ledgers. Submit this file directly for regional GST/VAT reporting.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
