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
  getFirestore,
  initializeFirestore,
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
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Connect to provisioned Firestore database
// CRITICAL: The app will break without passing firebaseConfig.firestoreDatabaseId
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testRef = doc(db, 'system', 'connection');
    await setDoc(testRef, { connected: true, lastPing: new Date().toISOString() }, { merge: true });
    console.log('[Firestore] Connected to Cloud Firestore database:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
      console.info('[Firestore] Network offline or connecting; local cache operational.');
    } else {
      console.warn('[Firestore] Status notice:', error?.message || error);
    }
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
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as StoredCloudUser);
  } catch (err) {
    console.warn('[Firestore] Error getting users:', err);
    return [];
  }
}

export async function getCloudUserByEmail(email: string): Promise<StoredCloudUser | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as StoredCloudUser;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] Error finding user by email:', err);
    return null;
  }
}

export async function saveCloudUser(user: StoredCloudUser): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), {
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving user:', err);
  }
}

export function subscribeToCloudUsers(callback: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const list: User[] = snap.docs.map(d => {
      const { password, ...safe } = d.data() as StoredCloudUser;
      return safe;
    });
    callback(list);
  }, (err) => {
    console.warn('[Firestore] Users subscription error:', err);
  });
}

// -------------------------------------------------------------
// ALLOWED EMPLOYEES ROSTER (Cloud Whitelist)
// -------------------------------------------------------------

export async function getCloudAllowedEmployees(): Promise<AllowedEmployee[]> {
  try {
    const snap = await getDocs(collection(db, 'allowedEmployees'));
    return snap.docs.map(d => d.data() as AllowedEmployee);
  } catch (err) {
    console.warn('[Firestore] Error getting allowed employees:', err);
    return [];
  }
}

export async function saveCloudAllowedEmployee(emp: AllowedEmployee): Promise<void> {
  try {
    const docId = emp.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'allowedEmployees', docId), emp, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving allowed employee:', err);
  }
}

export async function removeCloudAllowedEmployee(email: string): Promise<void> {
  try {
    const docId = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    await deleteDoc(doc(db, 'allowedEmployees', docId));
  } catch (err) {
    console.error('[Firestore] Error removing allowed employee:', err);
  }
}

export function subscribeToCloudAllowedEmployees(callback: (list: AllowedEmployee[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'allowedEmployees'), (snap) => {
    const list = snap.docs.map(d => d.data() as AllowedEmployee);
    callback(list);
  }, (err) => {
    console.warn('[Firestore] AllowedEmployees subscription error:', err);
  });
}

// -------------------------------------------------------------
// TASKS & COMPLIANCE (Cloud Real-Time Sync)
// -------------------------------------------------------------

export async function getCloudTasks(): Promise<Task[]> {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    return snap.docs.map(d => d.data() as Task);
  } catch (err) {
    console.warn('[Firestore] Error getting tasks:', err);
    return [];
  }
}

export async function saveCloudTask(task: Task): Promise<void> {
  try {
    await setDoc(doc(db, 'tasks', task.id), task, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving task:', err);
  }
}

export async function updateCloudTask(taskId: string, data: Partial<Task>): Promise<void> {
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Firestore] Error updating task:', err);
  }
}

export async function deleteCloudTask(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    console.error('[Firestore] Error deleting task:', err);
  }
}

export function subscribeToCloudTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'tasks'), (snap) => {
    const tasks = snap.docs.map(d => d.data() as Task);
    // Sort by updatedAt descending
    tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    callback(tasks);
  }, (err) => {
    console.warn('[Firestore] Tasks subscription error:', err);
  });
}

// -------------------------------------------------------------
// CHATS & REAL-TIME MESSAGING (Cloud Real-Time Sync)
// -------------------------------------------------------------

export async function getCloudChats(): Promise<ChatGroup[]> {
  try {
    const snap = await getDocs(collection(db, 'chats'));
    return snap.docs.map(d => d.data() as ChatGroup);
  } catch (err) {
    console.warn('[Firestore] Error getting chats:', err);
    return [];
  }
}

export async function saveCloudChat(chat: ChatGroup): Promise<void> {
  try {
    await setDoc(doc(db, 'chats', chat.id), chat, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving chat:', err);
  }
}

export function subscribeToCloudChats(callback: (chats: ChatGroup[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'chats'), (snap) => {
    const list = snap.docs.map(d => d.data() as ChatGroup);
    // Sort by last message or createdAt
    list.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.lastMessage?.timestamp || b.createdAt).getTime();
      return timeB - timeA;
    });
    callback(list);
  }, (err) => {
    console.warn('[Firestore] Chats subscription error:', err);
  });
}

export async function getCloudMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    const snap = await getDocs(q);
    const msgs = snap.docs.map(d => d.data() as ChatMessage);
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return msgs;
  } catch (err) {
    console.warn('[Firestore] Error getting messages:', err);
    return [];
  }
}

export async function saveCloudMessage(message: ChatMessage): Promise<void> {
  try {
    await setDoc(doc(db, 'messages', message.id), message, { merge: true });

    // Update parent chat's lastMessage
    const chatRef = doc(db, 'chats', message.chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        content: message.content || (message.mediaName ? `Sent file: ${message.mediaName}` : 'Sent an attachment'),
        timestamp: message.timestamp,
        senderName: message.senderName,
        type: message.type
      }
    });
  } catch (err) {
    console.error('[Firestore] Error saving message:', err);
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
    console.warn(`[Firestore] Messages subscription error for ${chatId}:`, err);
  });
}

// -------------------------------------------------------------
// AUTH LOGS & AUDIT TRAILS (Cloud Sync)
// -------------------------------------------------------------

export async function saveCloudAuthLog(log: AuthLog): Promise<void> {
  try {
    await setDoc(doc(db, 'authLogs', log.id), log);
  } catch (err) {
    console.error('[Firestore] Error saving auth log:', err);
  }
}

export async function getCloudAuthLogs(): Promise<AuthLog[]> {
  try {
    const snap = await getDocs(collection(db, 'authLogs'));
    const list = snap.docs.map(d => d.data() as AuthLog);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] Error getting auth logs:', err);
    return [];
  }
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
    // Check if branch general chat exists in Firestore
    const chatDoc = await getDoc(doc(db, 'chats', 'chat-branch-general'));
    if (!chatDoc.exists()) {
      console.log('[Firestore] Seeding initial branch group chat to cloud...');
      for (const chat of defaultChats) {
        await setDoc(doc(db, 'chats', chat.id), chat);
      }
      for (const msg of defaultMessages) {
        await setDoc(doc(db, 'messages', msg.id), msg);
      }
    }

    // Check if allowed employees exist in Firestore
    const empSnap = await getDocs(collection(db, 'allowedEmployees'));
    if (empSnap.empty) {
      console.log('[Firestore] Seeding initial whitelisted staff roster to cloud...');
      for (const emp of defaultEmployees) {
        const docId = emp.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'allowedEmployees', docId), emp);
      }
    }

    // Check predefined tasks in Firestore
    const preSnap = await getDocs(collection(db, 'predefinedTasks'));
    if (preSnap.empty) {
      console.log('[Firestore] Seeding statutory CA task templates to cloud...');
      for (const pt of defaultPredefinedTasks) {
        await setDoc(doc(db, 'predefinedTasks', pt.id), pt);
      }
    }
  } catch (err) {
    console.warn('[Firestore] Could not complete cloud seed, using local fallback:', err);
  }
}
