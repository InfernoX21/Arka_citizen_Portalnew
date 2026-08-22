import React from 'react';
import { Bell, Home, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'notifications';
  onSelectTab: (tab: 'home' | 'notifications') => void;
  onOpenReportModal: () => void;
  unreadNotificationsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenReportModal,
  unreadNotificationsCount,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800/80 pb-safe">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home Feed */}
        <button
          onClick={() => onSelectTab('home')}
          id="nav-home-tab"
          className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'home'
              ? 'text-orange-600 dark:text-orange-400 font-semibold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] leading-none">Live Feed</span>
        </button>

        {/* Floating Report Button (+) */}
        <div className="relative -top-6">
          <button
            onClick={onOpenReportModal}
            id="nav-report-fab-btn"
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-white dark:border-zinc-950 group"
            title="Report New Incident"
          >
            <Plus className="w-8 h-8 stroke-[2.75] group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Tab 3: Notifications */}
        <button
          onClick={() => onSelectTab('notifications')}
          id="nav-notifications-tab"
          className={`flex flex-col items-center justify-center space-y-1 transition-colors relative ${
            activeTab === 'notifications'
              ? 'text-orange-600 dark:text-orange-400 font-semibold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-950 animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-none">Notifications</span>
        </button>
      </div>
    </div>
  );
};
