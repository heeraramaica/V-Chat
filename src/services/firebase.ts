/**
 * Firebase Firestore Cloud Service for Varma & Varma CA Practice
 * 
 * Provides real-time multi-device cloud data synchronization for:
 * - Staff user accounts & Partners
 * - Authorized employees whitelist roster
 * - Audit, tax & compliance tasks with live status updates
 * - WhatsApp-style team group chats and 1-on-1 staff direct messages
 * - Security logs & predefined statutory task templates
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  setLogLevel
} from 'firebase/firestore';
import bundledFirebaseConfig from '../../firebase-applet-config.json';
import {
  User,
  AllowedEmployee,
  AuthLog,
  Task,
  PredefinedTaskTemplate,
  ChatGroup,
  ChatMessage
} from '../types';

// Silence transient connection noise in sandboxed preview environments
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Public client-side configuration with fallback constants for static hosts (Vercel, Netlify, Cloud Run)
export const FIREBASE_CONFIG = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || bundledFirebaseConfig?.projectId || "aesthetic-host-gmn89",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || bundledFirebaseConfig?.appId || "1:612561735364:web:33ec7224bfe596031f8391",
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || bundledFirebaseConfig?.apiKey || "AIzaSyDlUaJIrDfp7kLQqW78WHbYvv6jX9LBmis",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || bundledFirebaseConfig?.authDomain || "aesthetic-host-gmn89.firebaseapp.com",
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || bundledFirebaseConfig?.firestoreDatabaseId || "ai-studio-vchat-b540d970-66b9-41a1-b7f9-2ac8635f699b",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || bundledFirebaseConfig?.storageBucket || "aesthetic-host-gmn89.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || bundledFirebaseConfig?.messagingSenderId || "612561735364",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || bundledFirebaseConfig?.measurementId || "",
  oAuthClientId: (import.meta as any).env?.VITE_FIREBASE_OAUTH_CLIENT_ID || bundledFirebaseConfig?.oAuthClientId || "612561735364-dv6fddhlq66js58g6bqdnq4qdjkgcv6s.apps.googleusercontent.com"
};

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// Connect to provisioned Firestore database with auto long-polling and ignore undefined settings
// CRITICAL: The app will break without passing FIREBASE_CONFIG.firestoreDatabaseId
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    }, FIREBASE_CONFIG.firestoreDatabaseId);
  } catch (e) {
    return getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
})();

/**
 * Utility to ensure network calls never hang the UI if offline, connecting, or on slow networks.
 * Uses a realistic 6-second timeout for mobile cell connections.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 6000, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch((err) => {
      clearTimeout(timer);
      console.warn('[Firestore] Operation fallback due to error:', err?.message || err);
      return fallback;
    }),
    timeoutPromise
  ]);
}

/**
 * Recursively remove undefined fields from objects/arrays to prevent Firestore
 * "Function setDoc() called with invalid data. Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as unknown as T;
  }
  return data;
}

// Test Firestore connection on boot without hanging
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testRef = doc(db, 'system', 'connection');
    const writePromise = setDoc(testRef, sanitizeForFirestore({ 
      connected: true, 
      lastPing: new Date().toISOString() 
    }), { merge: true }).then(() => true);
    
    return await withTimeout(writePromise, 5000, false);
  } catch (error: any) {
    console.info('[Firestore] Operating with offline-first client storage.');
    return false;
  }
}

// -------------------------------------------------------------
// USERS & AUTH (Cloud Sync)
// -------------------------------------------------------------

export interface StoredCloudUser extends User {
  password?: string;
}

export async function getCloudUsers(): Promise<StoredCloudUser[]> {
  const fetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map(d => ({ ...d.data(), id: d.data().id || d.id } as StoredCloudUser))
      .filter(u => !!u.email);
  })();
  return withTimeout(fetchPromise, 6000, []);
}

export async function getCloudUserByEmail(email: string): Promise<StoredCloudUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const fetchPromise = (async () => {
    // 1. Direct query
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { ...d.data(), id: d.data().id || d.id } as StoredCloudUser;
    }

    // 2. Query by sanitized email doc ID
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const directDoc = await getDoc(doc(db, 'users', docId));
    if (directDoc.exists()) {
      const d = directDoc.data();
      return { ...d, id: d.id || directDoc.id } as StoredCloudUser;
    }

    // 3. Fallback scan of all users
    const allSnap = await getDocs(collection(db, 'users'));
    const found = allSnap.docs.find(d => {
      const data = d.data();
      return data.email && data.email.toLowerCase() === cleanEmail;
    });
    if (found) {
      return { ...found.data(), id: found.data().id || found.id } as StoredCloudUser;
    }

    return null;
  })();
  return withTimeout(fetchPromise, 6000, null);
}

export async function saveCloudUser(user: StoredCloudUser): Promise<void> {
  try {
    const safeData = sanitizeForFirestore({
      ...user,
      email: user.email.toLowerCase(),
      updatedAt: new Date().toISOString()
    });
    // Write by user.id
    const writePromise = setDoc(doc(db, 'users', user.id), safeData, { merge: true });
    // Also write an email-indexed pointer for instant lookups
    const emailDocId = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const emailIndexPromise = setDoc(doc(db, 'users', emailDocId), safeData, { merge: true });

    await withTimeout(Promise.all([writePromise, emailIndexPromise]), 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice on saving user to cloud:', err);
  }
}

export function subscribeToCloudUsers(callback: (users: StoredCloudUser[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const seenEmails = new Set<string>();
    const list: StoredCloudUser[] = [];
    snap.docs.forEach(d => {
      const data = d.data() as StoredCloudUser;
      if (data.email) {
        const lower = data.email.toLowerCase();
        if (!seenEmails.has(lower)) {
          seenEmails.add(lower);
          list.push({ ...data, id: data.id || d.id });
        }
      }
    });
    callback(list);
  }, (err) => {
    console.warn('[Firestore] Users subscription notice:', err);
  });
}

// -------------------------------------------------------------
// ALLOWED EMPLOYEES ROSTER (Cloud Whitelist)
// -------------------------------------------------------------

export async function getCloudAllowedEmployees(): Promise<AllowedEmployee[]> {
  const fetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'allowedEmployees'));
    return snap.docs.map(d => d.data() as AllowedEmployee).filter(e => !!e.email);
  })();
  return withTimeout(fetchPromise, 6000, []);
}

export async function saveCloudAllowedEmployee(emp: AllowedEmployee): Promise<void> {
  try {
    const docId = emp.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const safeData = sanitizeForFirestore({
      ...emp,
      email: emp.email.toLowerCase()
    });
    const writePromise = setDoc(doc(db, 'allowedEmployees', docId), safeData, { merge: true });
    await withTimeout(writePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice saving allowed employee:', err);
  }
}

export async function removeCloudAllowedEmployee(email: string): Promise<void> {
  try {
    const docId = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const deletePromise = deleteDoc(doc(db, 'allowedEmployees', docId));
    await withTimeout(deletePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice removing allowed employee:', err);
  }
}

export function subscribeToCloudAllowedEmployees(callback: (list: AllowedEmployee[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'allowedEmployees'), (snap) => {
    const list = snap.docs.map(d => d.data() as AllowedEmployee).filter(e => !!e.email);
    callback(list);
  }, (err) => {
    console.warn('[Firestore] AllowedEmployees subscription notice:', err);
  });
}

// -------------------------------------------------------------
// TASKS & COMPLIANCE (Cloud Real-Time Sync)
// -------------------------------------------------------------

export async function getCloudTasks(): Promise<Task[]> {
  const fetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'tasks'));
    return snap.docs.map(d => d.data() as Task);
  })();
  return withTimeout(fetchPromise, 6000, []);
}

export async function saveCloudTask(task: Task): Promise<void> {
  try {
    const safeTask = sanitizeForFirestore(task);
    const writePromise = setDoc(doc(db, 'tasks', task.id), safeTask, { merge: true });
    await withTimeout(writePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice saving task:', err);
  }
}

export async function updateCloudTask(taskId: string, data: Partial<Task>): Promise<void> {
  try {
    const safeData = sanitizeForFirestore({
      ...data,
      updatedAt: new Date().toISOString()
    });
    const writePromise = updateDoc(doc(db, 'tasks', taskId), safeData);
    await withTimeout(writePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice updating task:', err);
  }
}

export async function deleteCloudTask(taskId: string): Promise<void> {
  try {
    const deletePromise = deleteDoc(doc(db, 'tasks', taskId));
    await withTimeout(deletePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice deleting task:', err);
  }
}

export function subscribeToCloudTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'tasks'), (snap) => {
    const tasks = snap.docs.map(d => d.data() as Task);
    tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    callback(tasks);
  }, (err) => {
    console.warn('[Firestore] Tasks subscription notice:', err);
  });
}

// -------------------------------------------------------------
// CHATS & REAL-TIME MESSAGING (Cloud Real-Time Sync)
// -------------------------------------------------------------

export async function getCloudChats(): Promise<ChatGroup[]> {
  const fetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'chats'));
    return snap.docs.map(d => d.data() as ChatGroup);
  })();
  return withTimeout(fetchPromise, 6000, []);
}

export async function saveCloudChat(chat: ChatGroup): Promise<void> {
  try {
    const safeChat = sanitizeForFirestore(chat);
    const writePromise = setDoc(doc(db, 'chats', chat.id), safeChat, { merge: true });
    await withTimeout(writePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice saving chat:', err);
  }
}

export function subscribeToCloudChats(callback: (chats: ChatGroup[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'chats'), (snap) => {
    const list = snap.docs.map(d => d.data() as ChatGroup);
    list.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.lastMessage?.timestamp || b.createdAt).getTime();
      return timeB - timeA;
    });
    callback(list);
  }, (err) => {
    console.warn('[Firestore] Chats subscription notice:', err);
  });
}

export async function getCloudMessages(chatId: string): Promise<ChatMessage[]> {
  const fetchPromise = (async () => {
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    const snap = await getDocs(q);
    const msgs = snap.docs.map(d => d.data() as ChatMessage);
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return msgs;
  })();
  return withTimeout(fetchPromise, 6000, []);
}

export async function saveCloudMessage(message: ChatMessage): Promise<void> {
  try {
    const safeMessage = sanitizeForFirestore(message);
    const msgWrite = setDoc(doc(db, 'messages', message.id), safeMessage, { merge: true });
    
    const chatRef = doc(db, 'chats', message.chatId);
    const lastMessagePayload = sanitizeForFirestore({
      content: message.content || (message.mediaName ? `Sent file: ${message.mediaName}` : 'Sent an attachment'),
      timestamp: message.timestamp,
      senderName: message.senderName,
      type: message.type
    });

    const chatWrite = setDoc(chatRef, { lastMessage: lastMessagePayload }, { merge: true });
    await withTimeout(Promise.all([msgWrite, chatWrite]), 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice saving message:', err);
  }
}

export function subscribeToCloudMessages(chatId: string, callback: (msgs: ChatMessage[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId)
  );

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => d.data() as ChatMessage);
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    callback(msgs);
  }, (err) => {
    console.warn(`[Firestore] Messages subscription notice for ${chatId}:`, err);
  });
}

// -------------------------------------------------------------
// AUTH LOGS & AUDIT TRAILS (Cloud Sync)
// -------------------------------------------------------------

export async function saveCloudAuthLog(log: AuthLog): Promise<void> {
  try {
    const safeLog = sanitizeForFirestore(log);
    const writePromise = setDoc(doc(db, 'authLogs', log.id), safeLog);
    await withTimeout(writePromise, 6000, undefined);
  } catch (err) {
    console.warn('[Firestore] Notice saving auth log:', err);
  }
}

export async function getCloudAuthLogs(): Promise<AuthLog[]> {
  const fetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'authLogs'));
    const list = snap.docs.map(d => d.data() as AuthLog);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  })();
  return withTimeout(fetchPromise, 6000, []);
}

// -------------------------------------------------------------
// INITIAL CLOUD SEEDING
// Seeds predefined tasks and default branch group if not yet in cloud
// -------------------------------------------------------------

export async function seedCloudDefaults(
  defaultEmployees: AllowedEmployee[],
  defaultPredefinedTasks: PredefinedTaskTemplate[],
  defaultChats: ChatGroup[],
  defaultMessages: ChatMessage[]
): Promise<void> {
  try {
    const seedOp = async () => {
      // 1. Branch general group chat
      const chatDoc = await getDoc(doc(db, 'chats', 'chat-branch-general'));
      if (!chatDoc.exists()) {
        const writes: Promise<any>[] = [];
        for (const chat of defaultChats) {
          writes.push(setDoc(doc(db, 'chats', chat.id), sanitizeForFirestore(chat), { merge: true }));
        }
        for (const msg of defaultMessages) {
          writes.push(setDoc(doc(db, 'messages', msg.id), sanitizeForFirestore(msg), { merge: true }));
        }
        await Promise.all(writes);
      }

      // 2. Allowed employees roster
      const empSnap = await getDocs(collection(db, 'allowedEmployees'));
      if (empSnap.empty) {
        const empWrites = defaultEmployees.map(emp => {
          const docId = emp.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
          return setDoc(doc(db, 'allowedEmployees', docId), sanitizeForFirestore(emp), { merge: true });
        });
        await Promise.all(empWrites);
      }

      // 3. Predefined tasks
      const preSnap = await getDocs(collection(db, 'predefinedTasks'));
      if (preSnap.empty) {
        const preWrites = defaultPredefinedTasks.map(pt => {
          return setDoc(doc(db, 'predefinedTasks', pt.id), sanitizeForFirestore(pt), { merge: true });
        });
        await Promise.all(preWrites);
      }
    };

    await withTimeout(seedOp(), 8000, undefined);
  } catch (err) {
    console.info('[Firestore] Background cloud seed notice:', err);
  }
}
