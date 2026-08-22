import React from 'react';
import { Award, Bell, Moon, ShieldAlert, Sun, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenProfile: () => void;
  activeTab: string;
  onSelectTab: (tab: 'home' | 'notifications') => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  onOpenProfile,
  activeTab,
  onSelectTab,
  unreadNotificationsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onSelectTab('home')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-zinc-900 dark:text-white tracking-tight text-base leading-none">
                Arka <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Portal</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                LIVE
              </span>
              {user.role === 'admin' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 hidden sm:block">
              {user.role === 'admin' ? 'Municipal Incident Administrator' : 'Citizen Incident Report'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Trust Score Badge Button */}
          <button
            onClick={onOpenProfile}
            id="header-trust-score-btn"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all active:scale-95"
            title="View Trust Score & Reputation"
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{user.trustScore}</span>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 hidden xs:inline">
              Trust
            </span>
          </button>

          {/* Bell Icon Notification Button */}
          <button
            onClick={() => onSelectTab(activeTab === 'notifications' ? 'home' : 'notifications')}
            id="header-notifications-btn"
            className={`relative p-2 rounded-full transition-colors ${
              activeTab === 'notifications'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Community Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            id="header-theme-toggle-btn"
            className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={onOpenProfile}
            id="header-profile-avatar-btn"
            className="p-0.5 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700 hover:ring-orange-500 dark:hover:ring-orange-500 transition-all active:scale-95"
            title="View Account Profile"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
