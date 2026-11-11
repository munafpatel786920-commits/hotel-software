import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Brush,
  Wrench,
  Ban
} from 'lucide-react';
import { Room, RoomType, RoomStatus } from '../types';

interface RoomsProps {
  rooms: Room[];
  roomTypes: RoomType[];
  hotelId: string;
  onAddRoom: (room: Omit<Room, 'id'>) => Promise<void>;
  onUpdateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Rooms({
  rooms,
  roomTypes,
  hotelId,
  onAddRoom,
  onUpdateRoomStatus,
  onDeleteRoom,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: RoomsProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery !== undefined ? propSetSearchQuery : setLocalSearchQuery;

  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState('1');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');

  // Get unique floors
  const floors = ['All', ...Array.from(new Set(rooms.map((r) => r.floor))).sort()];

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    const typeObj = roomTypes.find((t) => t.id === room.roomTypeId);
    const matchesSearch =
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFloor = selectedFloor === 'All' || room.floor === selectedFloor;
    const matchesStatus = selectedStatus === 'All' || room.status === selectedStatus;
    return matchesSearch && matchesFloor && matchesStatus;
  });

  const getStatusStyle = (status: RoomStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40';
      case 'Occupied':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40';
      case 'Reserved':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/40';
      case 'Cleaning':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/40';
      case 'Maintenance':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/40';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-700/50';
    }
  };

  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim() || !newRoomTypeId) {
      alert('Please fill out all fields');
      return;
    }

    try {
      await onAddRoom({
        roomNumber: newRoomNumber,
        floor: newFloor,
        roomTypeId: newRoomTypeId,
        status: 'Available',
        hotelId
      });
      setNewRoomNumber('');
      setNewFloor('1');
      setIsAddOpen(false);
      alert('Room created successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add room.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Room Fleet Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Configure individual hotel rooms, assign categories, and update cleaning statuses.</p>
        </div>
        <button
          onClick={() => {
            if (roomTypes.length === 0) {
              alert('Please create at least one room category in Hotel Setup first!');
              return;
            }
            if (!newRoomTypeId && roomTypes.length > 0) {
              setNewRoomTypeId(roomTypes[0].id);
            }
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-md cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Add Room Modal / Collapsible Form */}
      {isAddOpen && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-xl">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Register New Room</h3>
          <form onSubmit={handleAddRoomSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Room Number</label>
              <input
                type="text"
                placeholder="e.g. 101"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Floor</label>
              <input
                type="text"
                placeholder="e.g. 1"
                value={newFloor}
                onChange={(e) => setNewFloor(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Room Category</label>
              <select
                value={newRoomTypeId}
                onChange={(e) => setNewRoomTypeId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none text-slate-800 dark:text-slate-100"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end space-x-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
              >
                Register Room
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room number or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Floor filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              {floors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl === 'All' ? 'All Floors' : `Floor ${fl}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out of Service">Out of Service</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rooms Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredRooms.map((room) => {
          const typeObj = roomTypes.find((t) => t.id === room.roomTypeId);
          return (
            <div
              key={room.id}
              className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all relative group ${getStatusStyle(
                room.status
              )}`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-black tracking-tight leading-none">{room.roomNumber}</h4>
                  <span className="text-[9px] font-bold uppercase opacity-60">F{room.floor}</span>
                </div>
                <p className="text-[10px] font-medium opacity-85 mt-1 truncate max-w-[100px]">{typeObj?.name || 'Category'}</p>
              </div>

              <div className="mt-5 space-y-2">
                {/* Status Trigger Dropdown */}
                <select
                  value={room.status}
                  onChange={(e) => onUpdateRoomStatus(room.id, e.target.value as RoomStatus)}
                  className="w-full bg-white/60 dark:bg-slate-900/60 border border-transparent dark:border-slate-800 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Service">Out of Service</option>
                </select>

                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDeleteRoom(room.id)}
                    className="p-1 hover:bg-rose-50 rounded text-rose-600 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredRooms.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No rooms found matching your active filters. Add a room or adjust filters.
          </div>
        )}
      </div>
    </div>
  );
}
