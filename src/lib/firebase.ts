import type { ArchiveEntry, RememberedItem, ShoppingList, UserProfile } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const ENV_CONFIG: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export function isFirebaseConfigured(config: FirebaseConfig = ENV_CONFIG): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

type FirebaseApp = import('firebase/app').FirebaseApp;
type Firestore = import('firebase/firestore').Firestore;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let persistenceReady = false;

export async function initFirebase(config: FirebaseConfig = ENV_CONFIG) {
  if (!isFirebaseConfigured(config)) {
    return { mode: 'mock' as const, db: null };
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
  } = await import('firebase/firestore');

  app = getApps().length ? getApps()[0]! : initializeApp(config);

  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    persistenceReady = true;
  } catch {
    db = getFirestore(app);
    persistenceReady = false;
  }

  return { mode: 'live' as const, db, persistenceReady };
}

export function getDb() {
  return db;
}

export function getApp() {
  return app;
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !app) {
    return {
      id: 'demo-user',
      email,
      displayName: email.split('@')[0] || 'Demo',
      provider: 'demo',
    };
  }
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  return {
    id: cred.user.uid,
    email: cred.user.email ?? email,
    displayName: cred.user.displayName ?? email.split('@')[0],
    photoURL: cred.user.photoURL ?? undefined,
    provider: 'email',
  };
}

export async function signInWithGoogle(): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !app) {
    return {
      id: 'demo-google',
      email: 'demo@gmail.com',
      displayName: 'Demo Google',
      provider: 'demo',
    };
  }
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  return {
    id: result.user.uid,
    email: result.user.email ?? '',
    displayName: result.user.displayName ?? 'Korisnik',
    photoURL: result.user.photoURL ?? undefined,
    provider: 'google',
  };
}

export async function signOutFirebase(): Promise<void> {
  if (!app || !isFirebaseConfigured()) return;
  const { getAuth, signOut } = await import('firebase/auth');
  await signOut(getAuth(app));
}

/** Spremi arhivski zapis cijene (offline-capable). */
export async function pushArchiveEntry(entry: ArchiveEntry): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'priceArchive', entry.id), entry, { merge: true });
}

export async function pushRememberedItem(item: RememberedItem): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'catalogRemembered', item.id), item, { merge: true });
}

export async function pushShoppingList(list: ShoppingList): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'shoppingLists', list.shareCode), list, { merge: true });
}

export type Unsub = () => void;

/** Real-time sync dijeljenog spiska preko shareCode. */
export async function subscribeSharedList(
  shareCode: string,
  onChange: (list: ShoppingList) => void,
): Promise<Unsub> {
  if (!db || !isFirebaseConfigured()) return () => undefined;
  const { doc, onSnapshot } = await import('firebase/firestore');
  return onSnapshot(doc(db, 'shoppingLists', shareCode.toUpperCase()), (snap) => {
    if (snap.exists()) onChange(snap.data() as ShoppingList);
  });
}

export async function subscribeArchive(
  onChange: (entries: ArchiveEntry[]) => void,
): Promise<Unsub> {
  if (!db || !isFirebaseConfigured()) return () => undefined;
  const { collection, onSnapshot, orderBy, query, limit } = await import('firebase/firestore');
  const q = query(collection(db, 'priceArchive'), orderBy('recordedAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as ArchiveEntry));
  });
}
