import { getLocalISODate } from '../utils/date';
import React, { useState, useEffect } from 'react';
import {
  Users,
  LogIn,
  LogOut,
  Bed,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Bell,
  CheckCircle2,
  Brush,
  Wrench,
  Search,
  CalendarDays,
  Clock,
  Coffee,
  Sparkles,
  Trash,
  Plus,
  Check,
  ChevronDown,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Room, Booking, Guest, Payment, RoomType, RoomStatus, FinancialTransaction } from '../types';

interface DashboardProps {
  rooms: Room[];
  bookings: Booking[];
  guests: Guest[];
  payments: Payment[];
  roomTypes: RoomType[];
  currencySymbol: string;
  onUpdateRoomStatus?: (roomId: string, status: RoomStatus) => Promise<void>;
  transactions?: FinancialTransaction[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Dashboard({
  rooms,
  bookings,
  guests,
  payments,
  roomTypes,
  currencySymbol,
  onUpdateRoomStatus,
  transactions,
  searchQuery = '',
  setSearchQuery
}: DashboardProps) {
  const todayStr = getLocalISODate();

  // Live Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Front Desk Checklist State
  const defaultTasks = [
    { id: 'task-1', text: 'Morning guest check-out review & key card audit', completed: false },
    { id: 'task-2', text: 'Match payment receipts with accounting records', completed: false },
    { id: 'task-3', text: 'Assign dirty rooms to housekeeping queues', completed: false },
    { id: 'task-4', text: 'Verify guest IDs for today\'s scheduled check-ins', completed: false },
    { id: 'task-5', text: 'Complete guest feedback logs for yesterday\'s check-outs', completed: false },
    { id: 'task-6', text: 'Audit high priority or pending low-stock inventory reports', completed: false }
  ];

  const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem('pms_frontdesk_tasks');
    return saved ? JSON.parse(saved) : defaultTasks;
  });

  const [newTaskText, setNewTaskText] = useState('');

  const saveTasks = (newTasks: typeof tasks) => {
    setTasks(newTasks);
    localStorage.setItem('pms_frontdesk_tasks', JSON.stringify(newTasks));
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false
    };
    saveTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const handleDeleteTask = (id: string) => {
    const filtered = tasks.filter((t) => t.id !== id);
    saveTasks(filtered);
  };

  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'Good morning! Wishing you an efficient front-desk shift today.';
    if (hours < 18) return 'Good afternoon! Keep up the hospitality excellence.';
    return 'Good evening! Have a peaceful and secure night shift.';
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // State to track which room's status dropdown is currently open
  const [activeRoomIdDropdown, setActiveRoomIdDropdown] = useState<string | null>(null);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState<Room | null>(null);

  // Calculations
  const checkinsToday = bookings.filter((b) => b.checkInDate === todayStr && b.status !== 'Cancelled');
  const checkoutsToday = bookings.filter((b) => {
    const isScheduledToday = b.checkOutDate === todayStr && b.status !== 'Cancelled';
    const checkedOutToday = b.status === 'Checked Out' && payments?.some(p => p.bookingId === b.id && p.paymentDate === todayStr);
    return isScheduledToday || checkedOutToday;
  });
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied');
  const availableRooms = rooms.filter((r) => r.status === 'Available');

  // Revenue totals (using financial ledger transactions if available, otherwise falling back to payments)
  const totalRevenue = transactions && transactions.length > 0
    ? transactions.filter((t) => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0)
    : payments.reduce((acc, curr) => acc + curr.amount, 0);

  // Pending payments (sum of totalAmount - paidAmount for Checked In or Reserved bookings)
  const pendingPayments = bookings
    .filter((b) => b.status === 'Checked In' || b.status === 'Reserved')
    .reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);

  // Room Status Distributions
  const statusCounts = rooms.reduce(
    (acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    },
    {} as { [key: string]: number }
  );

  const roomStatusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = {
    Available: '#10B981', // Emerald
    Occupied: '#2563EB', // Blue
    Reserved: '#3B82F6', // light blue
    Cleaning: '#F59E0B', // Amber
    Maintenance: '#EF4444', // Red
    'Out of Service': '#6B7280' // Gray
  };

  // Occupancy rate
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0;

  // Chart Data: Monthly Revenue Trend
  const monthsList = [
    { key: '01', name: 'Jan' },
    { key: '02', name: 'Feb' },
    { key: '03', name: 'Mar' },
    { key: '04', name: 'Apr' },
    { key: '05', name: 'May' },
    { key: '06', name: 'Jun' },
    { key: '07', name: 'Jul' },
    { key: '08', name: 'Aug' },
    { key: '09', name: 'Sep' },
    { key: '10', name: 'Oct' },
    { key: '11', name: 'Nov' },
    { key: '12', name: 'Dec' }
  ];

   const monthlyRevenueMap: { [key: string]: number } = {
    '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0, '07': 0, '08': 0, '09': 0, '10': 0, '11': 0, '12': 0
  };

  if (transactions && transactions.length > 0) {
    transactions.forEach((tx) => {
      if (tx.type === 'income' && tx.date) {
        const parts = tx.date.split('-');
        if (parts.length >= 2) {
          const monthKey = parts[1]; // e.g. '07' for July
          if (monthlyRevenueMap[monthKey] !== undefined) {
            monthlyRevenueMap[monthKey] += tx.amount;
          }
        }
      }
    });
  } else {
    payments.forEach((payment) => {
      if (payment.paymentDate) {
        const parts = payment.paymentDate.split('-');
        if (parts.length >= 2) {
          const monthKey = parts[1]; // e.g. '07' for July
          if (monthlyRevenueMap[monthKey] !== undefined) {
            monthlyRevenueMap[monthKey] += payment.amount;
          }
        }
      }
    });
  }

  const monthlyRevenueData = monthsList.map((m) => ({
    name: m.name,
    Revenue: monthlyRevenueMap[m.key]
  }));

  // Room Type Distribution Chart
  const roomTypeDistribution = roomTypes.map((rt) => {
    const roomsCount = rooms.filter((r) => r.roomTypeId === rt.id).length;
    return {
      name: rt.name,
      Rooms: roomsCount
    };
  });

  return (
    <div className="space-y-6">
      {/* Live Hotel Clock & Greeter Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-white p-6 rounded-2xl border border-indigo-100 dark:border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-400/10 dark:bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 bg-purple-400/10 dark:bg-slate-800/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-white/15 backdrop-blur-md rounded-lg flex items-center justify-center">
                <Coffee className="w-4 h-4 text-amber-300 animate-pulse" />
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-100 dark:text-indigo-300 bg-white/10 dark:bg-slate-800/60 px-2.5 py-0.5 rounded-full">Front Desk Shift Active</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{getGreeting()}</h2>
            <p className="text-xs text-indigo-100/80 dark:text-slate-300/80 max-w-xl">
              Welcome back. You have complete operational authority over room assignments, restaurant invoicing, and general housekeeping updates.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-white/10 dark:bg-slate-950/40 backdrop-blur-md p-4 rounded-xl border border-white/10 dark:border-slate-800 self-start md:self-auto shrink-0 shadow-sm">
            <Clock className="w-8 h-8 text-indigo-200 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-indigo-200 dark:text-slate-400 tracking-wider block">Hotel Local Time</span>
              <span className="text-xl font-mono font-bold tracking-wider block text-white tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <span className="text-[10px] text-indigo-200/80 dark:text-slate-400/80 block font-medium">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Occupancy Rate Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Occupancy Rate</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{occupancyRate}%</h3>
            <span className="text-xs text-emerald-600 font-medium block mt-1.5">
              {occupiedRooms.length} of {rooms.length} rooms filled
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Bed className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Revenue</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {currencySymbol}
              {totalRevenue.toLocaleString()}
            </h3>
            <span className="text-xs text-emerald-600 font-medium block mt-1.5">All services included</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Check-ins */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Check-ins Today</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{checkinsToday.length}</h3>
            <span className="text-xs text-blue-600 font-medium block mt-1.5">Walk-ins & Adv reservations</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        {/* Check-outs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Check-outs Today</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{checkoutsToday.length}</h3>
            <span className="text-xs text-rose-600 font-medium block mt-1.5">Departures scheduled</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <LogOut className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Performance Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Revenue Performance</h4>
              <p className="text-xs text-slate-400">Monthly financial summary trend analysis</p>
            </div>
            <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% MoM</span>
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Status Breakdown Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Room Occupancy Breakdown</h4>
          <p className="text-xs text-slate-400 mb-6">Current breakdown of room statuses</p>
          <div className="h-[210px] flex items-center justify-center">
            {roomStatusData.length === 0 ? (
              <p className="text-xs text-slate-400">No rooms set up yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {roomStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {Object.keys(COLORS).map((status) => (
              <div key={status} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[status as keyof typeof COLORS] }} />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {status} ({statusCounts[status] || 0})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Type Inventory Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Room Category Distribution</h4>
          <p className="text-xs text-slate-400 mb-6">Total inventory capacity per category</p>
          <div className="h-[240px]">
            {roomTypeDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <span className="text-xs text-slate-400">No categories config</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomTypeDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="Rooms" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Receptionist Agenda / Recent Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Recent Booking Registrations</h4>
          <p className="text-xs text-slate-400 mb-4">Latest bookings submitted into PMS database</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-3 pl-2">Guest Name</th>
                  <th className="pb-3">Stay Dates</th>
                  <th className="pb-3">Room Assigned</th>
                  <th className="pb-3 text-right pr-2">Amount Due</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {(() => {
                  const query = searchQuery.toLowerCase().trim();
                  const filteredBookings = bookings.filter((b) => {
                    if (!query) return true;
                    const guestObj = guests.find((g) => g.id === b.guestId);
                    const roomObj = rooms.find((r) => r.id === b.roomId);
                    const typeObj = roomTypes.find((t) => t.id === b.roomTypeId);
                    return (
                      (guestObj?.name || '').toLowerCase().includes(query) ||
                      (guestObj?.phone || '').includes(query) ||
                      (roomObj?.roomNumber || '').toLowerCase().includes(query) ||
                      (typeObj?.name || '').toLowerCase().includes(query) ||
                      b.status.toLowerCase().includes(query)
                    );
                  });

                  if (filteredBookings.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-slate-400 font-medium">
                          {query ? `No bookings match "${searchQuery}"` : "No bookings added to the system yet."}
                        </td>
                      </tr>
                    );
                  }

                  return filteredBookings.slice(0, 4).map((b) => {
                    const guestObj = guests.find((g) => g.id === b.guestId);
                    const roomObj = rooms.find((r) => r.id === b.roomId);
                    const typeObj = roomTypes.find((t) => t.id === b.roomTypeId);
                    return (
                      <tr key={b.id} className="text-xs text-slate-700 dark:text-slate-300">
                        <td className="py-3 pl-2 font-medium">{guestObj?.name || 'Guest Details'}</td>
                        <td className="py-3">
                          {b.checkInDate} to {b.checkOutDate}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold">{roomObj?.roomNumber || 'Pending'}</span>{' '}
                          <span className="text-[10px] text-slate-400">({typeObj?.name})</span>
                        </td>
                        <td className="py-3 text-right pr-2 font-semibold">
                          {currencySymbol}
                          {(b.totalAmount - b.paidAmount).toLocaleString()}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Checked In'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                : b.status === 'Reserved'
                                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Front Desk Operational Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Front Desk Tasks Checklist */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Shift Operations Checklist</span>
              </h4>
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                {progressPercent}% Done
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Daily tasks for reception and administrative staff</p>

            {/* Checklist Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-5 overflow-hidden">
              <div 
                className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`flex items-start justify-between p-2.5 rounded-xl border transition ${
                    task.completed 
                      ? 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 line-through' 
                      : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>{task.text}</span>
                  </label>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-0.5 rounded transition"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-6">All tasks cleared! Add custom ones below.</p>
              )}
            </div>
          </div>

          {/* Add custom task form */}
          <form onSubmit={handleAddTask} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
            <input
              type="text"
              placeholder="Add urgent shift memo..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white p-2 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Live Interactive Room Controller Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Live Room Status Controller</span>
            </h4>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full font-semibold">
              Instant Updates
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">Click any room to instantly toggle status or send to cleaning/maintenance</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto max-h-[300px] pr-1">
            {(() => {
              const query = searchQuery.toLowerCase().trim();
              const filteredRooms = rooms.filter((room) => {
                if (!query) return true;
                const rType = roomTypes.find((t) => t.id === room.roomTypeId);
                const activeBooking = bookings.find(
                  (b) => b.roomId === room.id && (b.status === 'Checked In' || b.status === 'Reserved')
                );
                const activeGuest = activeBooking ? guests.find((g) => g.id === activeBooking.guestId) : null;

                return (
                  room.roomNumber.toLowerCase().includes(query) ||
                  room.status.toLowerCase().includes(query) ||
                  (rType?.name || '').toLowerCase().includes(query) ||
                  (activeGuest?.name || '').toLowerCase().includes(query) ||
                  (activeGuest?.phone || '').includes(query)
                );
              });

              if (filteredRooms.length === 0) {
                return (
                  <div className="col-span-full py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No rooms or guests match "{searchQuery}"
                  </div>
                );
              }

              return filteredRooms.map((room) => {
                const rType = roomTypes.find((t) => t.id === room.roomTypeId);
                
                // Status Styling details
                const getBgStyle = (status: RoomStatus) => {
                  switch (status) {
                    case 'Available':
                      return 'bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300';
                    case 'Occupied':
                      return 'bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/10 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300';
                    case 'Reserved':
                      return 'bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300';
                    case 'Cleaning':
                      return 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 animate-pulse';
                    case 'Maintenance':
                      return 'bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300';
                    default:
                      return 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                  }
                };

                return (
                  <button 
                    key={room.id}
                    type="button"
                    className={`relative p-2.5 rounded-xl border text-center transition flex flex-col justify-between min-h-[85px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${getBgStyle(room.status)}`}
                    onClick={() => setSelectedRoomForStatus(room)}
                  >
                    <div>
                      <span className="block text-xs font-bold leading-none">{room.roomNumber}</span>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full">
                        {rType?.name || 'Standard'}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/60 dark:bg-black/20">
                        {room.status}
                      </span>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* GUEST & ROOM STATUS CONTROLLER MODAL */}
      {selectedRoomForStatus && (() => {
        const room = selectedRoomForStatus;
        const rType = roomTypes.find((t) => t.id === room.roomTypeId);
        
        // Find if there is an active reservation / check-in for this room
        const activeBooking = bookings.find(
          (b) => b.roomId === room.id && (b.status === 'Checked In' || b.status === 'Reserved')
        );
        const activeGuest = activeBooking ? guests.find((g) => g.id === activeBooking.guestId) : null;

        const statuses: RoomStatus[] = ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance', 'Out of Service'];

        // Helper to get color/class for the modal status badge
        const getStatusBadge = (status: RoomStatus) => {
          switch (status) {
            case 'Available':
              return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
            case 'Occupied':
              return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
            case 'Reserved':
              return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400';
            case 'Cleaning':
              return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
            case 'Maintenance':
              return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400';
            default:
              return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
              <button
                type="button"
                onClick={() => setSelectedRoomForStatus(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="p-2 bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Room Status Controller</h3>
                  <p className="text-[10px] text-slate-400">Manage status and view details of Room {room.roomNumber}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Room General Info */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Room Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{room.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Category</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{rType?.name || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Current Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(room.status)}`}>
                      {room.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Base Rate</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {currencySymbol}{rType?.basePrice || 100} / Night
                    </span>
                  </div>
                </div>

                {/* Active Guest / Booking Info */}
                {activeBooking ? (
                  <div className="border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 rounded-xl space-y-2">
                    <span className="text-[9px] uppercase font-bold text-indigo-500 block">
                      {activeBooking.status === 'Checked In' ? 'Active Guest Details (Checked In)' : 'Upcoming Reservation Details'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[8px] text-slate-400 block">Guest Name</span>
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                          {activeGuest?.name || 'Guest Details Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block">Phone</span>
                        <span className="font-semibold text-[10px]">
                          {activeGuest?.phone || 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between pt-1 border-t border-indigo-100/30 text-[10px]">
                        <div>
                          <span className="text-[8px] text-slate-400 block">Check-In</span>
                          <span className="font-medium">{activeBooking.checkInDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-400 block">Check-Out</span>
                          <span className="font-medium">{activeBooking.checkOutDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center rounded-xl text-slate-400 text-[10px]">
                    No active occupant or upcoming reservation for this room right now.
                  </div>
                )}

                {/* Status Selection Buttons */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Update Room Status
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {statuses.map((st) => {
                      const getStatusColor = (status: RoomStatus, isCurrent: boolean) => {
                        if (isCurrent) return 'ring-2 ring-indigo-600 dark:ring-indigo-500 bg-slate-100 dark:bg-slate-800 font-extrabold';
                        switch (status) {
                          case 'Available':
                            return 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
                          case 'Occupied':
                            return 'hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30';
                          case 'Reserved':
                            return 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30';
                          case 'Cleaning':
                            return 'hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30';
                          case 'Maintenance':
                            return 'hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30';
                          default:
                            return 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/60';
                        }
                      };

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            onUpdateRoomStatus?.(room.id, st);
                            setSelectedRoomForStatus(null);
                          }}
                          className={`py-2 px-3 rounded-xl font-bold text-center transition cursor-pointer text-[11px] flex items-center justify-between ${getStatusColor(st, room.status === st)}`}
                        >
                          <span>{st}</span>
                          {room.status === st && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRoomForStatus(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  Close Controller
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
