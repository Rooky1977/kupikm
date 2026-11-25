export type ThemeMode = 'light' | 'dark' | 'system';

export type Unit = 'kom' | 'kg' | 'g' | 'l' | 'ml' | 'pak';

export type Category =
  | 'cigarete'
  | 'mlijecno'
  | 'pekara'
  | 'ostava'
  | 'meso'
  | 'voce-povrce'
  | 'slatkisi'
  | 'pice'
  | 'hemija'
  | 'kucanstvo'
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
  /** Cijena normalizovana na 1 kg / 1 L kada je moguće */
  normalizedUnitPrice?: number;
  /** Veličina pakovanja u baznoj jedinici (kg/L/kom) */
  packSize?: number;
  isPromo?: boolean;
  isExtraordinary?: boolean;
  barcode?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  lineTotal: number;
  category: Category;
  isPromo?: boolean;
  isExtraordinary?: boolean;
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
  /** Cijeli račun van redovnog mjesečnog budžeta */
  isExtraordinary?: boolean;
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
  barcode?: string;
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
  barcode?: string;
  isPromo?: boolean;
  isExtraordinary?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  shareCode: string;
  items: ListItem[];
  selectedStoreIds: string[];
  activeStoreId?: string;
  /** Redoslijed zona/kategorija na spisku */
  zoneOrder?: Category[];
  updatedAt: string;
}

export interface LoyaltyCard {
  id: string;
  name: string;
  storeBrand?: string;
  cardNumber: string;
  imageDataUrl?: string;
  createdAt: string;
}

/** Artikal u kućnim zalihama (Špajz / Rezerva). */
export interface PantryItem {
  id: string;
  name: string;
  itemKey: string;
  quantity: number;
  unit: Unit;
  category: Category;
  expiresAt?: string;
  updatedAt: string;
  note?: string;
}

export interface DedupSuggestion {
  name: string;
  unit: Unit;
  category: Category;
  catalogId?: string;
  score: number;
  source: 'katalog' | 'arhiva' | 'zapamćeno' | 'špajz';
}

export interface TripVarianceLine {
  name: string;
  estimated: number;
  actual: number;
  delta: number;
}

export interface TripVarianceSummary {
  estimatedTotal: number;
  actualTotal: number;
  delta: number;
  topDrivers: TripVarianceLine[];
}

export type UndoPayload =
  | { kind: 'listItem'; item: ListItem; index: number }
  | {
      kind: 'receipt';
      receipt: Receipt;
      archive: ArchiveEntry[];
      trips: CompletedTrip[];
    }
  | {
      kind: 'finish';
      trip: CompletedTrip;
      restoredItems: ListItem[];
      listWithoutBought: ShoppingList;
    }
  | { kind: 'pantryDelete'; item: PantryItem };

export interface UndoState {
  id: string;
  message: string;
  payload: UndoPayload;
  createdAt: number;
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
  familyCode?: string;
}

/** Mapiranje naziva sa fiskalnog računa → katalog. */
export interface ItemAlias {
  id: string;
  rawName: string;
  rawKey: string;
  catalogName: string;
  catalogId?: string;
  category: Category;
  unit: Unit;
  createdAt: string;
}

export interface ShoppingTemplate {
  id: string;
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: Unit;
    category: Category;
    catalogId?: string;
  }>;
  createdAt: string;
}

export interface SplitCartSuggestion {
  storeAId: string;
  storeBId: string;
  storeAName: string;
  storeBName: string;
  storeAItems: Array<{ itemId: string; name: string; line: number }>;
  storeBItems: Array<{ itemId: string; name: string; line: number }>;
  combinedTotal: number;
  bestSingleTotal: number;
  savings: number;
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
  keepScreenOn: boolean;
}

export interface PriceSanityResult {
  ok: boolean;
  ratio: number;
  reference: number;
  message?: string;
}

export interface ShrinkflationResult {
  detected: boolean;
  previousPackSize?: number;
  currentPackSize?: number;
  message?: string;
}

export const DEFAULT_ZONE_ORDER: Category[] = [
  'voce-povrce',
  'pekara',
  'mlijecno',
  'meso',
  'ostava',
  'pice',
  'slatkisi',
  'cigarete',
  'hemija',
  'kucanstvo',
  'ostalo',
];

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
  lowestRecordedAt?: string;
  /** Zadnja cijena u aktivnoj radnji (ako je poznata) */
  activeStorePrice?: number;
  activeStoreName?: string;
  activeStoreRecordedAt?: string;
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
  cigarete: 'Cigarete i duvan',
  mlijecno: 'Mliječno i jaja',
  pekara: 'Pekara i tjestenina',
  ostava: 'Ulja i ostava',
  meso: 'Meso i riba',
  'voce-povrce': 'Voće i povrće',
  slatkisi: 'Slatkiši i grickalice',
  pice: 'Pića',
  hemija: 'Hemija i higijena',
  kucanstvo: 'Kućanstvo / alat / auto / vrt',
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
