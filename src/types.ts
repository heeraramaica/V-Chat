export type UserRole = 
  | 'Partner' 
  | 'Manager' 
  | 'Accountant' 
  | 'Paid Assistant' 
  | 'Articles' 
  | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isAdmin: boolean;
  status: 'active' | 'invited';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AllowedEmployee {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  addedBy: string;
  addedAt: string;
  status?: 'active' | 'pending' | 'invited';
}

export interface AuthLog {
  id: string;
  userId?: string;
  email: string;
  event: 
    | 'SIGNUP_ADMIN' 
    | 'SIGNUP_EMPLOYEE' 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILED' 
    | 'LOGOUT' 
    | 'SIGNUP_BLOCKED_NOT_WHITELISTED';
  role?: string;
  ip?: string;
  timestamp: string;
  details?: string;
}

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // 'image' | 'pdf' | 'excel' | 'doc' | 'other'
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TaskReminder {
  id: string;
  datetime: string;
  note: string;
  sent: boolean;
}

export interface TaskComment {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  clientName: string;
  clientPAN_GSTIN?: string;
  assignedToId: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedToRole: UserRole;
  assignedById: string;
  assignedByName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  instructions: string;
  checklist: TaskChecklistItem[];
  reminders: TaskReminder[];
  attachments: TaskAttachment[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PredefinedTaskTemplate {
  id: string;
  title: string;
  category: string;
  defaultPriority: TaskPriority;
  suggestedChecklist: string[];
  standardInstructions: string;
  statutoryDeadlineInfo?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  type: 'text' | 'image' | 'document' | 'task_alert' | 'voice';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  mediaType?: string;
  timestamp: string;
  readBy: string[];
  taskRef?: {
    taskId: string;
    title: string;
    status: TaskStatus;
    dueDate: string;
  };
}

export interface ChatGroup {
  id: string;
  name: string;
  type: 'group' | 'direct' | 'task';
  taskId?: string;
  participants: string[];
  participantDetails: Array<{
    id: string;
    name: string;
    role: UserRole;
    email: string;
    phone?: string;
  }>;
  otherParticipant?: {
    id: string;
    name: string;
    role: UserRole;
    email: string;
    phone?: string;
  };
  description?: string;
  createdBy: string;
  createdAt: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
    type: string;
  };
  unreadCount?: number;
}
