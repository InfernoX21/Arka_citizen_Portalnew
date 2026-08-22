import React, { useState } from 'react';
import {
  Award,
  LogOut,
  Bookmark,
  CheckCircle2,
  FileText,
  Globe,
  Mail,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuthMethod, IncidentReport, UserProfile } from '../types';

interface UserProfileModalProps {
  user: UserProfile;
  userReports: IncidentReport[];
  savedReports: IncidentReport[];
  onClose: () => void;
  onUpdateAuthMethod: (method: AuthMethod) => void;
  onOpenDetail: (incident: IncidentReport) => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  userReports,
  savedReports,
  onClose,
  onUpdateAuthMethod,
  onOpenDetail,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'my_reports' | 'saved'>('profile');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Citizen Profile & Reputation
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Trust Profile
          </button>
          <button
            onClick={() => setActiveTab('my_reports')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'my_reports'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            My Reports ({userReports.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Saved ({savedReports.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* User Avatar & Trust Header */}
              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-orange-500/20"
                />
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user.role === 'admin'
                      ? 'Official: Municipal Incident Administrator'
                      : `Joined ${user.joinDate} • ${user.location?.city || 'Citizen'}`}
                  </p>

                  <div className="flex items-center space-x-2 pt-1">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{user.trustScore} Trust Score</span>
                    </span>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        OFFICIAL
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-0.5">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {user.totalReports}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">
                    Total Submitted
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 space-y-0.5 border border-emerald-500/20">
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {user.verifiedCount}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 uppercase">
                    Verified Reports
                  </div>
                </div>
              </div>

              {/* Badges unlocked */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Earned Badges
                </h4>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((b, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center space-x-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{b}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Authentication Switcher */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Authentication Method
                  </h4>
                  <p className="text-xs text-slate-500">
                    Switch demo authentication mode (Google, Email)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateAuthMethod('google')}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 border transition-all ${
                      user.authMethod === 'google'
                        ? 'bg-white dark:bg-slate-900 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Google</span>
                  </button>

                  <button
                    onClick={() => onUpdateAuthMethod('email')}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 border transition-all ${
                      user.authMethod === 'email'
                        ? 'bg-white dark:bg-slate-900 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my_reports' && (
            <div className="space-y-2">
              {userReports.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  You haven't submitted any reports yet. Press the "+" button to report a public incident!
                </p>
              ) : (
                userReports.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => {
                      onOpenDetail(inc);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-orange-500 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span>{inc.aiTitle}</span>
                      <span className="text-[10px] text-orange-500">{inc.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{inc.userDescription}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-2">
              {savedReports.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No saved reports. Bookmark incidents from the feed to view them here.
                </p>
              ) : (
                savedReports.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => {
                      onOpenDetail(inc);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-orange-500 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span>{inc.aiTitle}</span>
                      <span className="text-[10px] text-orange-500">{inc.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{inc.userDescription}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        {onLogout && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              id="profile-logout-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-sm border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
