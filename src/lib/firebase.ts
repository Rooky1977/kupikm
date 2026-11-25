import type {
  ArchiveEntry,
  Receipt,
  RememberedItem,
  ShoppingList,
  UserProfile,
} from '../types';

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

export async function initFirebase(config: FirebaseConfig = ENV_CONFIG) {
  if (!isFirebaseConfigured(config)) {
    return { mode: 'mock' as const, db: null, persistenceReady: false };
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
  } = await import('firebase/firestore');

  app = getApps().length ? getApps()[0]! : initializeApp(config);

  let persistenceReady = false;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    persistenceReady = true;
  } catch {
    db = getFirestore(app);
  }

  return { mode: 'live' as const, db, persistenceReady };
}

export function getDb() {
  return db;
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

export async function pushReceipt(receipt: Receipt): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  const { doc, setDoc } = await import('firebase/firestore');
  // Ne šalji ogromne base64 slike ako su prevelike — zadrži thumbnail lokalno
  const payload = { ...receipt };
  if (payload.imageDataUrl && payload.imageDataUrl.length > 400_000) {
    delete payload.imageDataUrl;
  }
  await setDoc(doc(db, 'receipts', receipt.id), payload, { merge: true });
}

export type Unsub = () => void;

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
