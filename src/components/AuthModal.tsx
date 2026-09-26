import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { User, UserRole } from '../types';
import { VChatLogo } from './VChatLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('Articles');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dbStatus, setDbStatus] = useState<{
    totalUsers: number;
    hasAdmin: boolean;
    allowedCount: number;
  }>({ totalUsers: 0, hasAdmin: false, allowedCount: 0 });

  // Fetch db auth status safely inspecting response.ok and reading response text first
  useEffect(() => {
    async function loadAuthStatus() {
      try {
        const res = await fetch('/api/auth/status', {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
          console.warn(`Auth status endpoint returned status ${res.status}`);
          return;
        }
        const text = await res.text();
        if (!text || !text.trim()) return;
        const data = JSON.parse(text);
        if (data) {
          setDbStatus(data);
          if (data.totalUsers === 0 || !data.hasAdmin) {
            setIsSignUp(true);
          }
        }
      } catch (err) {
        console.warn('Could not read auth status:', err);
      }
    }
    loadAuthStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const isFirstUser = dbStatus.totalUsers === 0 || !dbStatus.hasAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
      const bodyPayload = isSignUp 
        ? { email, password, name, phone, role: isFirstUser ? 'Partner' : role }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      // Safely read response text before calling JSON parse to prevent "Unexpected end of JSON input"
      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { error: rawText };
        }
      }

      // Safely inspect response.ok
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Server returned error (${res.status})`);
      }

      if (!data?.user) {
        throw new Error('Registration completed but server did not return user details.');
      }

      setSuccessMsg(isSignUp ? 'Account registered successfully!' : 'Login successful!');
      setTimeout(() => {
        onLoginSuccess(data.user);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDbForAdminTest = async () => {
    if (!window.confirm('Reset database to test fresh First-Time Admin Account registration? Existing demo accounts will be cleared.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-demo-db', {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim()) {
        try { data = JSON.parse(rawText); } catch {}
      }
      if (!res.ok) {
        throw new Error(data?.error || `Reset failed with HTTP ${res.status}`);
      }
      setDbStatus({ totalUsers: 0, hasAdmin: false, allowedCount: dbStatus.allowedCount });
      setIsSignUp(true);
      setEmail('');
      setPassword('');
      setName('');
      setSuccessMsg('Database cleared! You can now register the First-Time Admin Account.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset database');
    } finally {
      setLoading(false);
    }
  };

  // Quick filler for testing/evaluation
  const fillQuickCredentials = (fillEmail: string, fillPass: string, fillName?: string, fillRole?: UserRole) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    if (fillName) setName(fillName);
    if (fillRole) setRole(fillRole);
    setError(null);
  };

  return (
    <div 
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div 
        id="auth-modal-container"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
      >
        {/* Header Banner */}
        <div className="bg-[#0F294A] p-6 text-center text-white relative">
          <div className="flex justify-center mb-3">
            <VChatLogo size="lg" variant="full" theme="white" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Varma &amp; Varma Mumbai Branch
          </h2>
          <p className="text-xs text-amber-400 font-semibold tracking-wide uppercase mt-0.5">
            Chartered Accountants • Internal Portal
          </p>
          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
            Authorized team messaging, instructions, task allocation &amp; compliance tracking
          </p>

          {isFirstUser && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Initial Setup: First registrant will be designated Admin (Partner)</span>
            </div>
          )}
        </div>

        {/* Tab switchers: Sign In vs Sign Up */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition ${
              !isSignUp 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In to Account
          </button>
          <button
            type="button"
            id="auth-tab-signup"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition ${
              isSignUp 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isFirstUser ? 'First-Time Admin Setup' : 'Employee Sign Up'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div 
              id="auth-error-alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authorization Notice</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div 
              id="auth-success-alert"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. CA Ramesh Varma / Rohit Kulkarni"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              {!isFirstUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Designation / Role
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <select
                        id="select-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] focus:border-transparent outline-none transition bg-white"
                      >
                        <option value="Partner">Partner</option>
                        <option value="Manager">Manager</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Paid Assistant">Paid Assistant</option>
                        <option value="Articles">Articles</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="input-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98200 00000"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email ID *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. employee@varmavarma.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] focus:border-transparent outline-none transition"
              />
            </div>
            {isSignUp && !isFirstUser && (
              <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Firm policy: Only email IDs pre-approved by Admin can sign up.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <button
            id="btn-submit-auth"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#0F294A] hover:bg-[#163B67] text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? (isFirstUser ? 'Create Admin Account' : 'Sign Up as Employee') : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Helper Credentials for Demonstration */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Fill Whitelisted Staff (Pre-seeded Demo IDs):</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isFirstUser ? (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  fillQuickCredentials('admin.partner@varmavarma.com', 'admin123', 'CA Suresh Varma (Senior Partner)', 'Partner');
                }}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold border border-amber-300 transition"
              >
                Setup First Admin Partner (admin123)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    fillQuickCredentials('rohit.manager@varmavarma.com', 'audit2026', 'Rohit Kulkarni', 'Manager');
                  }}
                  className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-[11px] font-medium border border-blue-200 transition"
                >
                  Manager: rohit.manager@...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    fillQuickCredentials('priya.article@varmavarma.com', 'audit2026', 'Priya Deshmukh', 'Articles');
                  }}
                  className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-[11px] font-medium border border-indigo-200 transition"
                >
                  Articles: priya.article@...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    fillQuickCredentials('kunal.assistant@varmavarma.com', 'audit2026', 'Kunal Mehta', 'Paid Assistant');
                  }}
                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-[11px] font-medium border border-purple-200 transition"
                >
                  Paid Assistant: kunal.assistant@...
                </button>
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            💡 Password for pre-seeded staff sign-in is: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">audit2026</code> (or sign up with that whitelisted email).
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
            <span>Testing First-Time Admin Account registration?</span>
            <button
              type="button"
              id="btn-reset-db"
              onClick={handleResetDbForAdminTest}
              className="text-amber-700 hover:text-amber-900 font-semibold underline hover:no-underline"
            >
              Reset to First-Time Setup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
