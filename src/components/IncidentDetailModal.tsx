import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  MessageSquare,
  Send,
  Share2,
  ShieldAlert,
  ThumbsUp,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORIES } from '../data/categories';
import { formatRelativeTime } from '../lib/storage';
import { IncidentComment, IncidentReport, UserProfile } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface IncidentDetailModalProps {
  incident: IncidentReport | null;
  comments: IncidentComment[];
  currentUser: UserProfile;
  onClose: () => void;
  onAddComment: (incidentId: string, content: string, isConfirm: boolean) => void;
  onResolveIncident: (incidentId: string) => void;
  onUpvote: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  comments,
  currentUser,
  onClose,
  onAddComment,
  onResolveIncident,
  onUpvote,
  onDelete,
}) => {
  const [commentInput, setCommentInput] = useState('');
  const [isVerificationCheck, setIsVerificationCheck] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!incident) return null;

  const categoryMeta = CATEGORIES[incident.category] || CATEGORIES['Other'];

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(incident.id, commentInput.trim(), isVerificationCheck);
    setCommentInput('');
    setIsVerificationCheck(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${categoryMeta.bgColor} ${categoryMeta.textColor}`}
            >
              <CategoryIcon category={incident.category} className="w-3.5 h-3.5" />
              <span>{incident.category}</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">#{incident.id}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                id={`detail-delete-btn-${incident.id}`}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 transition-colors text-xs font-semibold"
                title="Delete this incident report"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 no-scrollbar">
          {/* Main Title & Reporter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <img
                  src={incident.reporter.avatar}
                  alt={incident.reporter.name}
                  className="w-7 h-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {incident.reporter.name}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                      ⭐ {incident.reporter.trustScore} Trust
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Posted {formatRelativeTime(incident.createdAt)}
                  </span>
                </div>
              </div>

              {incident.status === 'Active' ? (
                <button
                  onClick={() => onResolveIncident(incident.id)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                >
                  Mark as Resolved
                </button>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </span>
              )}
            </div>

            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
              {incident.aiTitle}
            </h2>
          </div>

          {/* Incident Photo */}
          {incident.photoUrl && (
            <div className="rounded-xl overflow-hidden bg-slate-950 aspect-[16/9] relative">
              <img
                src={incident.photoUrl}
                alt={incident.aiTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/85 backdrop-blur-md text-xs font-semibold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shadow-lg">
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span>Photo–Title Match: {incident.photoTitleMatchScore ?? incident.aiConfidence}%</span>
              </div>
            </div>
          )}

          {/* Photo–Title Relevance Explanation Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-1.5 text-xs transition-all ${
              (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 70
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 40
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Photo–Title Match: {incident.photoTitleMatchScore ?? incident.aiConfidence}%</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 70
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/20'
                    : (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 40
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/20'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-500/20'
                }`}
              >
                {(incident.photoTitleMatchScore ?? incident.aiConfidence) >= 70
                  ? 'High Relevance'
                  : (incident.photoTitleMatchScore ?? incident.aiConfidence) >= 40
                  ? 'Moderate Relevance'
                  : 'Low Relevance'}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {incident.photoTitleExplanation || 'The uploaded image content supports the reported incident title.'}
            </p>
          </div>

          {/* Description & Landmark */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reporter's Description
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {incident.userDescription}
            </p>
            {incident.landmark && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                📍 <strong>Landmark:</strong> {incident.landmark}
              </p>
            )}
          </div>

          {/* EXIF Metadata Card */}
          {incident.exif && (
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 space-y-2 border border-slate-800 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Compass className="w-4 h-4 text-orange-400" />
                  <span>EXIF Camera & Metadata Audit</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  VERIFIED CAPTURE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <div>
                  <span className="text-slate-500">Camera Device:</span>{' '}
                  <span className="text-slate-200">{incident.exif.deviceInfo || 'Mobile'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <span className="text-slate-200">
                    {incident.exif.timestamp
                      ? new Date(incident.exif.timestamp).toLocaleString()
                      : 'Captured on upload'}
                  </span>
                </div>
                {incident.exif.gps && (
                  <div className="col-span-2">
                    <span className="text-slate-500">GPS Coordinates:</span>{' '}
                    <span className="text-emerald-400 font-mono">
                      {incident.exif.gps.lat}, {incident.exif.gps.lng}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Citizen Merged duplicate reporters */}
          {incident.mergedReporters && incident.mergedReporters.length > 0 && (
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
                <Users className="w-4 h-4" />
                <span>Merged Citizen Reports ({incident.duplicateCount} Citizens)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                AI merged duplicate reports submitted by fellow citizens in this immediate area:
              </p>
              <div className="flex items-center space-x-2 pt-1">
                {incident.mergedReporters.map((rep, idx) => (
                  <div key={idx} className="flex items-center space-x-1 text-[11px] bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    <img src={rep.avatar} alt={rep.name} className="w-4 h-4 rounded-full" />
                    <span className="font-semibold">{rep.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Discussion */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span>Community Verification & Comments ({comments.length})</span>
            </h3>

            {/* List of comments */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No comments yet. Be the first citizen to verify or update this incident!
                </p>
              ) : (
                comments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={cmt.author.avatar}
                          alt={cmt.author.name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {cmt.author.name}
                        </span>
                        <span className="text-[10px] text-amber-500 font-semibold">
                          ⭐ {cmt.author.trustScore}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(cmt.createdAt)}
                      </span>
                    </div>
                    {cmt.isVerificationConfirm && (
                      <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        ✓ Verified Active On-Site
                      </span>
                    )}
                    <p className="text-slate-700 dark:text-slate-300 leading-normal">
                      {cmt.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Comment Input Sticky Footer */}
        <form
          onSubmit={handleSubmitComment}
          className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2 text-xs">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={isVerificationCheck}
                onChange={(e) => setIsVerificationCheck(e.target.checked)}
                className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
              />
              <span className="font-medium">Mark as On-Site Verification Confirmation</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add your update or comment..."
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

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
                  Are you sure you want to delete <strong className="text-zinc-800 dark:text-zinc-200">"{incident.aiTitle}"</strong>? This action cannot be undone.
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
      </motion.div>
    </div>
  );
};
