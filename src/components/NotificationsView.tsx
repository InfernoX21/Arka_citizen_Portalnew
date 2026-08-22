import React, { useState } from 'react';
import {
  Award,
  Bell,
  CheckCircle2,
  CheckCheck,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatRelativeTime } from '../lib/storage';
import { NotificationItem } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (incidentId?: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'resolved' | 'nearby'>('all');

  const filtered = notifications.filter((item) => {
    if (filterType === 'verified') return item.type === 'verified';
    if (filterType === 'resolved') return item.type === 'resolved';
    if (filterType === 'nearby') return item.type === 'nearby_incident';
    return true;
  });

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <span>Community Notifications</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time updates on your reports, verifications, and nearby public hazards
          </p>
        </div>

        <button
          onClick={onMarkAllAsRead}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Mark All Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => setFilterType('verified')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'verified'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Verifications
        </button>
        <button
          onClick={() => setFilterType('resolved')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'resolved'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Resolutions
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-zinc-400">
            <Bell className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-medium">No notifications in this tab</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onNotificationClick(item.incidentId)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                item.isRead
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                  : 'bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/30'
              }`}
            >
              {/* Icon / Actor Avatar */}
              <div className="relative shrink-0">
                {item.actor?.avatar ? (
                  <img
                    src={item.actor.avatar}
                    alt={item.actor.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                {item.trustDelta && item.trustDelta > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[9px] font-extrabold px-1 py-0.2 rounded-full border border-white">
                    +{item.trustDelta}
                  </span>
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-normal">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
