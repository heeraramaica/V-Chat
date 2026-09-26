import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  PieChart as PieIcon,
  Layers,
  FileText
} from 'lucide-react';
import { User } from '../types';
import { apiFetch } from '../services/clientStorage';


interface AdminDashboardProps {
  currentUser: User;
  onNavigateToTasks: () => void;
  onTasksUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateToTasks,
  onTasksUpdated
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'tasks' | 'compliance'>('team');

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch('/api/dashboard/analytics', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentUser.id]);

  // Seed sample CA tasks for demonstration
  const handleSeedSampleTasks = async () => {
    setSeeding(true);
    try {
      const res = await apiFetch('/api/tasks/seed-ca-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        }
      });
      if (res.ok) {
        await fetchAnalytics();
        onTasksUpdated();
      }
    } catch (err) {
      console.error('Error seeding sample tasks', err);
    } finally {
      setSeeding(false);
    }
  };

  // If non-admin user: Enforce access restriction strictly per prompt requirement:
  // "Only admin gets access to entire employee dashboard."
  if (!currentUser.isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Admin / Partner Dashboard Access Only
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            In compliance with firm policy, the overall employee workload dashboard and firm-wide compliance tracker is restricted to Partner / Admin in-charge.
          </p>
          <p className="text-xs text-slate-500">
            You can view and update all instructions and tasks allocated directly to you in the <strong className="text-slate-800">Tasks</strong> tab.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToTasks}
              className="px-5 py-2.5 bg-[#0F294A] hover:bg-[#163863] text-white font-bold rounded-xl text-sm transition shadow-sm inline-flex items-center gap-2"
            >
              <span>Go to My Allocated Tasks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner with CA Firm Header & Seeder */}
      <div className="bg-gradient-to-r from-[#0F294A] via-[#15345C] to-[#1F4678] text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
              Mumbai Branch HQ
            </span>
            <span className="text-xs text-slate-300 font-semibold">Varma &amp; Varma Chartered Accountants</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Executive Compliance &amp; Team Dashboard
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Live analytics across Articles, Paid Assistants, Managers, and Partners. Track task turnaround, statutory deadlines, and client deliverables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(!analytics || analytics.totalTasks === 0) && (
            <button
              onClick={handleSeedSampleTasks}
              disabled={seeding}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{seeding ? 'Populating...' : 'Load Sample CA Tasks'}</span>
            </button>
          )}

          <button
            onClick={fetchAnalytics}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {analytics?.totalTasks || 0}
          </p>
          <span className="text-[10px] text-slate-400">All practice areas</span>
        </div>

        {/* Pending */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pending</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {analytics?.pendingCount || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Awaiting kickoff</span>
        </div>

        {/* In Progress */}
        <div className="p-4 bg-white rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 text-xs font-semibold">
            <span>In Progress</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">
            {analytics?.inProgressCount || 0}
          </p>
          <span className="text-[10px] text-blue-600 font-medium">Under active audit</span>
        </div>

        {/* In Review */}
        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>In Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {analytics?.inReviewCount || 0}
          </p>
          <span className="text-[10px] text-amber-700 font-medium">Partner signoff pending</span>
        </div>

        {/* Completed */}
        <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">
            {analytics?.completedCount || 0}
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">Filed &amp; archived</span>
        </div>

        {/* Overdue */}
        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {analytics?.overdueCount || 0}
          </p>
          <span className="text-[10px] text-rose-600 font-bold">Requires attention</span>
        </div>

      </div>

      {/* SUB TABS: Team Member Wise | Task Wise | Compliance Calendar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('team')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'team'
              ? 'bg-[#0F294A] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Member Wise Breakdown</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'tasks'
              ? 'bg-[#0F294A] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Task Wise &amp; Practice Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compliance')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'compliance'
              ? 'bg-[#0F294A] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>CA Statutory Due Dates Calendar</span>
        </button>
      </div>

      {/* VIEW 1: TEAM MEMBER WISE WORKLOAD */}
      {activeSubTab === 'team' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Team Member Wise Performance &amp; Allocations
              </h3>
              <p className="text-xs text-slate-500">
                Workload distribution among Articles, Paid Assistants, Accountants, Managers, and Partners
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">Team Member</th>
                  <th className="p-3">Designation / Role</th>
                  <th className="p-3 text-center">Allocated Tasks</th>
                  <th className="p-3 text-center">Pending</th>
                  <th className="p-3 text-center">In Progress</th>
                  <th className="p-3 text-center">Completed</th>
                  <th className="p-3 text-center">Overdue</th>
                  <th className="p-3">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(analytics?.memberStats || []).map((member: any) => (
                  <tr key={member.email} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.name}</p>
                          <p className="text-[10px] text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        member.role === 'Partner' ? 'bg-amber-100 text-amber-900' :
                        member.role === 'Manager' ? 'bg-blue-100 text-blue-900' :
                        member.role === 'Accountant' ? 'bg-emerald-100 text-emerald-900' :
                        member.role === 'Paid Assistant' ? 'bg-purple-100 text-purple-900' :
                        'bg-indigo-100 text-indigo-900'
                      }`}>
                        {member.role}
                      </span>
                    </td>

                    <td className="p-3 text-center font-bold text-slate-800">
                      {member.totalTasks}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-600">
                      {member.pending}
                    </td>
                    <td className="p-3 text-center font-semibold text-blue-700">
                      {member.inProgress}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {member.completed}
                    </td>
                    <td className="p-3 text-center font-bold text-rose-600">
                      {member.overdue > 0 ? (
                        <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                          {member.overdue}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${member.completionRate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">
                          {member.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: TASK WISE & PRACTICE ANALYTICS */}
      {activeSubTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Practice Category Distribution */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Practice Category Distribution</span>
            </h4>

            <div className="space-y-2 pt-1">
              {Object.entries(analytics?.categoryStats || {}).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No category data yet.</p>
              ) : (
                Object.entries(analytics?.categoryStats || {}).map(([cat, count]: [string, any]) => {
                  const pct = Math.round((count / (analytics?.totalTasks || 1)) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{cat}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0F294A] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Tasks by Priority Level</span>
            </h4>

            <div className="space-y-3 pt-1">
              {Object.entries(analytics?.priorityStats || {}).map(([prio, count]: [string, any]) => (
                <div key={prio} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      prio === 'Urgent' ? 'bg-rose-500' :
                      prio === 'High' ? 'bg-orange-500' :
                      prio === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    <span className="text-xs font-bold text-slate-800">{prio} Priority</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workload by Staff Role */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Workload by Staff Role</span>
            </h4>

            <div className="space-y-2 pt-1">
              {Object.entries(analytics?.roleStats || {}).map(([role, count]: [string, any]) => (
                <div key={role} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-700">{role}</span>
                  <span className="font-bold text-slate-900 px-2 py-0.5 bg-white rounded border border-slate-200">
                    {count} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: CA STATUTORY DUE DATES RADAR (MUMBAI / INDIA) */}
      {activeSubTab === 'compliance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Key Indian Statutory &amp; CA Compliance Calendar
              </h3>
              <p className="text-xs text-slate-500">
                Critical deadlines tracked by Varma &amp; Varma Mumbai Branch
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 px-2 py-0.5 bg-amber-100 rounded">
                  7th of every month
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">TDS / TCS</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Deposit of Tax Deducted at Source</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                TDS/TCS collected in preceding month must be deposited via Challan ITNS 281. Interest @1.5% p.m. applies on delay.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 px-2 py-0.5 bg-blue-100 rounded">
                  11th of every month
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">GST</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">GSTR-1 Monthly Outward Supplies</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Filing of details of outward supplies for turnover &gt; Rs 5 Cr or monthly filers. Reflects in recipient GSTR-2B.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 px-2 py-0.5 bg-purple-100 rounded">
                  15th of month / quarter
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Direct Tax</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Advance Tax Installment (15% / 45% / 75% / 100%)</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                15th June (Q1), 15th Sept (Q2), 15th Dec (Q3), 15th March (Q4) for corporate and non-corporate assessees.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 px-2 py-0.5 bg-rose-100 rounded">
                  20th of every month
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">GST Monthly</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">GSTR-3B Summary Return &amp; ITC Settlement</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Crucial monthly filing with GSTR-2B reconciliation. Blocked credit under Sec 17(5) must not be availed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 px-2 py-0.5 bg-emerald-100 rounded">
                  30th Sept / 31st Oct
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Tax Audit</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Tax Audit u/s 44AB &amp; Form 3CD Certification</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Clause-by-clause scrutiny, Sec 40(a)(ia) disallowance, Sec 43B statutory dues verification, and CARO 2020 reporting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 px-2 py-0.5 bg-indigo-100 rounded">
                  30 Days from AGM
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">MCA / ROC</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">ROC Form AOC-4 &amp; MGT-7 Annual Filing</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Filing of audited Financial Statements, Board Report, CARO audit report, and Director KYC verification on MCA V3.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
