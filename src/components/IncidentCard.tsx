import React, { useState } from 'react';
import {
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORIES } from '../data/categories';
import { formatRelativeTime } from '../lib/storage';
import { IncidentReport } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface IncidentCardProps {
  incident: IncidentReport;
  currentUserId: string;
  onUpvote: (id: string) => void;
  onDownvote: (id: string) => void;
  onToggleSave: (id: string) => void;
  onOpenDetail: (incident: IncidentReport) => void;
  onShare: (incident: IncidentReport) => void;
  onDelete?: (id: string) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  currentUserId,
  onUpvote,
  onDownvote,
  onToggleSave,
  onOpenDetail,
  onShare,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const categoryMeta = CATEGORIES[incident.category] || CATEGORIES['Other'];
  const hasUpvoted = incident.upvotes.includes(currentUserId);
  const hasDownvoted = incident.downvotes.includes(currentUserId);

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all mb-4 group"
    >
      {/* 1. Header: Reporter info, Trust score, Relative Time, Status badge */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center space-x-2.5">
          <img
            src={incident.reporter.avatar}
            alt={incident.reporter.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                {incident.reporter.name}
              </span>
              <span className="inline-flex items-center space-x-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                <Award className="w-2.5 h-2.5" />
                <span>{incident.reporter.trustScore}</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">
              {formatRelativeTime(incident.createdAt)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {incident.status === 'Active' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </span>
          )}
          {incident.status === 'Under Review' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-3 h-3" />
              <span>Under Review</span>
            </span>
          )}
          {incident.status === 'Resolved' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Resolved</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="p-3.5 pt-3 space-y-2.5">
        {/* Category & Severity Row */}
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${categoryMeta.bgColor} ${categoryMeta.textColor} ${categoryMeta.borderColor}`}
          >
            <CategoryIcon category={incident.category} className="w-3.5 h-3.5" />
            <span>{incident.category}</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Photo–Title Match Badge */}
            <span
              title={incident.photoTitleExplanation || 'Photo–Title Relevance Score'}
              className={`inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 70
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20'
                  : (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 40
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20'
                  : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Photo–Title Match: {incident.photoTitleMatchScore ?? incident.aiConfidence}%</span>
            </span>

            {/* Severity Pill */}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                incident.severity === 'Critical'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : incident.severity === 'High'
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {incident.severity}
            </span>
          </div>
        </div>

        {/* AI Generated Standardized Title */}
        <h3
          onClick={() => onOpenDetail(incident)}
          className="text-base font-bold text-zinc-900 dark:text-white leading-snug hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
        >
          {incident.aiTitle}
        </h3>

        {/* User Written Description */}
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
          {incident.userDescription}
        </p>

        {/* Landmark / LocationTag */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
          <div className="flex items-center space-x-1 truncate max-w-[70%]">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate font-medium">{incident.locationName}</span>
          </div>

          {/* Multiple citizen report count indicator */}
          {incident.duplicateCount > 1 && (
            <div className="flex items-center space-x-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              <Users className="w-3 h-3" />
              <span>Reported by {incident.duplicateCount} citizens</span>
            </div>
          )}
        </div>

        {/* Photo Container */}
        {incident.photoUrl && (
          <div
            onClick={() => onOpenDetail(incident)}
            className="relative rounded-xl overflow-hidden bg-zinc-950 aspect-[16/9] cursor-pointer group/photo mt-2"
          >
            <img
              src={incident.photoUrl}
              alt={incident.aiTitle}
              className="w-full h-full object-cover group-hover/photo:scale-102 transition-transform duration-300"
              loading="lazy"
            />
            {incident.exif?.deviceInfo && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-zinc-900/80 backdrop-blur-md text-[10px] font-medium text-zinc-200 border border-white/10 flex items-center space-x-1">
                <span>📷 {incident.exif.deviceInfo}</span>
                {incident.exif.hasGpsData && <span className="text-emerald-400">• GPS Tagged</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Action Footer: Upvote, Downvote, Comment, Share, Save */}
      <div className="px-3.5 py-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        {/* Verification Voting Block */}
        <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
          <button
            onClick={() => onUpvote(incident.id)}
            id={`upvote-btn-${incident.id}`}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              hasUpvoted
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
            title="Confirm this incident is active"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Confirm</span>
          </button>

          <span className="text-xs font-bold px-1 text-zinc-700 dark:text-zinc-300">
            {incident.verificationCount}
          </span>

          <button
            onClick={() => onDownvote(incident.id)}
            id={`downvote-btn-${incident.id}`}
            className={`p-1 rounded-md text-xs transition-all ${
              hasDownvoted
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
            title="Dispute or mark no longer active"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-1">
          {/* Comments */}
          <button
            onClick={() => onOpenDetail(incident)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{incident.commentsCount}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => onShare(incident)}
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Share incident link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Save / Bookmark */}
          <button
            onClick={() => onToggleSave(incident.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              incident.isSaved
                ? 'text-rose-500 bg-rose-500/10'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={incident.isSaved ? 'Saved to bookmarks' : 'Save incident'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          {/* Delete Post Button */}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              id={`delete-btn-${incident.id}`}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
              title="Delete incident report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Permanently Delete Report?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Are you sure you want to delete this incident report? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.(incident.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
};
