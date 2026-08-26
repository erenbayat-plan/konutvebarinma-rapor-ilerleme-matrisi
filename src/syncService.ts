import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { ReportStatusType } from './reportData';

export type ReportStatusItem = {
  status: ReportStatusType;
  progress: number; // 0 to 100
  author: string;
  targetPages?: string;
  note: string;
  driveLink?: string;
};

export type CustomSubSection = {
  id: string;
  chapterNum: string;
  code: string;
  title: string;
  level2?: string;
  level3?: string;
  level4?: string;
  sartnameUyum?: string;
  scope?: string;
  defaultPages?: string;
};

export type AppState = {
  reportStatus?: Record<string, ReportStatusItem>;
  customSubSections?: Record<string, CustomSubSection[]>; // keyed by chapterNum
  sectionOverrides?: Record<string, { title?: string; code?: string; scope?: string; defaultPages?: string; deleted?: boolean }>;
  analysisStatuses?: Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>;
  chapterNotes?: Record<string, string>;
  lastUpdated?: number;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Broadcast channel for instantaneous cross-tab synchronization
const BROADCAST_CHANNEL_NAME = 'plan2050_konut_barinma_sync';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

// Firebase configuration
let dbInstance: Firestore | null = null;
const DOC_ID = 'konut_barinma_state';
const COLLECTION_NAME = 'app_state';

export function getFirebaseDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    return dbInstance;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'init');
    return null;
  }
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  const firestore = getFirebaseDb();
  if (!firestore) return false;
  try {
    await getDocFromServer(doc(firestore, COLLECTION_NAME, DOC_ID));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${DOC_ID}`);
    return false;
  }
}

// Boot-time test call
testConnection();

export function subscribeToTabBroadcast(onUpdate: (state: AppState) => void): () => void {
  if (!broadcastChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      onUpdate(event.data);
    }
  };

  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

export function broadcastTabState(state: AppState) {
  try {
    broadcastChannel?.postMessage(state);
  } catch (err) {
    console.warn('Broadcast message error:', err);
  }
}

export function subscribeToCloudState(
  onUpdate: (state: AppState) => void,
  onConnected?: () => void
): () => void {
  const firestore = getFirebaseDb();
  if (!firestore) {
    if (onConnected) onConnected();
    return () => {};
  }

  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const docRef = doc(firestore, COLLECTION_NAME, DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppState;
        onUpdate(data);
      }
      if (onConnected) onConnected();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, docPath);
      if (onConnected) onConnected();
    });

    return unsubscribe;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, docPath);
    if (onConnected) onConnected();
    return () => {};
  }
}

export async function fetchGlobalCloudState(): Promise<AppState | null> {
  const firestore = getFirebaseDb();
  if (!firestore) return null;

  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const docRef = doc(firestore, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppState;
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, docPath);
    return null;
  }
}

export async function pushGlobalCloudState(state: AppState): Promise<boolean> {
  // Always broadcast locally to other tabs
  broadcastTabState(state);

  const firestore = getFirebaseDb();
  if (!firestore) return true;

  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const docRef = doc(firestore, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, state, { merge: true });
    return true;
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, docPath);
    return false;
  }
}

// Debounced Queue for Cloud Push
let pushTimeout: any = null;
let pendingStateGetter: (() => AppState) | null = null;
let pendingCallback: ((status: 'saving' | 'synced') => void) | null = null;

export function queueGlobalCloudPush(
  getState: () => AppState,
  onStatusChange?: (status: 'saving' | 'synced') => void
) {
  pendingStateGetter = getState;
  if (onStatusChange) pendingCallback = onStatusChange;
  if (onStatusChange) onStatusChange('saving');

  // Immediately broadcast state across local browser tabs
  try {
    const currentState = getState();
    broadcastTabState(currentState);
  } catch (e) {
    console.error(e);
  }

  if (pushTimeout) clearTimeout(pushTimeout);

  pushTimeout = setTimeout(async () => {
    if (pendingStateGetter) {
      const stateToPush = pendingStateGetter();
      await pushGlobalCloudState(stateToPush);
      if (pendingCallback) pendingCallback('synced');
    }
    pushTimeout = null;
  }, 450);
}
