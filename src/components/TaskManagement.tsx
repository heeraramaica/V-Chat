import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User as UserIcon, 
  Building2, 
  Paperclip, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Search, 
  Sparkles, 
  Send,
  MessageSquare,
  X,
  FileSpreadsheet,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { Task, User, UserRole, TaskStatus, TaskPriority, PredefinedTaskTemplate } from '../types';

interface TaskManagementProps {
  currentUser: User;
  tasks: Task[];
  onTasksUpdate: () => void;
  onOpenChatWithTask?: (taskId: string) => void;
  selectedTaskIdFromChat?: string | null;
  onClearSelectedTaskFromChat?: () => void;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({
  currentUser,
  tasks,
  onTasksUpdate,
  onOpenChatWithTask,
  selectedTaskIdFromChat,
  onClearSelectedTaskFromChat
}) => {
  const [activeView, setActiveView] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Allocate Task Modal (Admin/Manager)
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [predefinedTemplates, setPredefinedTemplates] = useState<PredefinedTaskTemplate[]>([]);

  // Form fields for new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Statutory Audit');
  const [clientName, setClientName] = useState('');
  const [clientPAN_GSTIN, setClientPAN_GSTIN] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [assignedRole, setAssignedRole] = useState<UserRole>('Articles');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [instructions, setInstructions] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([
    'Review prior year working papers & client records',
    'Execute audit steps / verification testing',
    'Prepare reconciliation statement & client queries'
  ]);
  const [newChecklistInput, setNewChecklistInput] = useState('');

  // Working papers / detail drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available staff for allocation
  const [employeeRoster, setEmployeeRoster] = useState<any[]>([]);

  // Fetch predefined CA task templates and employees roster
  useEffect(() => {
    fetch('/api/predefined-tasks')
      .then(res => res.json())
      .then(data => setPredefinedTemplates(data.tasks || []))
      .catch(() => {});

    if (currentUser.isAdmin) {
      fetch('/api/admin/employees', {
        headers: { 'x-user-id': currentUser.id }
      })
        .then(res => res.json())
        .then(data => {
          const list = [
            ...(data.registeredUsers || []),
            ...(data.allowedEmployees || [])
          ];
          // deduplicate by email
          const seen = new Set();
          const unique = list.filter(item => {
            if (seen.has(item.email.toLowerCase())) return false;
            seen.add(item.email.toLowerCase());
            return true;
          });
          setEmployeeRoster(unique);
          if (unique.length > 0 && !assignedToId) {
            setAssignedToId(unique[0].id || unique[0].email);
          }
        })
        .catch(() => {});
    }
  }, [currentUser.id, currentUser.isAdmin]);

  // Handle selected task from chat
  useEffect(() => {
    if (selectedTaskIdFromChat) {
      const match = tasks.find(t => t.id === selectedTaskIdFromChat);
      if (match) {
        setSelectedTask(match);
      }
      if (onClearSelectedTaskFromChat) onClearSelectedTaskFromChat();
    }
  }, [selectedTaskIdFromChat, tasks]);

  // Apply template
  const handleSelectTemplate = (template: PredefinedTaskTemplate) => {
    setTaskTitle(template.title);
    setTaskCategory(template.category);
    setPriority(template.defaultPriority);
    setInstructions(template.standardInstructions);
    if (template.suggestedChecklist && template.suggestedChecklist.length > 0) {
      setChecklistItems([...template.suggestedChecklist]);
    }
  };

  // Submit new task allocation
  const handleAllocateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !clientName.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          category: taskCategory,
          clientName: clientName.trim(),
          clientPAN_GSTIN: clientPAN_GSTIN.trim().toUpperCase(),
          assignedToId: assignedToId || currentUser.id,
          dueDate,
          priority,
          instructions: instructions.trim(),
          checklist: checklistItems.map((text, idx) => ({
            id: `chk-${Date.now()}-${idx}`,
            text,
            completed: false
          }))
        })
      });

      if (res.ok) {
        setShowAllocateModal(false);
        // Reset form
        setTaskTitle('');
        setClientName('');
        setClientPAN_GSTIN('');
        setInstructions('');
        onTasksUpdate();
      }
    } catch (err) {
      console.error('Failed to allocate task', err);
    }
  };

  // Update task status (Pending -> In Progress -> In Review -> Completed)
  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        onTasksUpdate();
        if (selectedTask?.id === task.id) {
          setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (task: Task, itemId: string) => {
    const updatedChecklist = (task.checklist || []).map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ checklist: updatedChecklist })
      });

      if (res.ok) {
        onTasksUpdate();
        if (selectedTask?.id === task.id) {
          setSelectedTask(prev => prev ? { ...prev, checklist: updatedChecklist } : null);
        }
      }
    } catch (err) {
      console.error('Error updating checklist', err);
    }
  };

  // Upload working papers / attachments to task
  const handleUploadTaskFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    setIsUploadingAttachment(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            dataBase64: reader.result as string
          })
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          const newAttachment = {
            id: `att-${Date.now()}`,
            name: upData.name,
            url: upData.url,
            type: file.type?.startsWith('image/') ? 'image' : 'doc',
            size: upData.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser.name
          };

          const updatedAttachments = [...(selectedTask.attachments || []), newAttachment];

          const putRes = await fetch(`/api/tasks/${selectedTask.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id
            },
            body: JSON.stringify({ attachments: updatedAttachments })
          });

          if (putRes.ok) {
            setSelectedTask(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
            onTasksUpdate();
          }
        }
      } catch (err) {
        console.error('Failed to attach document', err);
      } finally {
        setIsUploadingAttachment(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Post progress update comment on task
  const handleAddComment = async () => {
    if (!commentInput.trim() || !selectedTask) return;

    const newComment = {
      id: `cmt-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: commentInput.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(selectedTask.comments || []), newComment];

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ comments: updatedComments })
      });

      if (res.ok) {
        setSelectedTask(prev => prev ? { ...prev, comments: updatedComments } : null);
        setCommentInput('');
        onTasksUpdate();
      }
    } catch (err) {
      console.error('Error posting comment', err);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.instructions?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'Pending': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Review': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div id="tasks-view-container" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      
      {/* Hidden file input for task working papers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        onChange={handleUploadTaskFile}
        className="hidden"
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>CA Task Allocation &amp; Instructions</span>
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            {currentUser.isAdmin
              ? 'Branch In-charge view: Full control to allocate tasks, track CA compliances, and inspect working papers across all staff.'
              : `Personal Dashboard for ${currentUser.name}: Showing instructions and tasks allocated exclusively to you.`}
          </p>
        </div>

        {/* Allocate Task Button (Available to Admin and Partners/Managers) */}
        <div className="flex items-center gap-2">
          {currentUser.isAdmin && (
            <button
              id="btn-allocate-new-task"
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F294A] hover:bg-[#163863] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Allocate CA Task</span>
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveView('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === 'board' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client, title, instructions, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="In Review">In Review</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
        >
          <option value="all">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
        >
          <option value="all">All Categories</option>
          <option value="Statutory Audit">Statutory Audit</option>
          <option value="GST & Indirect Tax">GST &amp; Indirect Tax</option>
          <option value="Income Tax Filing">Income Tax Filing</option>
          <option value="TDS & TCS Compliances">TDS &amp; TCS</option>
          <option value="Corporate & MCA Law">Corporate &amp; MCA</option>
          <option value="Banking & Concurrent Audit">Bank Concurrent Audit</option>
          <option value="Litigation & Notices">Litigation &amp; Notices</option>
        </select>
      </div>

      {/* KANBAN BOARD VIEW */}
      {activeView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Pending', 'In Progress', 'In Review', 'Completed'] as TaskStatus[]).map((colStatus) => {
            const columnTasks = filteredTasks.filter(t => t.status === colStatus);

            return (
              <div key={colStatus} className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[450px]">
                
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      colStatus === 'Pending' ? 'bg-slate-400' :
                      colStatus === 'In Progress' ? 'bg-blue-500' :
                      colStatus === 'In Review' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`} />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      {colStatus}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-slate-700 rounded-full border border-slate-200">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-10 text-[11px] text-slate-400">
                      No tasks in {colStatus}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const completedCount = (task.checklist || []).filter(c => c.completed).length;
                      const totalChecklist = (task.checklist || []).length;
                      const isOverdue = task.status !== 'Completed' && task.dueDate < new Date().toISOString().split('T')[0];

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          onClick={() => setSelectedTask(task)}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition cursor-pointer space-y-2 relative group"
                        >
                          {/* Priority and Category tags */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 truncate">
                              {task.category}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Title & Client */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {task.title}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{task.clientName}</span>
                            </p>
                          </div>

                          {/* Checklist progress bar */}
                          {totalChecklist > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                                <span>Checklist</span>
                                <span>{completedCount}/{totalChecklist}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${(completedCount / totalChecklist) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Footer: Due date & Assignee */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                            <div className={`flex items-center gap-1 font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              <Clock className="w-3 h-3" />
                              <span>{task.dueDate}</span>
                              {isOverdue && <span className="text-[9px] uppercase font-bold text-rose-700">Overdue</span>}
                            </div>

                            <div className="flex items-center gap-1 text-slate-700 font-semibold truncate max-w-[120px]">
                              <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{task.assignedToName}</span>
                            </div>
                          </div>

                          {/* Quick status stepper button */}
                          <div className="pt-1 flex items-center justify-end gap-1">
                            {colStatus !== 'Completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus: TaskStatus = 
                                    colStatus === 'Pending' ? 'In Progress' :
                                    colStatus === 'In Progress' ? 'In Review' : 'Completed';
                                  handleUpdateStatus(task, nextStatus);
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition"
                              >
                                Move to {colStatus === 'Pending' ? 'In Progress' : colStatus === 'In Progress' ? 'Review' : 'Complete'} &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {activeView === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                  <th className="p-3">Task Title &amp; Category</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No tasks found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{task.title}</p>
                        <span className="text-[10px] text-slate-500 font-semibold">{task.category}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {task.clientName}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800">{task.assignedToName}</span>
                        <span className="block text-[10px] text-slate-400">{task.assignedToRole}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {task.dueDate}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TASK DETAIL DRAWER / MODAL */}
      {selectedTask && (
        <div 
          id="task-detail-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            id="task-detail-modal-card"
            className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusBadge(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPriorityStyle(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{selectedTask.category}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedTask.title}
                </h3>
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mt-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Client: {selectedTask.clientName}</span>
                  {selectedTask.clientPAN_GSTIN && (
                    <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] text-slate-600 font-mono">
                      {selectedTask.clientPAN_GSTIN}
                    </span>
                  )}
                </p>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar for Employee & Admin */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <span className="text-slate-500">Assigned To:</span>{' '}
                <strong className="text-slate-900">{selectedTask.assignedToName}</strong>{' '}
                <span className="text-slate-500">({selectedTask.assignedToRole})</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Due:</span>{' '}
                <strong className="text-slate-900">{selectedTask.dueDate}</strong>
              </div>

              {/* Status Update Buttons */}
              <div className="flex items-center gap-1">
                {(['Pending', 'In Progress', 'In Review', 'Completed'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedTask, st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      selectedTask.status === st
                        ? 'bg-[#0F294A] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner / Manager Instructions */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Partner / Manager Instructions</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedTask.instructions || 'No special instructions specified. Execute standard verification checks.'}
              </p>
            </div>

            {/* Checklist Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Task Execution Checklist</span>
                <span className="text-slate-500 font-normal text-[11px]">
                  {(selectedTask.checklist || []).filter(c => c.completed).length} of {(selectedTask.checklist || []).length} completed
                </span>
              </h4>

              <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                {(selectedTask.checklist || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">No checklist items defined.</p>
                ) : (
                  (selectedTask.checklist || []).map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(selectedTask, item.id)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className={`flex-1 leading-snug ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Working Papers & Document Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Working Papers &amp; Uploaded Audit Files
                </h4>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{isUploadingAttachment ? 'Uploading...' : 'Upload Working Paper'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedTask.attachments || []).length === 0 ? (
                  <div className="col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No files or proof uploaded yet. Click &quot;Upload Working Paper&quot; to attach audit memos, calculations, or client documents.
                  </div>
                ) : (
                  selectedTask.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{att.name}</p>
                          <p className="text-[10px] text-slate-500">By {att.uploadedBy}</p>
                        </div>
                      </div>
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-600 hover:text-slate-900"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Updates & Notes Thread */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Progress Notes &amp; Follow-up Comments
              </h4>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {(selectedTask.comments || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No progress notes posted yet.</p>
                ) : (
                  selectedTask.comments.map((cmt) => (
                    <div key={cmt.id} className="p-2 bg-white rounded-xl border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="font-bold text-slate-800">{cmt.senderName} ({cmt.senderRole})</span>
                        <span>{new Date(cmt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-800 leading-tight">{cmt.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                  placeholder="Add progress note or query for Partner/Team..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                  className="px-3 py-2 bg-[#0F294A] hover:bg-[#163863] text-white text-xs font-bold rounded-xl transition disabled:opacity-40"
                >
                  Post Note
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ALLOCATE TASK MODAL (ADMIN ONLY) */}
      {showAllocateModal && (
        <div 
          id="allocate-task-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowAllocateModal(false)}
        >
          <div 
            id="allocate-task-modal-card"
            className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Allocate CA Task &amp; Instructions</h3>
                  <p className="text-xs text-slate-500">Assign statutory/audit compliances to Mumbai staff</p>
                </div>
              </div>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Picker for standard CA firm tasks */}
            <div className="mt-4 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Pre-load Standard CA Firm Task Template:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {predefinedTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-slate-800 rounded-lg text-[11px] font-semibold border border-amber-200 transition shadow-2xs"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAllocateTask} className="mt-4 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Statutory Tax Audit u/s 44AB"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Practice Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none bg-white font-medium"
                  >
                    <option value="Statutory Audit">Statutory Audit</option>
                    <option value="GST & Indirect Tax">GST &amp; Indirect Tax</option>
                    <option value="Income Tax Filing">Income Tax Filing</option>
                    <option value="TDS & TCS Compliances">TDS &amp; TCS Compliances</option>
                    <option value="Corporate & MCA Law">Corporate &amp; MCA Law</option>
                    <option value="Banking & Concurrent Audit">Banking &amp; Concurrent Audit</option>
                    <option value="Litigation & Notices">Litigation &amp; Notices</option>
                    <option value="Internal Audit">Internal Audit</option>
                    <option value="Transfer Pricing">Transfer Pricing</option>
                    <option value="Other">Other CA Task</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Tata Consumer Products Ltd"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Client GSTIN / PAN (Optional)
                  </label>
                  <input
                    type="text"
                    value={clientPAN_GSTIN}
                    onChange={(e) => setClientPAN_GSTIN(e.target.value)}
                    placeholder="e.g. 27AAACT1234K1Z2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none uppercase font-mono"
                  />
                </div>
              </div>

              {/* Assignee & Roles Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assign to Team Member *
                  </label>
                  <select
                    required
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none bg-white font-medium"
                  >
                    {employeeRoster.length === 0 ? (
                      <option value={currentUser.id}>{currentUser.name} (Myself)</option>
                    ) : (
                      employeeRoster.map((emp) => (
                        <option key={emp.id || emp.email} value={emp.id || emp.email}>
                          {emp.name} ({emp.role})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none bg-white font-medium"
                  >
                    <option value="Urgent">Urgent (Immediate filing)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none font-medium"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Partner / Senior Instructions &amp; Follow-up Guidelines
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Detail the scope, statutory clauses to verify, specific caveats, and documentation required..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                />
              </div>

              {/* Checklist items */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Checklist Items for Assignee
                </label>
                <div className="space-y-1.5 mb-2">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-medium text-slate-800">{item}</span>
                      <button
                        type="button"
                        onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    placeholder="Add another checklist item..."
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistInput.trim()) {
                        setChecklistItems(prev => [...prev, newChecklistInput.trim()]);
                        setNewChecklistInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-800"
                  >
                    Add Step
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F294A] hover:bg-[#163863] text-white font-bold rounded-xl shadow-xs"
                >
                  Allocate Task to Staff
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
