/**
 * Client-Side Storage & Firebase Firestore Real-Time Synchronization Engine
 * 
 * Provides unified data handling that operates seamlessly across:
 * - Real-time Cloud Storage via Google Cloud Firestore
 * - Persistent browser localStorage fallback for offline support
 * - Zero HTTP 405 Method Not Allowed errors on static hosts like Vercel
 * - Instant multi-device sync across laptops, Android, and iOS mobile phones
 */

import {
  User,
  AllowedEmployee,
  AuthLog,
  Task,
  PredefinedTaskTemplate,
  ChatGroup,
  ChatMessage,
  UserRole
} from '../types';
import {
  testFirestoreConnection,
  getCloudUsers,
  getCloudUserByEmail,
  saveCloudUser,
  getCloudAllowedEmployees,
  saveCloudAllowedEmployee,
  removeCloudAllowedEmployee,
  getCloudTasks,
  saveCloudTask,
  updateCloudTask,
  deleteCloudTask,
  getCloudChats,
  saveCloudChat,
  getCloudMessages,
  saveCloudMessage,
  saveCloudAuthLog,
  getCloudAuthLogs,
  seedCloudDefaults,
  subscribeToCloudTasks,
  subscribeToCloudChats,
  subscribeToCloudAllowedEmployees,
  subscribeToCloudUsers
} from './firebase';

export interface StoredUser extends User {
  password?: string;
}

export interface ClientDatabase {
  users: StoredUser[];
  allowedEmployees: AllowedEmployee[];
  authLogs: AuthLog[];
  tasks: Task[];
  predefinedTasks: PredefinedTaskTemplate[];
  chats: ChatGroup[];
  messages: ChatMessage[];
}

const STORAGE_KEY = 'vchat_client_db_v2';

// Standard Predefined Statutory Task Templates for Varma & Varma CA Practice
export const DEFAULT_PREDEFINED_TASKS: PredefinedTaskTemplate[] = [
  {
    id: 'pt-1',
    title: 'GSTR-3B Monthly Return Filing',
    category: 'GST & Indirect Tax',
    defaultPriority: 'High',
    suggestedChecklist: [
      'Download GSTR-2B from GST Portal',
      'Reconcile Purchase Register with GSTR-2B Input Tax Credit',
      'Identify Ineligible ITC (Section 17(5)) & Rule 42/43 Reversals',
      'Compute Output Tax liability from Sales Register (GSTR-1 match)',
      'Set-off ITC in electronic credit ledger & compute cash liability',
      'Generate Challan PMT-06 and get client payment confirmation',
      'File GSTR-3B via DSC/EVC and save Acknowledgement'
    ],
    standardInstructions: 'Ensure reconciliation with 2B is within 0% discrepancy. Do not claim blocked credits under Sec 17(5). Obtain client signoff on net cash outflow before filing.',
    statutoryDeadlineInfo: '20th of every month (for monthly filers)'
  },
  {
    id: 'pt-2',
    title: 'Statutory Tax Audit u/s 44AB (Form 3CD)',
    category: 'Statutory Audit',
    defaultPriority: 'Urgent',
    suggestedChecklist: [
      'Verify Gross Turnover/Receipts exceeding prescribed threshold',
      'Check Clause 13 - Method of accounting & ICDS compliance',
      'Verify Clause 21 - Disallowance under 40(a)(ia) for TDS default',
      'Check Clause 21(d) - Cash payments in excess of Rs 10,000 u/s 40A(3)',
      'Review Clause 26 - Compliance with Sec 43B statutory dues payment',
      'Examine Clause 34 - Compliance with TDS/TCS provisions and filing dates',
      'Draft Audit Report in Form 3CA/3CB and attach Notes to Accounts'
    ],
    standardInstructions: 'Obtain Management Representation Letter (MRL) for cash transactions and inventory valuation. Cross-verify all TDS challans with TRACES portal.',
    statutoryDeadlineInfo: '30th September / 31st October of Assessment Year'
  },
  {
    id: 'pt-3',
    title: 'Income Tax Return Filing (Corporate / Firm / Individual)',
    category: 'Income Tax Filing',
    defaultPriority: 'High',
    suggestedChecklist: [
      'Download AIS / TIS and Form 26AS from Income Tax Portal',
      'Reconcile Books of Account with AIS / 26AS',
      'Prepare Computation of Total Income with Depreciation Schedule',
      'Verify 80C, 80D, 80G deductions with original receipts / certificates',
      'Calculate Advance Tax liability and Interest u/s 234A, 234B, 234C',
      'Validate JSON/XML schema on Income Tax e-filing utility',
      'Upload ITR with Digital Signature (DSC) or Aadhaar OTP'
    ],
    standardInstructions: 'Ensure AIS reconciliation report is archived in working papers. Note down reasons for any AIS mismatch with client books.',
    statutoryDeadlineInfo: '31st July (Non-audit) / 31st October (Tax Audit)'
  },
  {
    id: 'pt-4',
    title: 'TDS / TCS Quarterly Return Filing (Form 24Q / 26Q / 27Q)',
    category: 'TDS & TCS Compliances',
    defaultPriority: 'Medium',
    suggestedChecklist: [
      'Extract Salary & Vendor payment ledgers with TDS deduction codes',
      'Reconcile BSR code, Challan Number, and deposit dates with TRACES',
      'Verify PAN validity of all deductees (Higher deduction for non-PAN)',
      'Run File Validation Utility (FVU) on RPU software',
      'Submit Form 24Q/26Q on TIN-NSDL or Income Tax Portal',
      'Download Form 16 / 16A certificates and dispatch to client'
    ],
    standardInstructions: 'Flag all late deposit interest u/s 201(1A) and late filing fees u/s 234E in advance to the client.',
    statutoryDeadlineInfo: '31st of month following end of quarter (Q1: July 31, Q2: Oct 31, Q3: Jan 31, Q4: May 31)'
  },
  {
    id: 'pt-5',
    title: 'ROC & MCA Annual Compliance (AOC-4 & MGT-7)',
    category: 'Corporate & MCA Law',
    defaultPriority: 'Medium',
    suggestedChecklist: [
      'Review Board Report, Directors Report & Secretarial Audit Report',
      'Prepare Financial Statements in XBRL / Non-XBRL format as applicable',
      'Verify AGM Date and Board Meeting Resolutions',
      'Draft Form AOC-4 (Financial Statements filing) with Notice & BS',
      'Draft Form MGT-7 / MGT-7A (Annual Return) with Shareholding pattern',
      'Verify DIR-3 KYC status of all active Directors on V3 Portal',
      'Affix DSC of Director & Practicing Chartered Accountant'
    ],
    standardInstructions: 'Check for CSR expenditure disclosures under Sec 135 and CARO 2020 remarks before signing AOC-4.',
    statutoryDeadlineInfo: 'AOC-4 within 30 days of AGM / MGT-7 within 60 days of AGM'
  },
  {
    id: 'pt-6',
    title: 'Bank Concurrent Audit / Stock Audit Verification',
    category: 'Banking & Concurrent Audit',
    defaultPriority: 'High',
    suggestedChecklist: [
      'Verify Daily Cash Balance against ceiling limit',
      'Check KYC compliance for all newly opened Current & Savings accounts',
      'Verify loan sanction terms, pre-disbursement conditions and charge creation',
      'Review Drawing Power (DP) calculation with monthly Stock Statements',
      'Inspect SMA-0, SMA-1, SMA-2 accounts for early warning stress signals',
      'Ensure proper valuation of hypothecated stocks and primary security',
      'Submit Flash Report and Monthly Audit Certificate to Zonal Office'
    ],
    standardInstructions: 'Follow RBI master directions strictly. Report any revenue leakages or irregular overdrafts immediately in the interim memo.',
    statutoryDeadlineInfo: 'Monthly submission to Bank Head Office by 10th'
  },
  {
    id: 'pt-7',
    title: 'GST Scrutiny & Notice Representation (ASMT-10 / DRC-01)',
    category: 'Litigation & Notices',
    defaultPriority: 'Urgent',
    suggestedChecklist: [
      'Examine Notice clauses (ITC mismatch, Turnover discrepancy, RCM liability)',
      'Prepare point-wise factual rebuttal and reconciliation statement',
      'Collate relevant Tax Invoices, E-way bills, and Transport proof',
      'Draft formal Reply in Form ASMT-11 with judicial precedents',
      'Upload written submission with annexures on GST common portal',
      'Attend Personal Hearing before the Proper Officer / Assistant Commissioner'
    ],
    standardInstructions: 'Coordinate directly with Partner before attending personal hearing. Keep chronological file ready.',
    statutoryDeadlineInfo: 'Within 30 days from date of receipt of notice'
  }
];

// Initial Whitelisted Employees allowed for registration
export const DEFAULT_ALLOWED_EMPLOYEES: AllowedEmployee[] = [
  {
    email: 'rohit.manager@varmavarma.com',
    name: 'Rohit Kulkarni',
    role: 'Manager',
    phone: '+91 98201 44321',
    addedBy: 'System Pre-seed',
    addedAt: '2026-09-17T09:14:46.969Z'
  },
  {
    email: 'priya.article@varmavarma.com',
    name: 'Priya Deshmukh',
    role: 'Articles',
    phone: '+91 97654 88712',
    addedBy: 'System Pre-seed',
    addedAt: '2026-09-17T09:14:46.969Z'
  },
  {
    email: 'kunal.assistant@varmavarma.com',
    name: 'Kunal Mehta',
    role: 'Paid Assistant',
    phone: '+91 98333 11200',
    addedBy: 'System Pre-seed',
    addedAt: '2026-09-17T09:14:46.969Z'
  },
  {
    email: 'ananya.accountant@varmavarma.com',
    name: 'Ananya Sharma',
    role: 'Accountant',
    phone: '+91 98199 55432',
    addedBy: 'System Pre-seed',
    addedAt: '2026-09-17T09:14:46.969Z'
  },
  {
    email: 'shreedevi.heeraram@gmail.com',
    name: 'Shri Devi',
    role: 'Articles',
    phone: '7597368283',
    addedBy: 'Heera Ram',
    addedAt: '2026-09-26T17:16:51.569Z'
  },
  {
    email: 'heeraramaica@gmail.com',
    name: 'Heeraram',
    role: 'Partner',
    phone: '',
    addedBy: 'Heera Ram',
    addedAt: '2026-09-26T18:31:08.965Z'
  }
];

export const DEFAULT_CHATS: ChatGroup[] = [
  {
    id: 'chat-branch-general',
    name: 'Varma & Varma - Mumbai Branch HQ',
    type: 'group',
    participants: ['all'],
    participantDetails: [],
    description: 'Official WhatsApp-style branch group for Varma & Varma Mumbai. All team instructions, follow-ups, and firm updates.',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    lastMessage: {
      content: 'Branch HQ initialized. First registered Admin will manage team tasks and assignments.',
      timestamp: new Date().toISOString(),
      senderName: 'System',
      type: 'text'
    }
  }
];

export const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    chatId: 'chat-branch-general',
    senderId: 'sys-admin',
    senderName: 'Branch In-Charge',
    senderRole: 'Partner',
    content: 'Good morning team! Welcome to the Varma & Varma Mumbai Branch internal portal. Please check your assigned tasks, update instructions, and post working papers directly in the respective chats.',
    type: 'text',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    readBy: []
  },
  {
    id: 'msg-seed-2',
    chatId: 'chat-branch-general',
    senderId: 'sys-admin',
    senderName: 'Branch In-Charge',
    senderRole: 'Partner',
    content: 'Reminder: All articles and assistants must log progress and mark pending checklist items daily before 6:30 PM.',
    type: 'text',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    readBy: []
  }
];

/**
 * Gets or initializes the client-side database from localStorage
 */
export function getClientDb(): ClientDatabase {
  if (typeof window === 'undefined') {
    return {
      users: [],
      allowedEmployees: DEFAULT_ALLOWED_EMPLOYEES,
      authLogs: [],
      tasks: [],
      predefinedTasks: DEFAULT_PREDEFINED_TASKS,
      chats: DEFAULT_CHATS,
      messages: DEFAULT_MESSAGES
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        if (!parsed.predefinedTasks || parsed.predefinedTasks.length === 0) {
          parsed.predefinedTasks = DEFAULT_PREDEFINED_TASKS;
        }
        if (!parsed.allowedEmployees || parsed.allowedEmployees.length === 0) {
          parsed.allowedEmployees = DEFAULT_ALLOWED_EMPLOYEES;
        }
        if (!parsed.chats || parsed.chats.length === 0) {
          parsed.chats = DEFAULT_CHATS;
        }
        if (!parsed.messages) {
          parsed.messages = DEFAULT_MESSAGES;
        }
        if (!parsed.tasks) {
          parsed.tasks = [];
        }
        if (!parsed.authLogs) {
          parsed.authLogs = [];
        }
        return parsed as ClientDatabase;
      }
    }
  } catch (err) {
    console.warn('[clientDb] Failed to read localStorage, creating initial db:', err);
  }

  const initialDb: ClientDatabase = {
    users: [],
    allowedEmployees: DEFAULT_ALLOWED_EMPLOYEES,
    authLogs: [],
    tasks: [],
    predefinedTasks: DEFAULT_PREDEFINED_TASKS,
    chats: DEFAULT_CHATS,
    messages: DEFAULT_MESSAGES
  };

  saveClientDb(initialDb);
  return initialDb;
}

/**
 * Saves database state to localStorage
 */
export function saveClientDb(db: ClientDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('[clientDb] Failed to save database to localStorage:', err);
  }
}

/**
 * Resets database to first-time setup state
 */
export function resetClientDb(): ClientDatabase {
  const freshDb: ClientDatabase = {
    users: [],
    allowedEmployees: DEFAULT_ALLOWED_EMPLOYEES,
    authLogs: [],
    tasks: [],
    predefinedTasks: DEFAULT_PREDEFINED_TASKS,
    chats: DEFAULT_CHATS,
    messages: DEFAULT_MESSAGES
  };
  saveClientDb(freshDb);
  return freshDb;
}

/**
 * Generates sample realistic CA tasks
 */
function createSampleCaTasks(user: { id: string; name: string }): Task[] {
  const now = Date.now();
  return [
    {
      id: `tsk-seed-${now}-1`,
      title: 'Monthly GSTR-3B Reconciliation & Filing (August 2026)',
      description: 'Reconcile Purchase Register with GSTR-2B, calculate eligible ITC under Section 16 & Rule 42/43 reversals, and file return before due date.',
      category: 'GST & Indirect Tax',
      clientName: 'Tata Motors Maharashtra Dealership Network',
      clientPAN_GSTIN: '27AAACT0012P1ZA',
      assignedToId: 'rohit.manager@varmavarma.com',
      assignedToName: 'Rohit Kulkarni',
      assignedToEmail: 'rohit.manager@varmavarma.com',
      assignedToRole: 'Manager',
      assignedById: user.id,
      assignedByName: user.name,
      dueDate: new Date(now + 86400000 * 3).toISOString().split('T')[0],
      priority: 'Urgent',
      status: 'In Progress',
      instructions: 'Pay special attention to Capital Goods ITC eligibility and cross-check RCM liabilities with vendor invoices. Share draft liability challan for client approval.',
      checklist: [
        { id: 'c1', text: 'Download and ingest August GSTR-2B data', completed: true },
        { id: 'c2', text: 'Run 100% automated purchase register reconciliation', completed: true },
        { id: 'c3', text: 'Obtain client sign-off on tax liability ledger balances', completed: false },
        { id: 'c4', text: 'File GSTR-3B using Partner DSC', completed: false }
      ],
      reminders: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `tsk-seed-${now}-2`,
      title: 'Tax Audit u/s 44AB - Clause 21, 26 & 34 Verification',
      description: 'Verify 40(a)(ia) disallowances for non-deduction of TDS, Section 43B statutory dues payments before ITR filing date, and TDS reconciliation with Form 26AS/TRACES.',
      category: 'Statutory Audit',
      clientName: 'Reliance Retail Supply Logistics LLP',
      clientPAN_GSTIN: '27AABCR9910E1ZY',
      assignedToId: 'priya.article@varmavarma.com',
      assignedToName: 'Priya Deshmukh',
      assignedToEmail: 'priya.article@varmavarma.com',
      assignedToRole: 'Articles',
      assignedById: user.id,
      assignedByName: user.name,
      dueDate: new Date(now + 86400000 * 6).toISOString().split('T')[0],
      priority: 'High',
      status: 'Pending',
      instructions: 'Cross-check sample 50 vendor ledgers for 194C / 194J applicability. Verify that PF/ESIC deposits were made on or before statutory due dates.',
      checklist: [
        { id: 'c1', text: 'Verify Clause 21(a) disallowance on foreign payments', completed: false },
        { id: 'c2', text: 'Examine PF and ESIC challan payment dates vs due dates', completed: false },
        { id: 'c3', text: 'Cross-verify Clause 34 with Form 26AS and 27EQ', completed: false }
      ],
      reminders: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `tsk-seed-${now}-3`,
      title: 'Concurrent Stock Audit & Drawing Power Computation',
      description: 'Quarterly physical inventory verification and DP calculation for working capital facility of Rs. 45 Crores.',
      category: 'Banking & Concurrent Audit',
      clientName: 'HDFC Bank - Fort Large Corporate Branch',
      clientPAN_GSTIN: '27AAACH1122K1Z9',
      assignedToId: 'kunal.assistant@varmavarma.com',
      assignedToName: 'Kunal Mehta',
      assignedToEmail: 'kunal.assistant@varmavarma.com',
      assignedToRole: 'Paid Assistant',
      assignedById: user.id,
      assignedByName: user.name,
      dueDate: new Date(now + 86400000 * 2).toISOString().split('T')[0],
      priority: 'High',
      status: 'In Review',
      instructions: 'Check borrower godown inspection reports and verify insurance coverage adequacy with bank hypothecation clause.',
      checklist: [
        { id: 'c1', text: 'Obtain monthly DP statements for top 20 borrowal accounts', completed: true },
        { id: 'c2', text: 'Verify ageing of book debts (exclude >90 days)', completed: true },
        { id: 'c3', text: 'Draft monthly audit memo for Bank AGM', completed: true }
      ],
      reminders: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `tsk-seed-${now}-4`,
      title: 'Form AOC-4 Financial Statements Filing on MCA V3',
      description: 'Annual ROC filing of Balance Sheet, Profit & Loss, Board Report and CARO report.',
      category: 'Corporate & MCA Law',
      clientName: 'Godrej Infotech Solutions Private Limited',
      clientPAN_GSTIN: '27AABCG1234F1ZG',
      assignedToId: 'ananya.accountant@varmavarma.com',
      assignedToName: 'Ananya Sharma',
      assignedToEmail: 'ananya.accountant@varmavarma.com',
      assignedToRole: 'Accountant',
      assignedById: user.id,
      assignedByName: user.name,
      dueDate: new Date(now + 86400000 * 9).toISOString().split('T')[0],
      priority: 'Medium',
      status: 'Pending',
      instructions: 'Check Director DIN status on MCA portal and ensure all notes to accounts are attached in searchable PDF format.',
      checklist: [
        { id: 'c1', text: 'Collate signed Director report and Auditor report', completed: true },
        { id: 'c2', text: 'Draft form AOC-4 on MCA V3 portal', completed: false },
        { id: 'c3', text: 'Affix CA and Director digital signatures', completed: false }
      ],
      reminders: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

/**
 * Dispatches an in-browser request to the client and Firebase cloud database handlers.
 * Always returns a standard Response object with JSON headers.
 */
export async function handleClientApiRequest(
  urlString: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  const userId = headers.get('x-user-id') || '';

  // Parse path and query parameters
  const parsedUrl = new URL(urlString, window.location.origin);
  const path = parsedUrl.pathname;

  let body: any = null;
  if (init?.body) {
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    } else {
      body = init.body;
    }
  }

  const db = getClientDb();

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Storage-Mode': 'Firebase-Firestore-Realtime'
      }
    });
  };

  // 1. Health check
  if (path === '/api/health') {
    return jsonResponse({
      status: 'ok',
      mode: 'Firebase-Firestore-Realtime',
      firm: 'Varma & Varma Mumbai Branch',
      usersCount: db.users.length,
      tasksCount: db.tasks.length,
      timestamp: new Date().toISOString()
    });
  }

  // 2. Auth status
  if (path === '/api/auth/status') {
    // Fast non-blocking sync with cloud users if local user list is empty
    if (db.users.length === 0) {
      try {
        const cloudUsers = await getCloudUsers();
        if (cloudUsers.length > 0) {
          db.users = cloudUsers;
          saveClientDb(db);
        }
      } catch {}
    }

    const totalUsers = db.users.length;
    const hasAdmin = db.users.some(u => u.isAdmin);
    const isFirstTimeSetup = totalUsers === 0 || !hasAdmin;

    return jsonResponse({
      totalUsers,
      hasAdmin,
      isFirstTimeSetup,
      allowedCount: db.allowedEmployees.length,
      predefinedTasksCount: db.predefinedTasks.length
    });
  }

  // 3. Reset database for demo/testing
  if (path === '/api/auth/reset-demo-db' && method === 'POST') {
    resetClientDb();
    return jsonResponse({
      message: 'Database reset to initial state. Ready for First-Time Admin Account registration.',
      totalUsers: 0,
      hasAdmin: false
    });
  }

  // 4. Sign up (Supports First-Time Admin & Whitelisted Employees with Cloud Sync)
  if (path === '/api/auth/signup' && method === 'POST') {
    const { name, email, password, phone, role } = body || {};

    if (!email || !password || !name) {
      return jsonResponse({ error: 'Name, email, and password are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check Local & Cloud for existing user
    let existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!existingUser) {
      existingUser = await getCloudUserByEmail(cleanEmail);
    }

    if (existingUser) {
      return jsonResponse({ error: 'An account with this email already exists. Please log in.' }, 400);
    }

    const hasAdmin = db.users.some(u => u.isAdmin);
    const isFirstUser = db.users.length === 0 || !hasAdmin;

    // Verify employee whitelist if not first admin
    if (!isFirstUser) {
      let allowed = db.allowedEmployees.find(e => e.email.toLowerCase() === cleanEmail);
      if (!allowed) {
        // Quick check cloud allowed list
        const cloudAllowed = await getCloudAllowedEmployees();
        if (cloudAllowed.length > 0) {
          db.allowedEmployees = cloudAllowed;
          allowed = db.allowedEmployees.find(e => e.email.toLowerCase() === cleanEmail);
        }
      }

      if (!allowed) {
        const logItem: AuthLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          email: cleanEmail,
          event: 'SIGNUP_BLOCKED_NOT_WHITELISTED',
          ip: 'Client Browser',
          timestamp: new Date().toISOString(),
          details: `Attempted signup blocked: Email ${cleanEmail} is not authorized by Admin.`
        };
        db.authLogs.unshift(logItem);
        saveClientDb(db);
        saveCloudAuthLog(logItem).catch(() => {});

        return jsonResponse({
          error: 'Access Denied: Only employees whose email IDs have been registered by Varma & Varma Admin can sign up. Please contact branch administration.'
        }, 403);
      }
    }

    let userRole: UserRole = 'Partner';
    let isAdmin = false;

    if (isFirstUser) {
      userRole = 'Partner';
      isAdmin = true;
    } else {
      const allowed = db.allowedEmployees.find(e => e.email.toLowerCase() === cleanEmail);
      userRole = allowed?.role || (role as UserRole) || 'Articles';
      isAdmin = false;
    }

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: String(name).trim(),
      email: cleanEmail,
      password: String(password),
      role: userRole,
      phone: phone ? String(phone).trim() : undefined,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      isAdmin,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    db.users.push(newUser);

    // Update allowed status if matching
    db.allowedEmployees = db.allowedEmployees.map(e =>
      e.email.toLowerCase() === cleanEmail ? { ...e, status: 'active' } : e
    );

    // Log auth event
    const authLogItem: AuthLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: newUser.id,
      email: cleanEmail,
      event: isFirstUser ? 'SIGNUP_ADMIN' : 'SIGNUP_EMPLOYEE',
      role: userRole,
      ip: 'Client Browser',
      timestamp: new Date().toISOString(),
      details: `${isFirstUser ? 'Primary Admin/Partner' : 'Employee (' + userRole + ')'} successfully registered.`
    };
    db.authLogs.unshift(authLogItem);

    // Auto-add to branch general chat
    db.chats.forEach(chat => {
      if (chat.participants.includes('all') && !chat.participants.includes(newUser.id)) {
        chat.participants.push(newUser.id);
        saveCloudChat(chat).catch(() => {});
      }
    });

    saveClientDb(db);

    // Asynchronous cloud sync (non-blocking fallback)
    saveCloudUser(newUser).catch(() => {});
    saveCloudAuthLog(authLogItem).catch(() => {});

    const { password: _, ...safeUser } = newUser;
    return jsonResponse({
      message: isFirstUser ? 'First-time Admin account created successfully' : 'Employee account created successfully',
      user: safeUser
    }, 201);
  }

  // 5. Login (Checks Local & Cloud Firestore)
  if (path === '/api/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check local db first
    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    // If not found in local db, check Cloud Firestore (e.g. user registered on another device)
    if (!user) {
      const cloudUser = await getCloudUserByEmail(cleanEmail);
      if (cloudUser) {
        user = cloudUser;
        db.users.push(cloudUser);
        saveClientDb(db);
      }
    }

    // If still not found, check if this is an authorized whitelisted staff using default credentials
    if (!user) {
      const allowed = db.allowedEmployees.find(e => e.email.toLowerCase() === cleanEmail);
      if (allowed && (String(password) === 'audit2026' || String(password) === 'admin123')) {
        user = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: allowed.name,
          email: cleanEmail,
          password: String(password),
          role: allowed.role,
          phone: allowed.phone,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(allowed.name)}`,
          isAdmin: allowed.role === 'Partner',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        db.users.push(user);
        saveClientDb(db);
        saveCloudUser(user).catch(() => {});
      }
    }

    if (!user || (user.password && user.password !== String(password))) {
      const failedLog: AuthLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        email: cleanEmail,
        event: 'LOGIN_FAILED',
        ip: 'Client Browser',
        timestamp: new Date().toISOString(),
        details: 'Invalid password or unknown email ID'
      };
      db.authLogs.unshift(failedLog);
      saveClientDb(db);
      saveCloudAuthLog(failedLog).catch(() => {});
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    user.lastLoginAt = new Date().toISOString();
    saveClientDb(db);
    saveCloudUser(user).catch(() => {});

    const successLog: AuthLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user.id,
      email: cleanEmail,
      event: 'LOGIN_SUCCESS',
      role: user.role,
      ip: 'Client Browser',
      timestamp: new Date().toISOString(),
      details: `User ${user.name} logged in.`
    };
    db.authLogs.unshift(successLog);
    saveClientDb(db);
    saveCloudAuthLog(successLog).catch(() => {});

    const { password: _, ...safeUser } = user;
    return jsonResponse({ message: 'Login successful', user: safeUser }, 200);
  }

  // 6. Predefined Tasks
  if (path === '/api/predefined-tasks') {
    return jsonResponse({ tasks: db.predefinedTasks });
  }

  // 7. Seed Sample CA Tasks (Syncs to Cloud Firestore)
  if ((path === '/api/tasks/seed-ca-samples' || path === '/api/admin/seed-sample-tasks') && method === 'POST') {
    const currentUser = db.users.find(u => u.id === userId) || { id: 'admin', name: 'Branch Admin' };
    const sampleTasks = createSampleCaTasks(currentUser);

    for (const task of sampleTasks) {
      if (!db.tasks.some(t => t.title === task.title && t.clientName === task.clientName)) {
        db.tasks.unshift(task);
        await saveCloudTask(task);
      }
    }

    saveClientDb(db);
    return jsonResponse({ message: 'Sample CA tasks loaded successfully', count: db.tasks.length });
  }

  // 8. Tasks (GET, POST with Cloud Firestore Sync)
  if (path === '/api/tasks') {
    if (method === 'GET') {
      try {
        const cloudTasks = await getCloudTasks();
        if (cloudTasks.length > 0) {
          db.tasks = cloudTasks;
          saveClientDb(db);
        }
      } catch {}

      const currentUser = db.users.find(u => u.id === userId);
      let userTasks = db.tasks;
      if (currentUser && !currentUser.isAdmin) {
        userTasks = db.tasks.filter(
          t =>
            t.assignedToId === currentUser.id ||
            t.assignedToEmail.toLowerCase() === currentUser.email.toLowerCase() ||
            t.assignedById === currentUser.id
        );
      }
      return jsonResponse({ tasks: userTasks });
    }

    if (method === 'POST') {
      const currentUser = db.users.find(u => u.id === userId) || {
        id: userId || 'usr-admin',
        name: 'Branch Admin',
        role: 'Partner' as UserRole
      };

      const taskData = body || {};
      const newTask: Task = {
        id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: taskData.title || 'Untitled Task',
        description: taskData.description || '',
        category: taskData.category || 'General Audit & Compliance',
        clientName: taskData.clientName || 'General Client',
        clientPAN_GSTIN: taskData.clientPAN_GSTIN || '',
        assignedToId: taskData.assignedToId || currentUser.id,
        assignedToName: taskData.assignedToName || currentUser.name,
        assignedToEmail: taskData.assignedToEmail || '',
        assignedToRole: (taskData.assignedToRole as UserRole) || 'Articles',
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
        priority: taskData.priority || 'Medium',
        status: 'Pending',
        instructions: taskData.instructions || '',
        checklist: Array.isArray(taskData.checklist) ? taskData.checklist : [],
        reminders: Array.isArray(taskData.reminders) ? taskData.reminders : [],
        attachments: Array.isArray(taskData.attachments) ? taskData.attachments : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.tasks.unshift(newTask);
      await saveCloudTask(newTask);

      // Automated branch general group chat alert synced to cloud
      const branchChat = db.chats.find(c => c.id === 'chat-branch-general');
      if (branchChat) {
        const alertMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          chatId: branchChat.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role as UserRole,
          content: `📌 New Task Allocated: "${newTask.title}" for Client ${newTask.clientName} (Assigned to: ${newTask.assignedToName})`,
          type: 'task_alert',
          timestamp: new Date().toISOString(),
          readBy: [currentUser.id],
          taskRef: {
            taskId: newTask.id,
            title: newTask.title,
            status: newTask.status,
            dueDate: newTask.dueDate
          }
        };
        db.messages.push(alertMsg);
        await saveCloudMessage(alertMsg);

        branchChat.lastMessage = {
          content: alertMsg.content,
          timestamp: alertMsg.timestamp,
          senderName: currentUser.name,
          type: 'task_alert'
        };
        await saveCloudChat(branchChat);
      }

      saveClientDb(db);
      return jsonResponse({ message: 'Task created successfully', task: newTask }, 201);
    }
  }

  // 9. Task Status Update: /api/tasks/:id/status
  const statusMatch = path.match(/^\/api\/tasks\/([^/]+)\/status$/);
  if (statusMatch && method === 'PUT') {
    const taskId = statusMatch[1];
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return jsonResponse({ error: 'Task not found' }, 404);

    const { status } = body || {};
    if (status) {
      task.status = status;
      if (status === 'Completed') {
        task.completedAt = new Date().toISOString();
      }
    }
    task.updatedAt = new Date().toISOString();
    await updateCloudTask(taskId, { status: task.status, updatedAt: task.updatedAt, completedAt: task.completedAt });
    saveClientDb(db);
    return jsonResponse({ message: 'Task status updated', task });
  }

  // 10. Task Audit Log / Edit: /api/tasks/:id
  const taskDetailMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDetailMatch) {
    const taskId = taskDetailMatch[1];
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);

    if (method === 'PUT') {
      if (taskIndex === -1) return jsonResponse({ error: 'Task not found' }, 404);
      const updated = {
        ...db.tasks[taskIndex],
        ...body,
        updatedAt: new Date().toISOString()
      };
      db.tasks[taskIndex] = updated;
      await updateCloudTask(taskId, updated);
      saveClientDb(db);
      return jsonResponse({ message: 'Task updated successfully', task: updated });
    }

    if (method === 'DELETE') {
      if (taskIndex === -1) return jsonResponse({ error: 'Task not found' }, 404);
      db.tasks.splice(taskIndex, 1);
      await deleteCloudTask(taskId);
      saveClientDb(db);
      return jsonResponse({ message: 'Task deleted successfully' });
    }
  }

  // 11. Chats (GET, POST with Cloud Sync)
  if (path === '/api/chats' || path === '/api/chats/direct') {
    if (method === 'GET') {
      try {
        const cloudChats = await getCloudChats();
        if (cloudChats.length > 0) {
          db.chats = cloudChats;
          saveClientDb(db);
        }
      } catch {}

      const userChats = db.chats.filter(c =>
        c.participants.includes('all') || c.participants.includes(userId)
      );

      const enhanced = userChats.map(c => {
        if (c.type === 'direct') {
          const otherId = c.participants.find(p => p !== userId) || '';
          const otherUser = db.users.find(u => u.id === otherId || u.email === otherId);
          const otherAllowed = db.allowedEmployees.find(e => e.email === otherId || e.name === otherId);
          return {
            ...c,
            otherParticipant: otherUser
              ? {
                  id: otherUser.id,
                  name: otherUser.name,
                  role: otherUser.role,
                  email: otherUser.email,
                  phone: otherUser.phone
                }
              : otherAllowed
              ? {
                  id: otherAllowed.email,
                  name: otherAllowed.name,
                  role: otherAllowed.role,
                  email: otherAllowed.email,
                  phone: otherAllowed.phone
                }
              : undefined
          };
        }
        return c;
      });

      return jsonResponse({ chats: enhanced });
    }

    if (method === 'POST') {
      const { name, type, participants, description, recipientId, recipientEmail } = body || {};

      if (type === 'direct' || recipientId || recipientEmail) {
        const targetId = recipientId || recipientEmail;
        const existingDirect = db.chats.find(
          c =>
            c.type === 'direct' &&
            c.participants.includes(userId) &&
            c.participants.includes(targetId)
        );

        if (existingDirect) {
          return jsonResponse({ chat: existingDirect });
        }

        const targetUser = db.users.find(u => u.id === targetId || u.email === targetId);
        const targetAllowed = db.allowedEmployees.find(e => e.email === targetId || e.name === targetId);
        const directName = targetUser?.name || targetAllowed?.name || name || 'Direct Chat';

        const newDirectChat: ChatGroup = {
          id: `chat-direct-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: directName,
          type: 'direct',
          participants: [userId, targetId],
          participantDetails: [],
          createdBy: userId,
          createdAt: new Date().toISOString(),
          lastMessage: {
            content: `Started direct chat with ${directName}`,
            timestamp: new Date().toISOString(),
            senderName: 'System',
            type: 'text'
          }
        };

        db.chats.unshift(newDirectChat);
        await saveCloudChat(newDirectChat);
        saveClientDb(db);
        return jsonResponse({ chat: newDirectChat });
      }

      // Group chat
      const newGroup: ChatGroup = {
        id: `chat-grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: name || 'New Branch Group',
        description: description || '',
        type: 'group',
        participants: Array.isArray(participants) ? Array.from(new Set([userId, ...participants])) : [userId],
        participantDetails: [],
        createdBy: userId,
        createdAt: new Date().toISOString(),
        lastMessage: {
          content: 'Group created.',
          timestamp: new Date().toISOString(),
          senderName: 'System',
          type: 'text'
        }
      };

      db.chats.unshift(newGroup);
      await saveCloudChat(newGroup);
      saveClientDb(db);
      return jsonResponse({ chat: newGroup });
    }
  }

  // 12. Messages for chat: /api/chats/:id/messages (Cloud Real-Time Sync)
  const chatMessagesMatch = path.match(/^\/api\/chats\/([^/]+)\/messages$/);
  if (chatMessagesMatch) {
    const chatId = chatMessagesMatch[1];

    if (method === 'GET') {
      try {
        const cloudMsgs = await getCloudMessages(chatId);
        if (cloudMsgs.length > 0) {
          // Merge with local messages
          const existingIds = new Set(db.messages.map(m => m.id));
          cloudMsgs.forEach(m => {
            if (!existingIds.has(m.id)) {
              db.messages.push(m);
            }
          });
          saveClientDb(db);
          return jsonResponse({ messages: cloudMsgs });
        }
      } catch {}

      const messages = db.messages.filter(m => m.chatId === chatId);
      return jsonResponse({ messages });
    }

    if (method === 'POST') {
      const sender = db.users.find(u => u.id === userId) || {
        id: userId || 'usr-guest',
        name: 'Team Member',
        role: 'Articles' as UserRole
      };

      const { content, type, taskRef, mediaUrl, mediaName, mediaSize } = body || {};

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        chatId,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        content: content || '',
        type: type || 'text',
        ...(taskRef ? { taskRef } : {}),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(mediaName ? { mediaName } : {}),
        ...(mediaSize !== undefined ? { mediaSize } : {}),
        timestamp: new Date().toISOString(),
        readBy: [sender.id]
      };

      db.messages.push(newMsg);
      await saveCloudMessage(newMsg);

      // Update chat's lastMessage
      const chat = db.chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessage = {
          content: newMsg.content || (newMsg.mediaName ? `Sent file: ${newMsg.mediaName}` : 'Sent an attachment'),
          timestamp: newMsg.timestamp,
          senderName: sender.name,
          type: newMsg.type
        };
        await saveCloudChat(chat);
      }

      saveClientDb(db);
      return jsonResponse({ message: newMsg }, 201);
    }
  }

  // 13. Colleagues (Cross-device cloud list)
  if (path === '/api/colleagues') {
    try {
      const cloudUsers = await getCloudUsers();
      if (cloudUsers.length > 0) {
        db.users = cloudUsers;
      }
      const cloudAllowed = await getCloudAllowedEmployees();
      if (cloudAllowed.length > 0) {
        db.allowedEmployees = cloudAllowed;
      }
      saveClientDb(db);
    } catch {}

    const registeredOthers = db.users
      .filter(u => u.id !== userId)
      .map(({ password: _, ...safe }) => ({
        id: safe.id,
        name: safe.name,
        email: safe.email,
        role: safe.role,
        phone: safe.phone,
        isRegistered: true,
        status: 'active'
      }));

    const registeredEmails = new Set(db.users.map(u => u.email.toLowerCase()));
    const uninvitedEmployees = db.allowedEmployees
      .filter(e => !registeredEmails.has(e.email.toLowerCase()))
      .map(e => ({
        id: e.email,
        name: e.name,
        email: e.email,
        role: e.role,
        phone: e.phone,
        isRegistered: false,
        status: 'pending'
      }));

    return jsonResponse({ colleagues: [...registeredOthers, ...uninvitedEmployees] });
  }

  // 14. Admin Employees (GET, POST with Cloud Firestore Sync)
  if (path === '/api/admin/employees') {
    if (method === 'GET') {
      try {
        const cloudAllowed = await getCloudAllowedEmployees();
        if (cloudAllowed.length > 0) {
          db.allowedEmployees = cloudAllowed;
        }
        const cloudUsers = await getCloudUsers();
        if (cloudUsers.length > 0) {
          db.users = cloudUsers;
        }
        const cloudLogs = await getCloudAuthLogs();
        if (cloudLogs.length > 0) {
          db.authLogs = cloudLogs;
        }
        saveClientDb(db);
      } catch {}

      const registered = db.users.map(({ password: _, ...safe }) => safe);
      return jsonResponse({
        allowedEmployees: db.allowedEmployees,
        registeredUsers: registered,
        auditLogs: db.authLogs
      });
    }

    if (method === 'POST') {
      const { name, email, role, phone } = body || {};
      if (!name || !email) {
        return jsonResponse({ error: 'Name and email are required' }, 400);
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const existing = db.allowedEmployees.find(e => e.email.toLowerCase() === cleanEmail);
      if (existing) {
        return jsonResponse({ error: 'This email is already in the authorized employees whitelist' }, 400);
      }

      const adminUser = db.users.find(u => u.id === userId) || { name: 'Admin' };
      const newAllowed: AllowedEmployee = {
        name: String(name).trim(),
        email: cleanEmail,
        role: (role as UserRole) || 'Articles',
        phone: phone ? String(phone).trim() : undefined,
        addedBy: adminUser.name,
        addedAt: new Date().toISOString()
      };

      db.allowedEmployees.push(newAllowed);
      await saveCloudAllowedEmployee(newAllowed);

      const logItem: AuthLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        email: cleanEmail,
        event: 'SIGNUP_EMPLOYEE',
        role: newAllowed.role,
        ip: 'Client Browser',
        timestamp: new Date().toISOString(),
        details: `Employee ${newAllowed.name} (${newAllowed.email}) whitelisted by ${adminUser.name} and synced to Firestore.`
      };
      db.authLogs.unshift(logItem);
      await saveCloudAuthLog(logItem);

      saveClientDb(db);
      return jsonResponse({ message: 'Employee added successfully', employee: newAllowed }, 201);
    }
  }

  // 15. Delete Admin Employee: /api/admin/employees/:email
  const delEmpMatch = path.match(/^\/api\/admin\/employees\/([^/]+)$/);
  if (delEmpMatch && method === 'DELETE') {
    const emailToDel = decodeURIComponent(delEmpMatch[1]).toLowerCase();
    db.allowedEmployees = db.allowedEmployees.filter(e => e.email.toLowerCase() !== emailToDel);
    await removeCloudAllowedEmployee(emailToDel);
    saveClientDb(db);
    return jsonResponse({ message: 'Employee removed successfully' });
  }

  // 16. Dashboard Analytics
  if (path === '/api/dashboard/analytics') {
    try {
      const cloudTasks = await getCloudTasks();
      if (cloudTasks.length > 0) {
        db.tasks = cloudTasks;
      }
      const cloudLogs = await getCloudAuthLogs();
      if (cloudLogs.length > 0) {
        db.authLogs = cloudLogs;
      }
      saveClientDb(db);
    } catch {}

    const total = db.tasks.length;
    const pending = db.tasks.filter(t => t.status === 'Pending').length;
    const inProgress = db.tasks.filter(t => t.status === 'In Progress').length;
    const inReview = db.tasks.filter(t => t.status === 'In Review').length;
    const completed = db.tasks.filter(t => t.status === 'Completed').length;
    const urgent = db.tasks.filter(t => t.priority === 'Urgent').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = db.tasks.filter(t => t.status !== 'Completed' && t.dueDate < todayStr).length;

    const catMap: Record<string, { total: number; completed: number; pending: number }> = {};
    db.tasks.forEach(t => {
      const cat = t.category || 'General';
      if (!catMap[cat]) catMap[cat] = { total: 0, completed: 0, pending: 0 };
      catMap[cat].total += 1;
      if (t.status === 'Completed') catMap[cat].completed += 1;
      else catMap[cat].pending += 1;
    });

    const complianceByCategory = Object.entries(catMap).map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100
    }));

    const memberMap: Record<string, { name: string; role: string; pending: number; completed: number }> = {};
    db.tasks.forEach(t => {
      const key = t.assignedToEmail || t.assignedToName || 'Unassigned';
      if (!memberMap[key]) {
        memberMap[key] = {
          name: t.assignedToName || key,
          role: t.assignedToRole || 'Articles',
          pending: 0,
          completed: 0
        };
      }
      if (t.status === 'Completed') memberMap[key].completed += 1;
      else memberMap[key].pending += 1;
    });

    const teamWorkload = Object.values(memberMap);

    return jsonResponse({
      metrics: {
        totalTasks: total,
        pendingTasks: pending,
        inProgressTasks: inProgress,
        inReviewTasks: inReview,
        completedTasks: completed,
        urgentTasks: urgent,
        overdueTasks: overdue,
        overallCompletionRate: total > 0 ? Math.round((completed / total) * 100) : 100
      },
      complianceByCategory,
      teamWorkload,
      recentAuthLogs: db.authLogs.slice(0, 10)
    });
  }

  // 17. Client-side File Upload (Accepts base64 data and returns direct data URL)
  if (path === '/api/upload' && method === 'POST') {
    const { fileName, fileType, fileData, fileSize } = body || {};
    return jsonResponse({
      url: fileData || '',
      name: fileName || 'file',
      type: fileType || 'application/octet-stream',
      size: fileSize || 0
    });
  }

  // Unknown route fallback
  return jsonResponse({ error: `Client API route not found: ${method} ${path}` }, 404);
}

/**
 * Safe client-side API fetch function.
 * Dispatches directly to in-browser & Firebase Cloud Firestore database for '/api/*' paths,
 * or forwards to window.fetch for external URLs.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let urlString = '';
  if (typeof input === 'string') {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else if (input && typeof (input as Request).url === 'string') {
    urlString = (input as Request).url;
  }

  if (urlString.startsWith('/api/') || urlString.includes('/api/')) {
    try {
      return await handleClientApiRequest(urlString, init);
    } catch (err: any) {
      console.error('[apiFetch] Handler error:', err);
      return new Response(
        JSON.stringify({ error: err?.message || 'Client mock API error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch(input, init);
  }
  return fetch(input, init);
}

/**
 * Initializes the client-side database and connects to Firebase Firestore.
 */
export function initClientApi(): void {
  if (typeof window === 'undefined') return;

  if ((window as any).__vchat_client_api_installed) {
    return;
  }
  (window as any).__vchat_client_api_installed = true;

  // Initialize DB in localStorage
  try {
    getClientDb();
  } catch (e) {
    console.warn('[clientDb] Init error:', e);
  }

  // Test Firestore connection & Seed defaults to Cloud
  testFirestoreConnection().then(() => {
    seedCloudDefaults(
      DEFAULT_ALLOWED_EMPLOYEES,
      DEFAULT_PREDEFINED_TASKS,
      DEFAULT_CHATS,
      DEFAULT_MESSAGES
    ).catch(e => console.warn('[Firestore] Seed notice:', e));

    // Subscribe to cloud updates to keep local db in sync across devices
    subscribeToCloudUsers((cloudUsers) => {
      const db = getClientDb();
      if (cloudUsers && cloudUsers.length > 0) {
        let changed = false;
        cloudUsers.forEach(cu => {
          const idx = db.users.findIndex(u => u.id === cu.id || u.email.toLowerCase() === cu.email.toLowerCase());
          if (idx >= 0) {
            db.users[idx] = {
              ...cu,
              password: cu.password || db.users[idx].password
            };
            changed = true;
          } else {
            db.users.push(cu);
            changed = true;
          }
        });
        if (changed) {
          saveClientDb(db);
        }
      }
    });

    subscribeToCloudTasks((tasks) => {
      const db = getClientDb();
      db.tasks = tasks;
      saveClientDb(db);
    });

    subscribeToCloudChats((chats) => {
      const db = getClientDb();
      db.chats = chats;
      saveClientDb(db);
    });

    subscribeToCloudAllowedEmployees((employees) => {
      const db = getClientDb();
      db.allowedEmployees = employees;
      saveClientDb(db);
    });
  }).catch(err => {
    console.warn('[Firestore] Connection setup error:', err);
  });

  // Safely attempt to patch window.fetch without throwing if fetch is a getter-only property
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch') || 
                       Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    
    if (!descriptor || descriptor.writable || descriptor.configurable || descriptor.set) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: (input: RequestInfo | URL, init?: RequestInit) => apiFetch(input, init),
          writable: true,
          configurable: true
        });
      } catch {}
    }
  } catch {}

  console.log('[V-Chat] Firebase Firestore real-time cloud sync engine initialized.');
}
