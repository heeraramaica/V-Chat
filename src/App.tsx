import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ChatView } from './components/ChatView';
import { TaskManagement } from './components/TaskManagement';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeManagement } from './components/EmployeeManagement';
import { OfflineIndicator } from './components/OfflineIndicator';
import { User, Task } from './types';
import { apiFetch } from './services/clientStorage';

import { 
  Building2, 
  ShieldCheck, 
  MessageSquare, 
  CheckSquare, 
  BarChart3, 
  Users, 
  ArrowRight,
  Briefcase
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vv_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'tasks' | 'dashboard' | 'team'>('chats');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Selected task id from chat click
  const [selectedTaskIdFromChat, setSelectedTaskIdFromChat] = useState<string | null>(null);

  // If not logged in, show auth modal by default
  useEffect(() => {
    if (!currentUser) {
      setIsAuthOpen(true);
    }
  }, [currentUser]);

  // Fetch tasks for current user
  const fetchTasks = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch('/api/tasks', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('vv_current_user', JSON.stringify(user));
    } catch {}
    setIsAuthOpen(false);
    // If admin, default to dashboard or chats; if employee, default to tasks
    if (user.isAdmin) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('tasks');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('vv_current_user');
    } catch {}
    setIsAuthOpen(true);
    setActiveTab('chats');
  };

  // Handle open task from chat card
  const handleOpenTaskFromChat = (taskId: string) => {
    setSelectedTaskIdFromChat(taskId);
    setActiveTab('tasks');
  };

  const pendingTasksCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-amber-200">
      
      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Main Top Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        unreadMessagesCount={unreadCount}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {!currentUser ? (
          /* Guest landing state prompting sign in */
          <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[#0F294A] text-amber-400 flex items-center justify-center mx-auto shadow-xl border border-[#1E3E68]">
              <Building2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold uppercase tracking-wider">
                Mumbai Branch HQ
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Varma &amp; Varma Chartered Accountants
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Secure internal communication, task allocation, follow-up, and statutory audit compliance portal.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                id="btn-landing-login"
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-3 bg-[#0F294A] hover:bg-[#163863] text-white font-bold rounded-2xl text-sm shadow-md transition inline-flex items-center gap-2"
              >
                <span>Sign In / Sign Up</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left max-w-2xl mx-auto">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">WhatsApp-style Groups</h4>
                <p className="text-[11px] text-slate-500">
                  Share instructions, working papers, client queries, and voice notes.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900">Task Allocation &amp; Audit</h4>
                <p className="text-[11px] text-slate-500">
                  Role-based permissions: Articles and Staff see and edit their own tasks only.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                <h4 className="text-xs font-bold text-slate-900">Partner Dashboard</h4>
                <p className="text-[11px] text-slate-500">
                  Team member wise workload, statutory deadlines, and audit audit trail.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'chats' && (
              <ChatView
                currentUser={currentUser}
                onOpenTask={handleOpenTaskFromChat}
                tasks={tasks}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManagement
                currentUser={currentUser}
                tasks={tasks}
                onTasksUpdate={fetchTasks}
                selectedTaskIdFromChat={selectedTaskIdFromChat}
                onClearSelectedTaskFromChat={() => setSelectedTaskIdFromChat(null)}
              />
            )}

            {activeTab === 'dashboard' && (
              <AdminDashboard
                currentUser={currentUser}
                onNavigateToTasks={() => setActiveTab('tasks')}
                onTasksUpdated={fetchTasks}
              />
            )}

            {activeTab === 'team' && currentUser.isAdmin && (
              <EmployeeManagement currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Auth & Signup Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={currentUser ? () => setIsAuthOpen(false) : undefined}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
