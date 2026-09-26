import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: Array<{
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    avatar?: string;
    isAdmin: boolean;
    status: 'active' | 'invited';
    createdAt: string;
    lastLoginAt?: string;
  }>;
  allowedEmployees: Array<{
    email: string;
    name: string;
    role: string;
    phone?: string;
    addedBy: string;
    addedAt: string;
  }>;
  authLogs: Array<{
    id: string;
    userId?: string;
    email: string;
    event: string;
    role?: string;
    ip?: string;
    timestamp: string;
    details?: string;
  }>;
  tasks: Array<any>;
  predefinedTasks: Array<any>;
  chats: Array<any>;
  messages: Array<any>;
}

const DEFAULT_PREDEFINED_TASKS = [
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

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      allowedEmployees: [
        {
          email: 'rohit.manager@varmavarma.com',
          name: 'Rohit Kulkarni',
          role: 'Manager',
          phone: '+91 98201 44321',
          addedBy: 'System Pre-seed',
          addedAt: new Date().toISOString()
        },
        {
          email: 'priya.article@varmavarma.com',
          name: 'Priya Deshmukh',
          role: 'Articles',
          phone: '+91 97654 88712',
          addedBy: 'System Pre-seed',
          addedAt: new Date().toISOString()
        },
        {
          email: 'kunal.assistant@varmavarma.com',
          name: 'Kunal Mehta',
          role: 'Paid Assistant',
          phone: '+91 98333 11200',
          addedBy: 'System Pre-seed',
          addedAt: new Date().toISOString()
        },
        {
          email: 'ananya.accountant@varmavarma.com',
          name: 'Ananya Sharma',
          role: 'Accountant',
          phone: '+91 98199 55432',
          addedBy: 'System Pre-seed',
          addedAt: new Date().toISOString()
        }
      ],
      authLogs: [],
      tasks: [],
      predefinedTasks: DEFAULT_PREDEFINED_TASKS,
      chats: [
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
            content: 'Welcome to Varma & Varma Mumbai Branch internal communication platform.',
            timestamp: new Date().toISOString(),
            senderName: 'System Notice',
            type: 'text'
          }
        },
        {
          id: 'chat-audit-team',
          name: 'Statutory & Tax Audit Wing',
          type: 'group',
          participants: ['all'],
          participantDetails: [],
          description: 'Working group for Tax Audit 44AB, Company Audit CARO 2020, and bank audits.',
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastMessage: {
            content: 'Please upload all 3CD draft annexures here before partner review.',
            timestamp: new Date().toISOString(),
            senderName: 'Audit Desk',
            type: 'text'
          }
        },
        {
          id: 'chat-gst-directtax',
          name: 'GST & Direct Tax Compliance',
          type: 'group',
          participants: ['all'],
          participantDetails: [],
          description: 'GSTR-3B, GSTR-1, Advance tax computation & ITR filings tracking.',
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastMessage: {
            content: 'GSTR-3B monthly cutoff reminder: Reconcile 2B by 18th without fail.',
            timestamp: new Date().toISOString(),
            senderName: 'Tax Desk',
            type: 'text'
          }
        }
      ],
      messages: [
        {
          id: 'msg-seed-1',
          chatId: 'chat-branch-general',
          senderId: 'sys-admin',
          senderName: 'Branch In-Charge (Admin)',
          senderRole: 'Partner',
          content: 'Good morning team! Welcome to the Varma & Varma Mumbai Branch internal portal. Please check your assigned tasks, update instructions, and post working papers directly in the respective chats.',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          readBy: []
        },
        {
          id: 'msg-seed-2',
          chatId: 'chat-branch-general',
          senderId: 'sys-admin',
          senderName: 'Branch In-Charge (Admin)',
          senderRole: 'Partner',
          content: 'Reminder: All articles and assistants must log progress and mark pending checklist items daily before 6:30 PM.',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          readBy: []
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, returning fallback', err);
    return {
      users: [],
      allowedEmployees: [],
      authLogs: [],
      tasks: [],
      predefinedTasks: DEFAULT_PREDEFINED_TASKS,
      chats: [],
      messages: []
    };
  }
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json', err);
  }
}

// Initial load
let db = loadDatabase();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Middleware with increased body limit for document/image attachments
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Handle malformed JSON body payloads safely
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
      return res.status(400).json({ error: 'Malformed JSON payload received in request body' });
    }
    next(err);
  });

  // Ensure JSON response header on all /api requests
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Static files for uploaded media
  app.use('/uploads', express.static(UPLOAD_DIR));

  // --- API ROUTES ---

  // Health Check
  app.get('/api/health', (req, res) => {
    try {
      res.json({
        status: 'ok',
        firm: 'Varma & Varma Mumbai Branch',
        usersCount: Array.isArray(db.users) ? db.users.length : 0,
        tasksCount: Array.isArray(db.tasks) ? db.tasks.length : 0,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Health check failed', details: err?.message });
    }
  });

  // Auth Status: check if first-time setup or registered users
  app.get('/api/auth/status', (req, res) => {
    try {
      if (!Array.isArray(db.users)) db.users = [];
      if (!Array.isArray(db.allowedEmployees)) db.allowedEmployees = [];
      if (!Array.isArray(db.predefinedTasks)) db.predefinedTasks = [];

      const totalUsers = db.users.length;
      const hasAdmin = db.users.some(u => u && u.isAdmin);
      const isFirstTimeSetup = totalUsers === 0 || !hasAdmin;

      res.status(200).json({
        totalUsers,
        hasAdmin,
        isFirstTimeSetup,
        allowedCount: db.allowedEmployees.length,
        predefinedTasksCount: db.predefinedTasks.length
      });
    } catch (err: any) {
      console.error('Error fetching auth status:', err);
      res.status(500).json({
        error: 'Failed to retrieve authentication status',
        totalUsers: 0,
        hasAdmin: false,
        isFirstTimeSetup: true
      });
    }
  });

  // Reset database for fresh First-Time Admin Account registration test
  app.post('/api/auth/reset-demo-db', (req, res) => {
    try {
      db.users = [];
      db.authLogs = [];
      db.tasks = [];
      if (!Array.isArray(db.chats)) db.chats = [];
      db.chats = [
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
      saveDatabase(db);
      res.status(200).json({
        message: 'Database reset to initial state. Ready for First-Time Admin Account registration.',
        totalUsers: 0,
        hasAdmin: false
      });
    } catch (err: any) {
      console.error('Failed to reset db:', err);
      res.status(500).json({ error: err.message || 'Failed to reset database' });
    }
  });

  // Sign up
  app.post('/api/auth/signup', (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body must be a valid JSON object' });
      }

      const { name, email, password, phone, role } = req.body;
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const clientIp = Array.isArray(rawIp) ? rawIp.join(', ') : String(rawIp);

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // Ensure data collections are initialized arrays
      if (!Array.isArray(db.users)) db.users = [];
      if (!Array.isArray(db.allowedEmployees)) db.allowedEmployees = [];
      if (!Array.isArray(db.authLogs)) db.authLogs = [];
      if (!Array.isArray(db.chats)) db.chats = [];

      const existing = db.users.find(u => u && u.email && u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
      }

      // Check if this registration is for the First-Time Admin Account:
      // True if zero users or no admin currently exists
      const hasAdmin = db.users.some(u => u && u.isAdmin);
      const isFirstUser = db.users.length === 0 || !hasAdmin;

      // Strict requirement:
      // "The first user to sign in will be admin user by default."
      // "Any other email id other than ones added by admin shall not be allowed the signup."
      if (!isFirstUser) {
        const allowed = db.allowedEmployees.find(e => e && e.email && e.email.toLowerCase() === cleanEmail);
        if (!allowed) {
          // Log rejected signup attempt
          db.authLogs.unshift({
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            email: cleanEmail,
            event: 'SIGNUP_BLOCKED_NOT_WHITELISTED',
            ip: clientIp,
            timestamp: new Date().toISOString(),
            details: `Attempted signup blocked: Email ${cleanEmail} is not authorized by Admin.`
          });
          saveDatabase(db);

          return res.status(403).json({
            error: 'Access Denied: Only employees whose email IDs have been registered by Varma & Varma Admin can sign up. Please contact branch administration.'
          });
        }
      }

      // Role determination: First user is Partner (Admin). Subsequent users take admin-assigned role or selected role from whitelist.
      let userRole = 'Partner';
      let isAdmin = false;

      if (isFirstUser) {
        userRole = 'Partner';
        isAdmin = true;
      } else {
        const allowed = db.allowedEmployees.find(e => e && e.email && e.email.toLowerCase() === cleanEmail);
        userRole = allowed?.role || role || 'Articles';
        isAdmin = false;
      }

      const newUser = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: String(name).trim(),
        email: cleanEmail,
        password: String(password),
        role: userRole,
        phone: phone ? String(phone).trim() : undefined,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        isAdmin,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      db.users.push(newUser);

      // If allowed employee was invited, update their status
      db.allowedEmployees = db.allowedEmployees.map(e => 
        e && e.email && e.email.toLowerCase() === cleanEmail ? { ...e, status: 'active' } : e
      );

      // Save auth log safely
      db.authLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: newUser.id,
        email: cleanEmail,
        event: isFirstUser ? 'SIGNUP_ADMIN' : 'SIGNUP_EMPLOYEE',
        role: userRole,
        ip: clientIp,
        timestamp: new Date().toISOString(),
        details: `${isFirstUser ? 'Primary Admin/Partner' : 'Employee (' + userRole + ')'} successfully registered.`
      });

      // Auto-add employee to branch general chat safely
      db.chats.forEach(chat => {
        if (chat && Array.isArray(chat.participants)) {
          if (chat.participants.includes('all') && !chat.participants.includes(newUser.id)) {
            chat.participants.push(newUser.id);
          }
        }
      });

      saveDatabase(db);

      const { password: _, ...safeUser } = newUser;
      return res.status(201).json({
        message: isFirstUser ? 'First-time Admin account created successfully' : 'Employee account created successfully',
        user: safeUser
      });
    } catch (err: any) {
      console.error('Error during /api/auth/signup:', err);
      return res.status(500).json({
        error: err?.message || 'Internal server error during registration'
      });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body || {};
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const clientIp = Array.isArray(rawIp) ? rawIp.join(', ') : String(rawIp);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!Array.isArray(db.users)) db.users = [];
      if (!Array.isArray(db.authLogs)) db.authLogs = [];

      const cleanEmail = String(email).trim().toLowerCase();
      const user = db.users.find(u => u && u.email && u.email.toLowerCase() === cleanEmail);

      if (!user || user.password !== String(password)) {
        // Log failed login
        db.authLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          email: cleanEmail,
          event: 'LOGIN_FAILED',
          ip: clientIp,
          timestamp: new Date().toISOString(),
          details: 'Invalid password or unknown email ID'
        });
        saveDatabase(db);

        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update lastLoginAt
      user.lastLoginAt = new Date().toISOString();

      // Log successful login
      db.authLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: user.id,
        email: cleanEmail,
        event: 'LOGIN_SUCCESS',
        role: user.role,
        ip: clientIp,
        timestamp: new Date().toISOString(),
        details: `User ${user.name} logged in from ${clientIp}`
      });

      saveDatabase(db);

      const { password: _, ...safeUser } = user;
      return res.status(200).json({
        message: 'Login successful',
        user: safeUser
      });
    } catch (err: any) {
      console.error('Error during /api/auth/login:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error during login' });
    }
  });

  // Employee Management (Admin only)
  // "The admin shall be able to add employees and also email id of employee."
  app.get('/api/admin/employees', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized. Only Admin can access Employee Management.' });
    }

    res.json({
      registeredUsers: db.users.map(({ password, ...u }) => u),
      allowedEmployees: db.allowedEmployees
    });
  });

  // Branch Directory / Colleagues List for All Team Members (for direct chat & task assignments)
  app.get('/api/colleagues', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const colleaguesMap = new Map<string, any>();

    // 1. Registered active users
    db.users.forEach(u => {
      colleaguesMap.set(u.email.toLowerCase(), {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || '',
        isAdmin: u.isAdmin,
        status: 'active',
        isRegistered: true,
        lastLoginAt: u.lastLoginAt
      });
    });

    // 2. Allowed employees from whitelist
    db.allowedEmployees.forEach(e => {
      const emailLower = e.email.toLowerCase();
      if (!colleaguesMap.has(emailLower)) {
        colleaguesMap.set(emailLower, {
          id: `emp-${emailLower.replace(/[^a-z0-9]/g, '-')}`,
          name: e.name,
          email: e.email,
          role: e.role,
          phone: e.phone || '',
          isAdmin: e.role === 'Partner' || e.role === 'Admin',
          status: 'active',
          isRegistered: false
        });
      }
    });

    const colleagues = Array.from(colleaguesMap.values());
    res.json({ colleagues });
  });

  app.post('/api/admin/employees', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const adminUser = db.users.find(u => u.id === requesterId);

    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Only Admin can add employees.' });
    }

    const { email, name, role, phone } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, Name, and Role are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if already in whitelist
    const alreadyAllowed = db.allowedEmployees.some(e => e.email.toLowerCase() === cleanEmail);
    if (alreadyAllowed) {
      return res.status(400).json({ error: 'This email is already in the employee authorized whitelist.' });
    }

    // Add to whitelist
    const newAllowed = {
      email: cleanEmail,
      name: String(name).trim(),
      role: String(role),
      phone: phone ? String(phone).trim() : '',
      addedBy: adminUser.name,
      addedAt: new Date().toISOString()
    };
    db.allowedEmployees.push(newAllowed);

    // Also if an existing user was already created, update their role
    const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      existingUser.role = String(role);
    }

    saveDatabase(db);

    res.status(201).json({
      message: `Employee ${name} (${cleanEmail}) successfully added to firm roster with role ${role}.`,
      employee: newAllowed
    });
  });

  app.delete('/api/admin/employees/:email', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const adminUser = db.users.find(u => u.id === requesterId);

    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Only Admin can remove employees.' });
    }

    const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
    db.allowedEmployees = db.allowedEmployees.filter(e => e.email.toLowerCase() !== targetEmail);

    saveDatabase(db);
    res.json({ message: 'Employee removed from whitelist successfully' });
  });

  // Auth Logs (Admin Only)
  app.get('/api/admin/auth-logs', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized. Only Admin can view Audit & Sign-in logs.' });
    }

    res.json({ logs: db.authLogs.slice(0, 100) });
  });

  // --- TASKS API ---
  // "The employee should be able to see and edit pending task allocated part of instructions to him only and not to other employees. Only admin gets access to entire employee dashboard."
  app.get('/api/tasks', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Please log in to view tasks.' });
    }

    if (user.isAdmin) {
      // Admin sees all tasks
      return res.json({ tasks: db.tasks });
    }

    // Strict constraint: Employee sees only their allocated tasks
    const employeeTasks = db.tasks.filter(
      t => t.assignedToId === user.id || t.assignedToEmail?.toLowerCase() === user.email.toLowerCase()
    );
    res.json({ tasks: employeeTasks });
  });

  // Create Task (Admin or Manager/Partner can allocate)
  app.post('/api/tasks', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      title,
      description,
      category,
      clientName,
      clientPAN_GSTIN,
      assignedToId,
      dueDate,
      priority,
      instructions,
      checklist,
      reminders
    } = req.body;

    if (!title || !clientName) {
      return res.status(400).json({ error: 'Task title and Client Name are required.' });
    }

    // Resolve assignee
    const assignee = db.users.find(u => u.id === assignedToId) || 
      db.allowedEmployees.find(e => e.email.toLowerCase() === String(assignedToId).toLowerCase());

    const assignedToName = assignee ? assignee.name : 'Unassigned';
    const assignedToEmail = assignee ? assignee.email : '';
    const assignedToRole = assignee ? assignee.role : 'Articles';

    const newTask = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      category: category || 'Statutory Audit',
      clientName: String(clientName).trim(),
      clientPAN_GSTIN: clientPAN_GSTIN ? String(clientPAN_GSTIN).trim().toUpperCase() : '',
      assignedToId: assignedToId || '',
      assignedToName,
      assignedToEmail,
      assignedToRole,
      assignedById: user.id,
      assignedByName: user.name,
      dueDate: dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      priority: priority || 'Medium',
      status: 'Pending',
      instructions: instructions || '',
      checklist: Array.isArray(checklist) ? checklist : [],
      reminders: Array.isArray(reminders) ? reminders : [],
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tasks.unshift(newTask);

    // Auto-post task alert into Branch General chat and/or create a task-specific chat!
    const taskAlertMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      chatId: 'chat-branch-general',
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: `📋 New Task Allocated: "${newTask.title}" for Client "${newTask.clientName}" assigned to ${assignedToName} (${assignedToRole}). Due date: ${newTask.dueDate}.`,
      type: 'task_alert',
      timestamp: new Date().toISOString(),
      readBy: [],
      taskRef: {
        taskId: newTask.id,
        title: newTask.title,
        status: newTask.status,
        dueDate: newTask.dueDate
      }
    };
    db.messages.push(taskAlertMessage);

    saveDatabase(db);
    res.status(201).json({ message: 'Task allocated successfully', task: newTask });
  });

  // Update Task (Status, instructions, checklist, attachments)
  // "The employee should be able to see and edit pending task allocated part of instructions to him only and not to other employees."
  app.put('/api/tasks/:id', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const currentTask = db.tasks[taskIndex];

    // Check permissions
    const isOwnerEmployee = currentTask.assignedToId === user.id || currentTask.assignedToEmail?.toLowerCase() === user.email.toLowerCase();
    if (!user.isAdmin && !isOwnerEmployee) {
      return res.status(403).json({ error: 'Unauthorized: You can only view and edit tasks allocated specifically to you.' });
    }

    const {
      status,
      checklist,
      instructions,
      comments,
      attachments,
      priority,
      dueDate,
      title,
      category,
      clientName
    } = req.body;

    // Status change tracking
    const oldStatus = currentTask.status;

    if (user.isAdmin) {
      // Admin can update all fields
      db.tasks[taskIndex] = {
        ...currentTask,
        title: title !== undefined ? title : currentTask.title,
        category: category !== undefined ? category : currentTask.category,
        clientName: clientName !== undefined ? clientName : currentTask.clientName,
        status: status !== undefined ? status : currentTask.status,
        instructions: instructions !== undefined ? instructions : currentTask.instructions,
        checklist: checklist !== undefined ? checklist : currentTask.checklist,
        attachments: attachments !== undefined ? attachments : currentTask.attachments,
        comments: comments !== undefined ? comments : currentTask.comments,
        priority: priority !== undefined ? priority : currentTask.priority,
        dueDate: dueDate !== undefined ? dueDate : currentTask.dueDate,
        completedAt: status === 'Completed' ? new Date().toISOString() : (status ? undefined : currentTask.completedAt),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Employee can update status, checklist items, attachments, comments
      db.tasks[taskIndex] = {
        ...currentTask,
        status: status !== undefined ? status : currentTask.status,
        checklist: checklist !== undefined ? checklist : currentTask.checklist,
        attachments: attachments !== undefined ? attachments : currentTask.attachments,
        comments: comments !== undefined ? comments : currentTask.comments,
        completedAt: status === 'Completed' ? new Date().toISOString() : (status ? undefined : currentTask.completedAt),
        updatedAt: new Date().toISOString()
      };
    }

    const updatedTask = db.tasks[taskIndex];

    // If status changed, post a message in Branch chat so team & admin get regular update
    if (status && status !== oldStatus) {
      db.messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        chatId: 'chat-branch-general',
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        content: `🔄 Task Status Update: "${updatedTask.title}" (${updatedTask.clientName}) moved from [${oldStatus}] ➔ [${status}] by ${user.name}.`,
        type: 'task_alert',
        timestamp: new Date().toISOString(),
        readBy: [],
        taskRef: {
          taskId: updatedTask.id,
          title: updatedTask.title,
          status: updatedTask.status,
          dueDate: updatedTask.dueDate
        }
      });
    }

    saveDatabase(db);
    res.json({ message: 'Task updated successfully', task: updatedTask });
  });

  // Delete Task (Admin Only)
  app.delete('/api/tasks/:id', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Only admin can delete tasks' });
    }

    db.tasks = db.tasks.filter(t => t.id !== req.params.id);
    saveDatabase(db);
    res.json({ message: 'Task deleted successfully' });
  });

  // --- WHATSAPP-LIKE CHATS & MESSAGES API ---

  app.get('/api/chats', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build chats list:
    // Direct chats belong strictly to the participants
    // Group chats belong to participants, 'all', or branch admin
    const userChats = db.chats.filter(c => {
      if (c.type === 'direct') {
        return c.participants.includes(user.id);
      }
      return c.participants.includes('all') || c.participants.includes(user.id) || user.isAdmin;
    });

    // Calculate unread or last message, and dynamically populate direct chat names
    const formatted = userChats.map(c => {
      const chatMessages = db.messages.filter(m => m.chatId === c.id);
      const lastMsg = chatMessages[chatMessages.length - 1];
      const unreadCount = chatMessages.filter(m => m.senderId !== user.id && !m.readBy?.includes(user.id)).length;

      let displayName = c.name;
      let otherParticipant = undefined;

      if (c.type === 'direct') {
        const otherId = c.participants.find((pid: string) => pid !== user.id);
        const otherUser = db.users.find(u => u.id === otherId);
        if (otherUser) {
          displayName = otherUser.name;
          otherParticipant = {
            id: otherUser.id,
            name: otherUser.name,
            role: otherUser.role,
            email: otherUser.email,
            phone: otherUser.phone || ''
          };
        } else {
          const detail = c.participantDetails?.find((d: any) => d.id !== user.id);
          if (detail) {
            displayName = detail.name;
            otherParticipant = detail;
          }
        }
      }

      return {
        ...c,
        name: displayName,
        otherParticipant,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          timestamp: lastMsg.timestamp,
          senderName: lastMsg.senderName,
          type: lastMsg.type
        } : c.lastMessage,
        unreadCount
      };
    });

    res.json({ chats: formatted });
  });

  // Start or get 1-on-1 Direct Chat between two users
  app.post('/api/chats/direct', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { recipientId, recipientEmail } = req.body;
    if (!recipientId && !recipientEmail) {
      return res.status(400).json({ error: 'Recipient colleague ID or email is required' });
    }

    // Find recipient user in db.users
    let recipient = recipientId ? db.users.find(u => u.id === recipientId) : null;
    if (!recipient && recipientEmail) {
      recipient = db.users.find(u => u.email.toLowerCase() === String(recipientEmail).trim().toLowerCase());
    }

    // If recipient is an allowed employee who hasn't registered yet, provision them
    if (!recipient) {
      const allowed = db.allowedEmployees.find(e => 
        (recipientEmail && e.email.toLowerCase() === String(recipientEmail).trim().toLowerCase()) ||
        (recipientId && ((e as any).id === recipientId || recipientId.includes(e.email.toLowerCase().replace(/[^a-z0-9]/g, '-'))))
      );

      if (allowed) {
        recipient = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: allowed.name,
          email: allowed.email,
          role: allowed.role,
          phone: allowed.phone || '',
          isAdmin: allowed.role === 'Partner' || allowed.role === 'Admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          password: 'Password@123'
        };
        db.users.push(recipient);
        saveDatabase(db);
      }
    }

    if (!recipient) {
      return res.status(404).json({ error: 'Colleague not found' });
    }

    if (recipient.id === user.id) {
      return res.status(400).json({ error: 'Cannot start a direct chat with yourself' });
    }

    // Check if direct chat already exists between these 2 users
    const existing = db.chats.find(c => 
      c.type === 'direct' && 
      c.participants.includes(user.id) && 
      c.participants.includes(recipient!.id) &&
      c.participants.length === 2
    );

    if (existing) {
      return res.json({ 
        chat: {
          ...existing,
          name: recipient.name,
          otherParticipant: {
            id: recipient.id,
            name: recipient.name,
            role: recipient.role,
            email: recipient.email,
            phone: recipient.phone || ''
          }
        },
        alreadyExists: true
      });
    }

    // Create new direct 1-on-1 chat
    const newChat = {
      id: `chat-direct-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${user.name} & ${recipient.name}`,
      type: 'direct',
      participants: [user.id, recipient.id],
      participantDetails: [
        { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone || '' },
        { id: recipient.id, name: recipient.name, role: recipient.role, email: recipient.email, phone: recipient.phone || '' }
      ],
      description: `Direct 1-on-1 conversation between ${user.name} and ${recipient.name}`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      lastMessage: {
        content: `Direct conversation started with ${recipient.name}`,
        timestamp: new Date().toISOString(),
        senderName: user.name,
        type: 'text'
      }
    };

    db.chats.push(newChat);

    db.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      chatId: newChat.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: `Started direct 1-on-1 chat with ${recipient.name} (${recipient.role}).`,
      type: 'text',
      timestamp: new Date().toISOString(),
      readBy: [user.id]
    });

    saveDatabase(db);

    res.status(201).json({ 
      chat: {
        ...newChat,
        name: recipient.name,
        otherParticipant: {
          id: recipient.id,
          name: recipient.name,
          role: recipient.role,
          email: recipient.email,
          phone: recipient.phone || ''
        }
      },
      alreadyExists: false
    });
  });

  app.post('/api/chats', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, participants, description, type, recipientId } = req.body;

    if (type === 'direct' && recipientId) {
      // Delegate to direct chat creation
      const recipient = db.users.find(u => u.id === recipientId);
      if (recipient) {
        const existing = db.chats.find(c => 
          c.type === 'direct' && 
          c.participants.includes(user.id) && 
          c.participants.includes(recipient.id)
        );
        if (existing) {
          return res.json({ chat: existing, alreadyExists: true });
        }
      }
    }

    if (!name && type !== 'direct') {
      return res.status(400).json({ error: 'Chat/Group name is required' });
    }

    const participantList = Array.isArray(participants) ? Array.from(new Set([...participants, user.id])) : [user.id];
    const details = participantList.map(pid => {
      const u = db.users.find(usr => usr.id === pid);
      return u ? { id: u.id, name: u.name, role: u.role, email: u.email, phone: u.phone || '' } : { id: pid, name: 'Member', role: 'Articles', email: '' };
    });

    const newChat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: String(name || 'Chat').trim(),
      type: type || 'group',
      participants: participantList,
      participantDetails: details,
      description: description || '',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      lastMessage: {
        content: type === 'direct' ? `Direct chat started` : `Group created by ${user.name}`,
        timestamp: new Date().toISOString(),
        senderName: user.name,
        type: 'text'
      }
    };

    db.chats.push(newChat);

    db.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      chatId: newChat.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: type === 'direct' ? `Direct chat started.` : `Group "${newChat.name}" created for Varma & Varma Mumbai team members.`,
      type: 'text',
      timestamp: new Date().toISOString(),
      readBy: [user.id]
    });

    saveDatabase(db);
    res.status(201).json({ chat: newChat });
  });

  // Get Messages for a Chat
  app.get('/api/chats/:chatId/messages', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);
    const { chatId } = req.params;

    const messages = db.messages.filter(m => m.chatId === chatId);

    // Mark as read
    if (user) {
      messages.forEach(m => {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(user.id)) {
          m.readBy.push(user.id);
        }
      });
      saveDatabase(db);
    }

    res.json({ messages });
  });

  // Post Message (Text, Image, Document, Audio)
  app.post('/api/chats/:chatId/messages', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { chatId } = req.params;
    const { content, type, mediaUrl, mediaName, mediaSize, mediaType, taskRef } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      chatId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: content ? String(content).trim() : '',
      type: type || (mediaUrl ? (mediaType?.startsWith('image/') ? 'image' : 'document') : 'text'),
      mediaUrl: mediaUrl || undefined,
      mediaName: mediaName || undefined,
      mediaSize: mediaSize || undefined,
      mediaType: mediaType || undefined,
      timestamp: new Date().toISOString(),
      readBy: [user.id],
      taskRef: taskRef || undefined
    };

    db.messages.push(newMessage);

    // Update chat lastMessage
    const chat = db.chats.find(c => c.id === chatId);
    if (chat) {
      chat.lastMessage = {
        content: newMessage.content || (newMessage.mediaName ? `📎 ${newMessage.mediaName}` : 'Shared media'),
        timestamp: newMessage.timestamp,
        senderName: user.name,
        type: newMessage.type
      };
    }

    saveDatabase(db);
    res.status(201).json({ message: newMessage });
  });

  // Media / Document / Image Upload
  app.post('/api/upload', (req, res) => {
    const { fileName, fileType, dataBase64 } = req.body;

    if (!dataBase64 || !fileName) {
      return res.status(400).json({ error: 'File data and file name are required' });
    }

    try {
      // Remove base64 header if present
      const base64Data = dataBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, safeName);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${safeName}`;
      res.json({
        url: fileUrl,
        name: fileName,
        size: buffer.length,
        type: fileType || 'application/octet-stream'
      });
    } catch (err) {
      console.error('File upload failed:', err);
      // Fallback: return data url directly
      res.json({
        url: dataBase64,
        name: fileName,
        size: dataBase64.length,
        type: fileType || 'application/octet-stream'
      });
    }
  });

  // Predefined CA firm tasks catalog
  app.get('/api/predefined-tasks', (req, res) => {
    res.json({ tasks: db.predefinedTasks });
  });

  app.post('/api/predefined-tasks', (req, res) => {
    const { title, category, defaultPriority, suggestedChecklist, standardInstructions, statutoryDeadlineInfo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const newTemplate = {
      id: `pt-${Date.now()}`,
      title: String(title).trim(),
      category: category || 'General CA Practice',
      defaultPriority: defaultPriority || 'Medium',
      suggestedChecklist: Array.isArray(suggestedChecklist) ? suggestedChecklist : [],
      standardInstructions: standardInstructions || '',
      statutoryDeadlineInfo: statutoryDeadlineInfo || ''
    };

    db.predefinedTasks.push(newTemplate);
    saveDatabase(db);
    res.status(201).json({ template: newTemplate });
  });

  // Visual Dashboard & Analytics API
  // "Only admin gets access to entire employee dashboard."
  app.get('/api/dashboard/analytics', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (!user.isAdmin) {
      // Employee specific stats
      const myTasks = db.tasks.filter(t => t.assignedToId === user.id || t.assignedToEmail?.toLowerCase() === user.email.toLowerCase());
      const pendingCount = myTasks.filter(t => t.status === 'Pending').length;
      const inProgressCount = myTasks.filter(t => t.status === 'In Progress').length;
      const inReviewCount = myTasks.filter(t => t.status === 'In Review').length;
      const completedCount = myTasks.filter(t => t.status === 'Completed').length;
      const overdueCount = myTasks.filter(t => t.status !== 'Completed' && t.dueDate < todayStr).length;

      return res.json({
        roleScope: 'employee',
        employeeName: user.name,
        totalAllocated: myTasks.length,
        pendingCount,
        inProgressCount,
        inReviewCount,
        completedCount,
        overdueCount,
        recentTasks: myTasks.slice(0, 5)
      });
    }

    // Full Admin Dashboard & Analytics
    const allTasks = db.tasks;
    const totalTasks = allTasks.length;
    const pendingCount = allTasks.filter(t => t.status === 'Pending').length;
    const inProgressCount = allTasks.filter(t => t.status === 'In Progress').length;
    const inReviewCount = allTasks.filter(t => t.status === 'In Review').length;
    const completedCount = allTasks.filter(t => t.status === 'Completed').length;
    const overdueCount = allTasks.filter(t => t.status !== 'Completed' && t.dueDate < todayStr).length;

    // Team Member Wise Breakdown
    const memberStats = db.allowedEmployees.map(emp => {
      const empUser = db.users.find(u => u.email.toLowerCase() === emp.email.toLowerCase());
      const empTasks = allTasks.filter(t => 
        t.assignedToEmail?.toLowerCase() === emp.email.toLowerCase() || 
        (empUser && t.assignedToId === empUser.id)
      );

      const empPending = empTasks.filter(t => t.status === 'Pending').length;
      const empInProgress = empTasks.filter(t => t.status === 'In Progress').length;
      const empInReview = empTasks.filter(t => t.status === 'In Review').length;
      const empCompleted = empTasks.filter(t => t.status === 'Completed').length;
      const empOverdue = empTasks.filter(t => t.status !== 'Completed' && t.dueDate < todayStr).length;
      const completionRate = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;

      return {
        email: emp.email,
        name: emp.name,
        role: emp.role,
        isRegistered: !!empUser,
        totalTasks: empTasks.length,
        pending: empPending,
        inProgress: empInProgress,
        inReview: empInReview,
        completed: empCompleted,
        overdue: empOverdue,
        completionRate
      };
    });

    // Also include any registered users not in allowed list (e.g. initial admin)
    db.users.forEach(u => {
      if (!memberStats.some(m => m.email.toLowerCase() === u.email.toLowerCase())) {
        const uTasks = allTasks.filter(t => t.assignedToId === u.id || t.assignedToEmail?.toLowerCase() === u.email.toLowerCase());
        const uPending = uTasks.filter(t => t.status === 'Pending').length;
        const uInProgress = uTasks.filter(t => t.status === 'In Progress').length;
        const uInReview = uTasks.filter(t => t.status === 'In Review').length;
        const uCompleted = uTasks.filter(t => t.status === 'Completed').length;
        const uOverdue = uTasks.filter(t => t.status !== 'Completed' && t.dueDate < todayStr).length;
        const completionRate = uTasks.length > 0 ? Math.round((uCompleted / uTasks.length) * 100) : 0;

        memberStats.push({
          email: u.email,
          name: u.name,
          role: u.role,
          isRegistered: true,
          totalTasks: uTasks.length,
          pending: uPending,
          inProgress: uInProgress,
          inReview: uInReview,
          completed: uCompleted,
          overdue: uOverdue,
          completionRate
        });
      }
    });

    // Category Wise Breakdown
    const categoryMap: Record<string, number> = {};
    allTasks.forEach(t => {
      const cat = t.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    // Priority Wise Breakdown
    const priorityMap: Record<string, number> = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    allTasks.forEach(t => {
      if (t.priority && priorityMap[t.priority] !== undefined) {
        priorityMap[t.priority]++;
      }
    });

    // Role Wise Task Distribution
    const roleMap: Record<string, number> = {
      Partner: 0,
      Manager: 0,
      Accountant: 0,
      'Paid Assistant': 0,
      Articles: 0
    };
    allTasks.forEach(t => {
      if (t.assignedToRole && roleMap[t.assignedToRole] !== undefined) {
        roleMap[t.assignedToRole]++;
      }
    });

    res.json({
      roleScope: 'admin',
      totalTasks,
      pendingCount,
      inProgressCount,
      inReviewCount,
      completedCount,
      overdueCount,
      memberStats,
      categoryStats: categoryMap,
      priorityStats: priorityMap,
      roleStats: roleMap,
      recentActivity: db.authLogs.slice(0, 10)
    });
  });

  // Sample Data Seeder endpoint (convenient helper for quick demonstration of full firm workflow)
  app.post('/api/admin/seed-sample-tasks', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const user = db.users.find(u => u.id === requesterId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const sampleTasks = [
      {
        id: `tsk-seed-${Date.now()}-1`,
        title: 'Statutory Tax Audit u/s 44AB & Form 3CD',
        description: 'Comprehensive tax audit clause 1 to 44 verification, depreciation schedule & disallowances.',
        category: 'Statutory Audit',
        clientName: 'Tata Consumer Products Ltd (Mumbai Unit)',
        clientPAN_GSTIN: '27AAACT2345K1Z8',
        assignedToId: 'rohit.manager@varmavarma.com',
        assignedToName: 'Rohit Kulkarni',
        assignedToEmail: 'rohit.manager@varmavarma.com',
        assignedToRole: 'Manager',
        assignedById: user.id,
        assignedByName: user.name,
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        priority: 'Urgent',
        status: 'In Progress',
        instructions: 'Scrutinize Clause 21(d) cash payments above Rs 10,000 and match Clause 34 TDS with 26AS. Keep working paper file signed.',
        checklist: [
          { id: 'c1', text: 'Obtain trial balance and audited balance sheet', completed: true },
          { id: 'c2', text: 'Verify clause 13 method of accounting', completed: true },
          { id: 'c3', text: 'Verify clause 21 disallowance u/s 40(a)(ia)', completed: false },
          { id: 'c4', text: 'Prepare draft Form 3CD for Partner signoff', completed: false }
        ],
        reminders: [{ id: 'r1', datetime: '2026-09-22 10:00', note: 'Draft review with partner', sent: false }],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: `tsk-seed-${Date.now()}-2`,
        title: 'GSTR-3B Filing & 2B ITC Reconciliation',
        description: 'Monthly GSTR-3B return filing, reconciliation with purchase ledger and tax payment challan.',
        category: 'GST & Indirect Tax',
        clientName: 'Reliance Retail Logistics Hub (Bhiwandi)',
        clientPAN_GSTIN: '27AABCR9876M1Z2',
        assignedToId: 'priya.article@varmavarma.com',
        assignedToName: 'Priya Deshmukh',
        assignedToEmail: 'priya.article@varmavarma.com',
        assignedToRole: 'Articles',
        assignedById: user.id,
        assignedByName: user.name,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        priority: 'High',
        status: 'Pending',
        instructions: 'Do not claim blocked credit under Sec 17(5) for motor vehicles. Verify RCM liability on GTA freight bills.',
        checklist: [
          { id: 'c1', text: 'Download 2B for current month', completed: true },
          { id: 'c2', text: 'Run reconciliation with Tally ERP purchase register', completed: false },
          { id: 'c3', text: 'Compute net cash liability after ITC utilization', completed: false },
          { id: 'c4', text: 'Send confirmation email to CFO before filing', completed: false }
        ],
        reminders: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: `tsk-seed-${Date.now()}-3`,
        title: 'Bank Concurrent Audit - Stock & Book Debts Inspection',
        description: 'Monthly physical stock inspection, drawing power calculation & DP register verification.',
        category: 'Banking & Concurrent Audit',
        clientName: 'State Bank of India (Nariman Point Large Corporate Branch)',
        clientPAN_GSTIN: '27AAACS0011H1Z5',
        assignedToId: 'kunal.assistant@varmavarma.com',
        assignedToName: 'Kunal Mehta',
        assignedToEmail: 'kunal.assistant@varmavarma.com',
        assignedToRole: 'Paid Assistant',
        assignedById: user.id,
        assignedByName: user.name,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
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
        id: `tsk-seed-${Date.now()}-4`,
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
        dueDate: new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
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

    sampleTasks.forEach(task => {
      if (!db.tasks.some(t => t.title === task.title && t.clientName === task.clientName)) {
        db.tasks.unshift(task);
      }
    });

    saveDatabase(db);
    res.json({ message: 'Sample CA tasks loaded successfully', count: db.tasks.length });
  });

  // --- 404 HANDLER FOR API ENDPOINTS (Ensures unknown /api requests never return HTML or empty response) ---
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.path}`,
      status: 404
    });
  });

  // --- GLOBAL EXPRESS ERROR HANDLER (Always returns valid JSON with proper error codes) ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Server Error] ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
    res.status(statusCode).json({
      error: err?.message || 'An internal server error occurred',
      status: statusCode
    });
  });

  // --- VITE MIDDLEWARE (Full-Stack Express + Vite) ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!doctype html><html><head><title>V-Chat</title></head><body><div id="root"></div></body></html>');
      }
    });
  }

  httpServer.on('error', (err: any) => {
    console.error('Server error:', err);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Varma & Varma Mumbai Branch Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
