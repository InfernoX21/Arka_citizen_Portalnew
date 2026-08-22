import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';
import { AuthMethod } from '../types';
import { HumanVerification } from './HumanVerification';
import { triggerGoogleSignIn, isGoogleConfigured } from '../lib/googleAuth';
import { GoogleAuthModal } from './GoogleAuthModal';

interface LoginPageProps {
  onLogin: (user: {
    name: string;
    email?: string;
    authMethod: AuthMethod;
    avatar: string;
  }) => void;
  onSwitchToAdmin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToAdmin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Human Verification state
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const AVATAR_COLORS = [
    'from-rose-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-yellow-500',
    'from-pink-500 to-rose-500',
  ];

  const generateAvatar = (userName: string) => {
    const initials = userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const colorIdx = userName.length % AVATAR_COLORS.length;
    const hue = (colorIdx * 60 + 10) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue},80%,55%)"/>
          <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360},80%,45%)"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="64" fill="url(#g)"/>
      <text x="64" y="64" dy=".35em" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="48" font-weight="700">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Human verification validation for sign-up
    if (isSignUp) {
      if (!isHumanVerified || !verificationToken) {
        setError('Mandatory: Please solve the human verification question to continue');
        return;
      }

      // Verify token with server
      try {
        const verifyRes = await fetch('/api/verify-recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verificationToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setError('Human verification failed. Please try again.');
          setIsHumanVerified(false);
          setVerificationToken(null);
          return;
        }
      } catch {
        setError('Could not verify anti-bot challenge. Please check your connection.');
        return;
      }
    }

    setIsLoading(true);

    // Simulate auth delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const displayName = isSignUp
      ? name
      : email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    onLogin({
      name: displayName,
      email,
      authMethod: 'email',
      avatar: generateAvatar(displayName),
    });
  };

  // Google OAuth Authentication Handler
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const configured = await isGoogleConfigured();
      if (!configured) {
        setIsGoogleLoading(false);
        setShowGoogleModal(true);
        return;
      }

      // Triggers real Google OAuth 2.0 popup and server-side verification
      const googleUser = await triggerGoogleSignIn();

      // Only navigate on confirmed successful Google authentication
      onLogin({
        name: googleUser.name,
        email: googleUser.email,
        authMethod: 'google',
        avatar: googleUser.avatar || generateAvatar(googleUser.name),
      });
    } catch (err: any) {
      console.warn('Google Sign-In caught error:', err);
      const msg = err?.message || '';

      if (msg === 'GOOGLE_CLIENT_ID_NOT_CONFIGURED') {
        setShowGoogleModal(true);
      } else if (msg.includes('cancelled') || msg.includes('popup_closed') || msg.includes('closed')) {
        setError('Google sign-in was cancelled.');
      } else if (msg.includes('origin_mismatch') || msg.includes('not configured')) {
        setShowGoogleModal(true);
      } else if (msg.includes('Failed to load') || msg.includes('connection')) {
        setError('Could not reach Google authentication services. Please check your internet connection.');
      } else {
        setError(msg || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(244,63,94,0.4) 0%, transparent 70%)',
          animation: mounted ? 'orbFloat1 12s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)',
          animation: mounted ? 'orbFloat2 15s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
          animation: mounted ? 'orbFloat3 10s ease-in-out infinite' : 'none',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main card */}
      <div
        className="relative w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Switch to Admin Portal header badge */}
        {onSwitchToAdmin && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onSwitchToAdmin}
              id="switch-to-admin-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Official Admin Portal →</span>
            </button>
          </div>
        )}

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 shadow-lg shadow-rose-500/25 mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome
          </h1>
          <p className="text-zinc-400 text-xs mt-1.5">Sign in to your Arka Citizen Portal account</p>
        </div>

        {/* Glass card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-800/60 p-6 sm:p-8 shadow-2xl shadow-black/40">
          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            id="login-google-btn"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isGoogleLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (sign up only) */}
            {isSignUp && (
              <div
                className="space-y-1.5"
                style={{
                  animation: 'slideDown 0.3s ease-out',
                }}
              >
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="login-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  id="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Interactive Human Verification Widget (sign-up only) */}
            {isSignUp && (
              <div
                style={{
                  animation: 'slideDown 0.3s ease-out',
                }}
              >
                <HumanVerification
                  isVerified={isHumanVerified}
                  onVerify={(token) => {
                    setVerificationToken(token);
                    setIsHumanVerified(true);
                    setError('');
                  }}
                  onReset={() => {
                    setVerificationToken(null);
                    setIsHumanVerified(false);
                  }}
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              id="login-submit-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:from-rose-500 hover:via-orange-400 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setVerificationToken(null);
                setIsHumanVerified(false);
              }}
              id="login-toggle-mode-btn"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <span className="text-orange-400 font-semibold">Sign in</span>
                </>
              ) : (
                <>
                  New to Arka?{' '}
                  <span className="text-orange-400 font-semibold">Create account</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
            <span>Powered by AI • Built for Citizens</span>
          </div>
          <p className="text-[11px] text-zinc-700 mt-1.5">
            By continuing, you agree to Arka's Terms of Service
          </p>
        </div>
      </div>

      {/* Google Sign-in Account Chooser Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(user) => {
          setShowGoogleModal(false);
          onLogin(user);
        }}
      />

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.08); }
          66% { transform: translate(25px, -25px) scale(0.92); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
