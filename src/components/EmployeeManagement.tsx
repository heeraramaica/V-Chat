import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Briefcase, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Clock, 
  Search,
  Lock,
  UserCheck
} from 'lucide-react';
import { User, UserRole, AuthLog } from '../types';
import { apiFetch } from '../services/clientStorage';


interface EmployeeManagementProps {
  currentUser: User;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  currentUser
}) => {
  const [allowedEmployees, setAllowedEmployees] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New employee form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Articles');
  const [phone, setPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search in logs
  const [logSearch, setLogSearch] = useState('');

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/admin/employees', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setAllowedEmployees(data.allowedEmployees || []);
        setRegisteredUsers(data.registeredUsers || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load employee data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
          phone: phone.trim()
        })
      });

      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim()) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { error: rawText };
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to add employee (HTTP ${res.status})`);
      }

      setSuccessMsg(`Employee ${name} (${email}) added and whitelisted for sign-up!`);
      setEmail('');
      setName('');
      setPhone('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllowed = async (delEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove ${delEmail} from whitelisted staff?`)) return;

    try {
      const res = await apiFetch(`/api/admin/employees/${encodeURIComponent(delEmail)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete employee whitelist entry', err);
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    log.email.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.event.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.role && log.role.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div id="employee-management-container" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Explanation Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Staff Authorization &amp; Whitelist Engine
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Per firm security governance: <strong>Only email IDs added here by Admin are permitted to register and log in</strong>. Any unauthorized email will be strictly rejected and logged in the security audit database below.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
            {registeredUsers.length} Active Accounts
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
            {allowedEmployees.length} Whitelisted Emails
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Add Employee Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserPlus className="w-5 h-5 text-[#0F294A]" />
            <h3 className="text-sm font-bold text-slate-900">
              Add New Employee / Authorize Email
            </h3>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Employee Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CA Anjali Nair"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Employee Work Email ID * (Authorized for Sign Up)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. anjali.nair@varmavarma.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                The employee must enter this exact email ID when signing up.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Designation / Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none bg-white font-medium"
                >
                  <option value="Partner">Partner</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Paid Assistant">Paid Assistant</option>
                  <option value="Articles">Articles</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#0F294A] hover:bg-[#163863] text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Authorize &amp; Whitelist Employee</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Authorized Roster & Whitelist Table */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Branch Staff Roster &amp; Access Status
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Varma &amp; Varma Mumbai Branch
            </span>
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
            {allowedEmployees.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No employees added yet.</p>
            ) : (
              allowedEmployees.map((emp) => {
                const isRegistered = registeredUsers.some(u => u.email.toLowerCase() === emp.email.toLowerCase());

                return (
                  <div key={emp.email} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {emp.name ? emp.name.substring(0, 2).toUpperCase() : 'VV'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {emp.role}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{emp.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isRegistered ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Registered</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Invited / Pending</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteAllowed(emp.email)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Revoke Whitelist Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* DATABASE AUDIT LOGS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#0F294A]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Database Sign In &amp; Sign Up Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable security logs tracking all authorization attempts, successful sign-ins, and rejected attempts.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User Email</th>
                <th className="p-2.5">Security Event</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                    No security audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 30).map((log) => {
                  const isBlocked = log.event.includes('BLOCKED');
                  const isSuccess = log.event.includes('SUCCESS');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">
                        {log.email}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBlocked ? 'bg-rose-100 text-rose-800' :
                          isSuccess ? 'bg-emerald-100 text-emerald-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.event}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-sans">
                        {log.role || 'N/A'}
                      </td>
                      <td className="p-2.5 font-sans">
                        {isBlocked ? (
                          <span className="text-rose-600 font-bold">REJECTED</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">ALLOWED</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-400">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
