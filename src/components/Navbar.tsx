import React from 'react';
import { 
  MessageSquare, 
  CheckSquare, 
  BarChart3, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  Bell,
  Sparkles
} from 'lucide-react';
import { User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { VChatLogo } from './VChatLogo';

interface NavbarProps {
  currentUser: User | null;
  activeTab: 'chats' | 'tasks' | 'dashboard' | 'team';
  setActiveTab: (tab: 'chats' | 'tasks' | 'dashboard' | 'team') => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  unreadMessagesCount: number;
  pendingTasksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenAuth,
  unreadMessagesCount,
  pendingTasksCount
}) => {
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Partner':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Manager':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'Accountant':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Paid Assistant':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Articles':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0F294A] text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Brand Logo (V-Chat) & Firm Title */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => currentUser && setActiveTab('chats')}>
            <VChatLogo size="md" variant="full" theme="dark" />
            
            <div className="hidden lg:block pl-3 border-l border-white/20 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">
                  Varma &amp; Varma
                </span>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono border border-amber-400/30">
                  Mumbai
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium">
                Chartered Accountants • Internal Branch Portal
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (when logged in) */}
          {currentUser && (
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-[#0B1E36] p-1 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
              <button
                id="nav-tab-chats"
                onClick={() => setActiveTab('chats')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                  activeTab === 'chats'
                    ? 'bg-white/15 text-white shadow-xs border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>V-Chat</span>
                {unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-tasks"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'bg-white/15 text-white shadow-xs border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tasks</span>
                {pendingTasksCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                    {pendingTasksCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-white/15 text-white shadow-xs border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard &amp; Analytics</span>
                <span className="sm:hidden">Dashboard</span>
              </button>

              {currentUser.isAdmin && (
                <button
                  id="nav-tab-team"
                  onClick={() => setActiveTab('team')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                    activeTab === 'team'
                      ? 'bg-white/15 text-white shadow-xs border border-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Staff &amp; Whitelist</span>
                  <span className="sm:hidden">Staff</span>
                </button>
              )}
            </nav>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* PWA Install Button always accessible in Menu Bar */}
            <PWAInstallButton compact />

            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* User info badge */}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/20">
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-white/30 bg-slate-100 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>{currentUser.name}</span>
                      {currentUser.isAdmin && (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" title="Admin / Partner" />
                      )}
                    </div>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-2 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-xl transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-open-login"
                onClick={onOpenAuth}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
