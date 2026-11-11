import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Search,
  Bell,
  Globe,
  User,
  Check,
  AlertTriangle,
  Calendar,
  CreditCard,
  CheckCircle2,
  X
} from 'lucide-react';
import { LANGUAGES, getTranslation } from '../translations';
import { SystemNotification } from '../types';

interface HeaderProps {
  lang: string;
  setLang: (lang: string) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userName: string;
  notifications: SystemNotification[];
  markNotificationRead: (id: string) => void;
}

export default function Header({
  lang,
  setLang,
  darkMode,
  setDarkMode,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery,
  userName,
  notifications,
  markNotificationRead
}: HeaderProps) {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const parseNotificationDate = (createdAt: any): Date => {
    if (!createdAt) return new Date();
    if (createdAt instanceof Date) return createdAt;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate();
    if (typeof createdAt === 'object' && createdAt.seconds !== undefined) {
      return new Date(createdAt.seconds * 1000);
    }
    const parsed = new Date(createdAt);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <header
      id="header-container"
      className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-30"
    >
      {/* Search and Toggle Hamburger */}
      <div className="flex items-center space-x-4 flex-1">
        <button
          id="hamburger-toggle-btn"
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        {/* Region & Online Badges */}
        <div className="hidden lg:flex items-center space-x-2">
          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">Multi-Region</span>
          <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded uppercase tracking-wider">Online</span>
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            id="lang-dropdown-trigger"
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-[18px] h-[18px]" />
            <span className="text-xs font-semibold uppercase">{lang}</span>
          </button>
          {isLangDropdownOpen && (
            <div
              id="lang-dropdown-menu"
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5"
            >
              {LANGUAGES.map((l) => (
                <button
                  id={`lang-select-${l.code}`}
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setIsLangDropdownOpen(false);
                    // Update document direction for RTL support (Arabic)
                    document.documentElement.dir = l.dir;
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between cursor-pointer"
                >
                  <span>{l.label}</span>
                  {lang === l.code && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            id="notifications-dropdown-trigger"
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors relative cursor-pointer"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          {isNotifDropdownOpen && (
            <div
              id="notifications-dropdown-menu"
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No recent notifications</div>
                ) : (
                  [...notifications]
                    .sort((a, b) => parseNotificationDate(b.createdAt).getTime() - parseNotificationDate(a.createdAt).getTime())
                    .map((notif) => (
                      <div
                        id={`notification-item-${notif.id}`}
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 ${
                          !notif.isRead ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                      <div className="flex items-start space-x-2.5">
                        <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                        <div className="flex-1">
                          <p className={`text-xs font-semibold text-slate-800 dark:text-slate-100 ${!notif.isRead ? 'font-bold' : ''}`}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {parseNotificationDate(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center space-x-2 border-l border-slate-100 dark:border-slate-800 pl-3.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <User className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[80px] truncate">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
