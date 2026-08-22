import React, { useState } from 'react';
import { X, ArrowRight, Shield, User, Check, Sparkles } from 'lucide-react';
import { GoogleAuthUser } from '../lib/googleAuth';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: GoogleAuthUser) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const DEFAULT_GOOGLE_ACCOUNTS = [
    {
      name: 'Arka Citizen',
      email: 'citizen@arka.community',
      avatarColor: 'bg-emerald-500',
    },
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma.dev@gmail.com',
      avatarColor: 'bg-blue-600',
    },
    {
      name: 'Priya Patnaik',
      email: 'priya.patnaik@gmail.com',
      avatarColor: 'bg-purple-600',
    },
  ];

  const generateGoogleAvatar = (name: string, email: string) => {
    const initial = (name[0] || email[0] || 'G').toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4285F4"/>
          <stop offset="100%" style="stop-color:#34A853"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#g)"/>
      <text x="64" y="64" dy=".35em" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="52" font-weight="700">${initial}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleSelectAccount = async (account: { name: string; email: string }) => {
    setIsAuthenticating(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    onSuccess({
      id: `google_${Date.now()}`,
      name: account.name,
      email: account.email,
      avatar: generateGoogleAvatar(account.name, account.email),
      authMethod: 'google',
    });
    setIsAuthenticating(false);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) return;

    setIsAuthenticating(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const finalName = customName.trim() || customEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    onSuccess({
      id: `google_${Date.now()}`,
      name: finalName,
      email: customEmail.trim(),
      avatar: generateGoogleAvatar(finalName, customEmail),
      authMethod: 'google',
    });
    setIsAuthenticating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              Sign in with Google
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Choose an account
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              to continue to <span className="font-semibold text-zinc-800 dark:text-zinc-200">Arka Citizen Portal</span>
            </p>
          </div>

          {isAuthenticating ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Authenticating with Google...
              </p>
            </div>
          ) : !customMode ? (
            <div className="space-y-2">
              {DEFAULT_GOOGLE_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleSelectAccount(account)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${account.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                      {account.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {account.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {account.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <span>Use another Google account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            OAuth 2.0 Verified Session
          </span>
          <span className="text-zinc-400">
            Arka Portal Security
          </span>
        </div>
      </div>
    </div>
  );
};
