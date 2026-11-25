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

/** Zapis u arhivi cijena (auto-snimanje pri stavljanju u korpu). */
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

/** Korisnički zapamćen artikal (lokalno + Firestore). */
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
  /** Cijena po jedinici kad je u korpi */
  unitPrice?: number;
  lineTotal?: number;
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
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'demo' | 'email' | 'google';
}

export interface AppSettings {
  theme: ThemeMode;
  cityFallback: string;
  openAiApiKey: string;
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
  isCheapest: boolean;
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
