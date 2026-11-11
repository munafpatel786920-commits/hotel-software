import React from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  Building2,
  BedDouble,
  Brush,
  Users,
  Utensils,
  Package,
  UserCheck,
  Calculator,
  BarChart3,
  LogOut,
  Menu,
  X,
  CreditCard,
  Shield
} from 'lucide-react';
import { UserRole } from '../types';
import { getTranslation } from '../translations';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: string;
  userRole: UserRole;
  hotelName: string;
  hotelLogo?: string;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  lang,
  userRole,
  hotelName,
  hotelLogo,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen
}: SidebarProps) {
  const menuItems = [
    { id: 'superadmin', label: 'Super Admin Panel', icon: Shield, roles: ['System Owner'] },
    { id: 'dashboard', label: getTranslation(lang, 'dashboard'), icon: LayoutDashboard, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist', 'Accountant'] },
    { id: 'reservations', label: getTranslation(lang, 'reservations'), icon: CalendarRange, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist'] },
    { id: 'checkout', label: getTranslation(lang, 'checkOut'), icon: CreditCard, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist', 'Accountant'] },
    { id: 'rooms', label: getTranslation(lang, 'roomManagement'), icon: BedDouble, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist', 'Housekeeping Staff'] },
    { id: 'housekeeping', label: getTranslation(lang, 'housekeeping'), icon: Brush, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Housekeeping Staff', 'Receptionist'] },
    { id: 'customers', label: getTranslation(lang, 'customers'), icon: Users, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist'] },
    { id: 'restaurant', label: getTranslation(lang, 'restaurant'), icon: Utensils, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Receptionist'] },
    { id: 'inventory', label: getTranslation(lang, 'inventory'), icon: Package, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager'] },
    { id: 'employees', label: getTranslation(lang, 'employees'), icon: UserCheck, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager'] },
    { id: 'accounting', label: getTranslation(lang, 'accounting'), icon: Calculator, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Accountant'] },
    { id: 'reports', label: getTranslation(lang, 'reports'), icon: BarChart3, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager', 'Accountant'] },
    { id: 'setup', label: getTranslation(lang, 'hotelSetup'), icon: Building2, roles: ['Super Admin', 'System Owner', 'Hotel Admin', 'Manager'] }
  ];

  // Filter items based on user role permissions
  const allowedMenuItems = menuItems.filter((item) => {
    if (userRole === 'System Owner') {
      return item.id === 'superadmin';
    }
    return item.roles.includes(userRole) && item.id !== 'superadmin';
  });

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
         id="sidebar-container"
         className={`fixed inset-y-0 left-0 lg:static z-50 flex flex-col w-64 bg-[#fafafb]/95 text-slate-700 border-r border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800/60 transition-transform duration-300 transform lg:translate-x-0 ${
           isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
         }`}
       >
         {/* Brand Header */}
         <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center space-x-3">
            {hotelLogo ? (
              <img
                src={hotelLogo}
                alt="Hotel Logo"
                className="w-8 h-8 object-contain rounded bg-slate-50 p-0.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg">
                {hotelName?.[0] || 'H'}
              </div>
            )}
            <div>
              <h1 className="font-sans font-bold text-slate-900 dark:text-white leading-tight tracking-tight text-sm truncate max-w-[140px]">
                {hotelName || 'HMS Cloud'}
              </h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                {userRole}
              </span>
            </div>
          </div>
          <button
            id="sidebar-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {allowedMenuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                id={`sidebar-item-${item.id}`}
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-600 dark:bg-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-transparent'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-white'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Info / Logout Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/60">
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              <span>Log Out</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
