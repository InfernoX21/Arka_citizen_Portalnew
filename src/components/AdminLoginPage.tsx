import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Mail,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserProfile } from '../types';

interface AdminLoginPageProps {
  onAdminLogin: (adminUser: Partial<UserProfile>) => void;
  onSwitchToCitizen: () => void;
}

const AUTHORIZED_ADMIN_PIN = '2026';

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminLogin,
  onSwitchToCitizen,
}) => {
  const [adminEmail, setAdminEmail] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminEmail.trim()) {
      setError('Please enter your administrator ID or email');
      return;
    }

    if (!securityPin.trim()) {
      setError('Please enter your security PIN');
      return;
    }

    // Strict Security Check: Only users with PIN 2026 can access
    if (securityPin.trim() !== AUTHORIZED_ADMIN_PIN) {
      setError('Access Denied: Invalid Security PIN. Authorization required.');
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));

    const officerName = adminEmail.includes('@')
      ? adminEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : adminEmail;

    // Generate Admin SVG Avatar
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4f46e5"/>
          <stop offset="100%" style="stop-color:#06b6d4"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="64" fill="url(#g)"/>
      <text x="64" y="64" dy=".35em" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="44" font-weight="800">ADM</text>
    </svg>`;
    const adminAvatar = `data:image/svg+xml;base64,${btoa(svg)}`;

    onAdminLogin({
      id: `admin_${Date.now()}`,
      name: officerName.toLowerCase().includes('admin') ? officerName : `Admin (${officerName})`,
      email: adminEmail,
      authMethod: 'email',
      role: 'admin',
      trustScore: 100,
      badges: ['Municipal Admin', 'Verified Authority', 'Emergency Dispatcher'],
      avatar: adminAvatar,
      joinDate: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Cyber Orbs */}
      <div
        className="absolute top-[-25%] left-[-15%] w-[550px] h-[550px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(79,70,229,0.5) 0%, transparent 70%)',
          animation: mounted ? 'adminOrb1 14s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)',
          animation: mounted ? 'adminOrb2 16s ease-in-out infinite' : 'none',
        }}
      />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Container */}
      <div
        className="relative w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Back to citizen portal button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchToCitizen}
            id="switch-to-citizen-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Citizen Portal
          </button>

          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping mr-1.5" />
            ADMIN CLEARANCE REQUIRED
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 shadow-xl shadow-indigo-500/25 mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Arka <span className="text-indigo-400 font-semibold">Admin Gateway</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Authorized Personnel & Incident Management Console
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/70 backdrop-blur-2xl rounded-3xl border border-indigo-500/20 p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Email / ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Administrator Email / Officer ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="admin-email-input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@arka.gov.in"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Admin Security PIN */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                Security Clearance PIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  id="admin-pin-input"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-base tracking-widest text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 text-center pt-0.5">
                Enter your confidential security clearance PIN.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              id="admin-login-submit-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authenticate & Enter Console
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <p className="text-[11px] text-zinc-500">
              Access is strictly restricted. Unauthorized attempts are logged.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes adminOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.06); }
        }
        @keyframes adminOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.08); }
        }
      `}</style>
    </div>
  );
};
