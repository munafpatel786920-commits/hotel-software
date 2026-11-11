import React, { useState } from 'react';
import {
  Brush,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Room, Employee, RoomStatus } from '../types';

interface HousekeepingProps {
  rooms: Room[];
  employees: Employee[];
  onUpdateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  onAssignStaff: (roomId: string, staffId: string) => Promise<void>;
}

export default function Housekeeping({
  rooms,
  employees,
  onUpdateRoomStatus,
  onAssignStaff
}: HousekeepingProps) {
  const [filter, setFilter] = useState<'All' | 'Dirty' | 'Maintenance' | 'Clean'>('All');

  // Filter employees with Housekeeping Staff role
  const cleaners = employees.filter(
    (emp) => emp.role === 'Housekeeping Staff' || emp.department?.toLowerCase().includes('house')
  );

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'All') return true;
    if (filter === 'Dirty') return r.status === 'Cleaning';
    if (filter === 'Maintenance') return r.status === 'Maintenance';
    if (filter === 'Clean') return r.status === 'Available';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Housekeeping Control Desk</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track real-time room hygiene, schedule staff operations, and verify room readiness.</p>
        </div>

        {/* Quick Tabs */}
        <div className="flex gap-2">
          {['All', 'Dirty', 'Clean', 'Maintenance'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {t === 'All' ? 'All Rooms' : t === 'Dirty' ? 'Needs Cleaning' : t === 'Clean' ? 'Available Clean' : 'Maintenance'}
            </button>
          ))}
        </div>
      </div>

      {/* Housekeeping Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRooms.map((room) => {
          const assignedCleaner = cleaners.find((c) => c.id === room.assignedStaffId);
          return (
            <div
              key={room.id}
              className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-4 flex flex-col justify-between ${
                room.status === 'Cleaning'
                  ? 'border-amber-200 dark:border-amber-900/40'
                  : room.status === 'Available'
                  ? 'border-slate-100 dark:border-slate-800'
                  : 'border-rose-200 dark:border-rose-900/40'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 block">
                      Floor {room.floor}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">Room {room.roomNumber}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      room.status === 'Available'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                        : room.status === 'Cleaning'
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                        : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                {/* Cleaner Assignment details */}
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Attendant</span>
                    </span>
                    <select
                      value={room.assignedStaffId || ''}
                      onChange={(e) => onAssignStaff(room.id, e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none max-w-[130px] font-semibold"
                    >
                      <option value="">-- Unassigned --</option>
                      {cleaners.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Action buttons */}
              <div className="flex space-x-2 pt-2">
                {room.status === 'Cleaning' ? (
                  <button
                    onClick={() => onUpdateRoomStatus(room.id, 'Available')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Clean & Ready</span>
                  </button>
                ) : room.status === 'Available' ? (
                  <button
                    onClick={() => onUpdateRoomStatus(room.id, 'Cleaning')}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Brush className="w-4 h-4" />
                    <span>Send for Cleaning</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdateRoomStatus(room.id, 'Available')}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolve Maintenance</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
  );
}
