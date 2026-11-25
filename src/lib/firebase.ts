import type {
  ArchiveEntry,
  ItemAlias,
  LoyaltyCard,
  Receipt,
  RememberedItem,
  ShoppingList,
  ShoppingTemplate,
  UserProfile,
  CompletedTrip,
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
type Auth = import('firebase/auth').Auth;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export type Unsub = () => void;

export function generateShareCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 4; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `KUPI-${body}`;
}

function toUserProfile(user: import('firebase/auth').User): UserProfile {
  const provider =
    user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email';
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Korisnik',
    photoURL: user.photoURL ?? undefined,
    provider,
  };
}

export async function initFirebase(config: FirebaseConfig = ENV_CONFIG) {
  if (!isFirebaseConfigured(config)) {
    return { mode: 'mock' as const, db: null, auth: null, persistenceReady: false };
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
  } = await import('firebase/firestore');
  const { getAuth } = await import('firebase/auth');

  app = getApps().length ? getApps()[0]! : initializeApp(config);
  auth = getAuth(app);

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

  return { mode: 'live' as const, db, auth, persistenceReady };
}

export function getDb() {
  return db;
}

export function getAuthInstance() {
  return auth;
}

export async function watchAuth(onChange: (user: UserProfile | null) => void): Promise<Unsub> {
  if (!auth || !isFirebaseConfigured()) {
    onChange(null);
    return () => undefined;
  }
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      onChange(null);
      return;
    }
    const profile = toUserProfile(fbUser);
    if (db) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const data = snap.data() as { familyCode?: string; displayName?: string };
          if (data.familyCode) profile.familyCode = data.familyCode;
          if (data.displayName) profile.displayName = data.displayName;
        } else {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(
            doc(db, 'users', fbUser.uid),
            {
              email: profile.email,
              displayName: profile.displayName,
              photoURL: profile.photoURL ?? null,
              createdAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      } catch {
        /* offline */
      }
    }
    onChange(profile);
  });
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !app) {
    throw new Error('Firebase nije konfigurisan.');
  }
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  return toUserProfile(cred.user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !app) {
    throw new Error('Firebase nije konfigurisan.');
  }
  const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const a = getAuth(app);
  const cred = await createUserWithEmailAndPassword(a, email, password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  if (db) {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        email,
        displayName: displayName.trim() || email.split('@')[0],
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
  return toUserProfile(cred.user);
}

export async function resetPassword(email: string): Promise<void> {
  if (!isFirebaseConfigured() || !app) {
    throw new Error('Firebase nije konfigurisan.');
  }
  const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(getAuth(app), email);
}

export async function signInWithGoogle(): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !app) {
    throw new Error('Firebase nije konfigurisan.');
  }
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  if (db) {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        email: result.user.email ?? '',
        displayName: result.user.displayName ?? 'Korisnik',
        photoURL: result.user.photoURL ?? null,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
  return toUserProfile(result.user);
}

export async function signOutFirebase(): Promise<void> {
  if (!app || !isFirebaseConfigured()) return;
  const { getAuth, signOut } = await import('firebase/auth');
  await signOut(getAuth(app));
}

async function setUserFamilyCode(uid: string, familyCode: string) {
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), { familyCode }, { merge: true });
}

export async function createFamilySpace(
  uid: string,
  displayName: string,
  seed?: { list?: ShoppingList; budgetAmount?: number },
): Promise<string> {
  if (!db || !isFirebaseConfigured()) {
    return generateShareCode();
  }
  const { doc, setDoc } = await import('firebase/firestore');
  let code = generateShareCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = doc(db, 'families', code);
    try {
      const list = seed?.list ?? {
        id: `list-${code}`,
        name: 'Porodični spisak',
        shareCode: code,
        items: [],
        selectedStoreIds: [],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(ref, {
        code,
        ownerId: uid,
        members: [uid],
        name: `Porodica ${displayName}`,
        budgetAmount: seed?.budgetAmount ?? 400,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'families', code, 'meta', 'list'), {
        ...list,
        shareCode: code,
        name: list.name || 'Porodični spisak',
      });
      await setUserFamilyCode(uid, code);
      return code;
    } catch {
      code = generateShareCode();
    }
  }
  throw new Error('Nije moguće kreirati porodični prostor.');
}

export async function joinFamilySpace(uid: string, rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  if (!db || !isFirebaseConfigured()) return code;
  const { doc, getDoc, updateDoc, arrayUnion } = await import('firebase/firestore');
  const ref = doc(db, 'families', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Porodični kod nije pronađen.');
  await updateDoc(ref, {
    members: arrayUnion(uid),
    updatedAt: new Date().toISOString(),
  });
  await setUserFamilyCode(uid, code);
  return code;
}

function familyCol(code: string, col: string) {
  return `families/${code}/${col}`;
}

export async function pushFamilyDoc(
  code: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!db || !isFirebaseConfigured() || !code) return;
  const { doc, setDoc } = await import('firebase/firestore');
  const payload = { ...data };
  if ('imageDataUrl' in payload && typeof payload.imageDataUrl === 'string') {
    if ((payload.imageDataUrl as string).length > 400_000) {
      delete payload.imageDataUrl;
    }
  }
  await setDoc(doc(db, familyCol(code, collection), id), payload, { merge: true });
}

export async function deleteFamilyDoc(
  code: string,
  collection: string,
  id: string,
): Promise<void> {
  if (!db || !isFirebaseConfigured() || !code) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, familyCol(code, collection), id));
}

export async function pushFamilyList(code: string, list: ShoppingList): Promise<void> {
  if (!db || !isFirebaseConfigured() || !code) return;
  const { doc, setDoc, updateDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'families', code, 'meta', 'list'), { ...list, shareCode: code }, { merge: true });
  try {
    await updateDoc(doc(db, 'families', code), {
      updatedAt: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}

export async function pushFamilyBudget(code: string, budgetAmount: number): Promise<void> {
  if (!db || !isFirebaseConfigured() || !code) return;
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, 'families', code), {
    budgetAmount,
    updatedAt: new Date().toISOString(),
  });
}

export async function pushArchiveEntry(code: string, entry: ArchiveEntry): Promise<void> {
  await pushFamilyDoc(code, 'archive', entry.id, entry as unknown as Record<string, unknown>);
}

export async function pushReceipt(code: string, receipt: Receipt): Promise<void> {
  await pushFamilyDoc(code, 'receipts', receipt.id, receipt as unknown as Record<string, unknown>);
}

export async function pushRememberedItem(code: string, item: RememberedItem): Promise<void> {
  await pushFamilyDoc(code, 'remembered', item.id, item as unknown as Record<string, unknown>);
}

export async function pushAlias(code: string, alias: ItemAlias): Promise<void> {
  await pushFamilyDoc(code, 'aliases', alias.id, alias as unknown as Record<string, unknown>);
}

export async function pushTemplate(code: string, template: ShoppingTemplate): Promise<void> {
  await pushFamilyDoc(code, 'templates', template.id, template as unknown as Record<string, unknown>);
}

export async function pushLoyaltyCard(code: string, card: LoyaltyCard): Promise<void> {
  await pushFamilyDoc(code, 'loyalty', card.id, card as unknown as Record<string, unknown>);
}

export async function deleteLoyaltyCardDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'loyalty', id);
}

export async function pushTrip(code: string, trip: CompletedTrip): Promise<void> {
  await pushFamilyDoc(code, 'trips', trip.id, trip as unknown as Record<string, unknown>);
}

export async function deleteArchiveEntry(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'archive', id);
}

export async function deleteReceiptDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'receipts', id);
}

export async function deleteRememberedDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'remembered', id);
}

export async function deleteTemplateDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'templates', id);
}

export async function deleteTripDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'trips', id);
}

export async function deleteAliasDoc(code: string, id: string): Promise<void> {
  await deleteFamilyDoc(code, 'aliases', id);
}

/** Legacy helpers kept for local-only paths */
export async function pushShoppingList(list: ShoppingList): Promise<void> {
  if (list.shareCode) await pushFamilyList(list.shareCode, list);
}

export interface FamilySnapshot {
  list?: ShoppingList;
  budgetAmount?: number;
  archive: ArchiveEntry[];
  receipts: Receipt[];
  remembered: RememberedItem[];
  aliases: ItemAlias[];
  templates: ShoppingTemplate[];
  trips: CompletedTrip[];
  loyalty: LoyaltyCard[];
}

export async function subscribeFamily(
  code: string,
  onChange: (patch: Partial<FamilySnapshot>) => void,
): Promise<Unsub> {
  if (!db || !isFirebaseConfigured() || !code) return () => undefined;
  const { doc, collection, onSnapshot } = await import('firebase/firestore');
  const unsubs: Unsub[] = [];

  unsubs.push(
    onSnapshot(doc(db, 'families', code), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { budgetAmount?: number };
      if (typeof data.budgetAmount === 'number') {
        onChange({ budgetAmount: data.budgetAmount });
      }
    }),
  );

  unsubs.push(
    onSnapshot(doc(db, 'families', code, 'meta', 'list'), (snap) => {
      if (snap.exists()) onChange({ list: snap.data() as ShoppingList });
    }),
  );

  const cols: Array<[keyof FamilySnapshot, string]> = [
    ['archive', 'archive'],
    ['receipts', 'receipts'],
    ['remembered', 'remembered'],
    ['aliases', 'aliases'],
    ['templates', 'templates'],
    ['trips', 'trips'],
    ['loyalty', 'loyalty'],
  ];

  for (const [key, col] of cols) {
    unsubs.push(
      onSnapshot(collection(db, familyCol(code, col)), (snap) => {
        const rows = snap.docs.map((d) => d.data());
        onChange({ [key]: rows } as Partial<FamilySnapshot>);
      }),
    );
  }

  return () => unsubs.forEach((u) => u());
}
