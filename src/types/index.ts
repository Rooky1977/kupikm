export type ThemeMode = 'light' | 'dark' | 'system';

export type Unit = 'kom' | 'kg' | 'g' | 'l' | 'ml' | 'pak';

export type Category =
  | 'mlijecno'
  | 'pekara'
  | 'meso'
  | 'voce-povrce'
  | 'pice'
  | 'hemija'
  | 'ostalo';

export type SyncStatus = 'online' | 'offline' | 'sync' | 'local';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Store {
  id: string;
  name: string;
  brand: string;
  city: string;
  zone?: string;
  address: string;
  location: GeoPoint;
  isFavorite: boolean;
  isCustom?: boolean;
}

export interface ArchiveEntry {
  id: string;
  itemKey: string;
  itemName: string;
  variant?: string;
  unit: Unit;
  category: Category;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  storeId: string;
  storeName: string;
  recordedAt: string;
  listId: string;
  source: 'cart' | 'manual' | 'receipt' | 'demo';
  receiptId?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  lineTotal: number;
  category: Category;
}

export interface Receipt {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  imageDataUrl?: string;
  note?: string;
  createdAt: string;
  source: 'camera' | 'upload' | 'manual' | 'ai' | 'demo';
}

export interface CatalogVariant {
  id: string;
  label: string;
  unit: Unit;
  defaultQty: number;
  keywords: string[];
  category: Category;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: Category;
  variants: CatalogVariant[];
}

export interface RememberedItem {
  id: string;
  name: string;
  unit: Unit;
  category: Category;
  keywords: string[];
  createdAt: string;
}

export interface ListItem {
  id: string;
  name: string;
  variant?: string;
  quantity: number;
  unit: Unit;
  category: Category;
  checked: boolean;
  unitPrice?: number;
  lineTotal?: number;
  /** Razlika u odnosu na prethodnu cijenu (KM po jedinici) */
  priceDelta?: number;
  catalogId?: string;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  shareCode: string;
  items: ListItem[];
  selectedStoreIds: string[];
  activeStoreId?: string;
  updatedAt: string;
}

export interface CompletedTrip {
  id: string;
  date: string;
  storeId: string;
  storeName: string;
  total: number;
  itemCount: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: Unit;
    unitPrice: number;
    lineTotal: number;
  }>;
  note?: string;
  receiptId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'demo' | 'email' | 'google';
}

export type AiProvider = 'auto' | 'gemini' | 'groq' | 'tesseract';

export interface AppSettings {
  theme: ThemeMode;
  cityFallback: string;
  /** @deprecated zadržano radi migracije starih lokalnih podataka */
  openAiApiKey?: string;
  aiProvider: AiProvider;
  geminiApiKey: string;
  groqApiKey: string;
  firebaseConfigured: boolean;
  useMockData: boolean;
}

export interface StoreEstimate {
  storeId: string;
  total: number;
  pricedCount: number;
  missingCount: number;
  missingItemIds: string[];
  distanceKm?: number;
  score: number;
  isCheapest: boolean;
  isClosest: boolean;
  isBestChoice: boolean;
}

export interface LastPriceInfo {
  unitPrice: number;
  storeId: string;
  storeName: string;
  recordedAt: string;
  isLowest: boolean;
  lowestPrice?: number;
  lowestStoreName?: string;
}

export interface CirkaSummary {
  cartTotal: number;
  estimatedFull: number;
  remainingEstimate: number;
  inCartCount: number;
  totalCount: number;
  budgetRemaining: number;
  budgetAmount: number;
  budgetPct: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  mlijecno: 'Mliječno',
  pekara: 'Pekara',
  meso: 'Meso',
  'voce-povrce': 'Voće i povrće',
  pice: 'Piće',
  hemija: 'Hemija',
  ostalo: 'Ostalo',
};

export const UNIT_LABELS: Unit[] = ['kom', 'kg', 'g', 'l', 'ml', 'pak'];

export const BIH_CITIES = [
  'Sarajevo',
  'Banja Luka',
  'Tuzla',
  'Mostar',
  'Zenica',
  'Bijeljina',
  'Prijedor',
  'Brčko',
] as const;
