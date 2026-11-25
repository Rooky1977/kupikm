import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEMO_LIST,
  DEMO_STORES,
  DEMO_TRIPS,
  buildDemoArchive,
} from '../data/demo';
import {
  initFirebase,
  isFirebaseConfigured,
  pushArchiveEntry,
  pushRememberedItem,
  pushShoppingList,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebase,
  subscribeSharedList,
} from '../lib/firebase';
import { cityFallbackLocation, requestUserLocation } from '../lib/geolocation';
import { normalizeItemKey, uid } from '../lib/format';
import {
  buildStoreEstimates,
  cartTotals,
  getLastPriceInfo,
  priceDeltaVsLast,
} from '../lib/scoring';
import type {
  AppSettings,
  ArchiveEntry,
  Category,
  CompletedTrip,
  GeoPoint,
  ListItem,
  RememberedItem,
  ShoppingList,
  Store,
  ThemeMode,
  Unit,
  UserProfile,
} from '../types';

interface PendingPrice {
  itemId: string;
}

interface AppState {
  user: UserProfile | null;
  settings: AppSettings;
  stores: Store[];
  list: ShoppingList;
  archive: ArchiveEntry[];
  remembered: RememberedItem[];
  trips: CompletedTrip[];
  budgetAmount: number;
  userLocation: GeoPoint | null;
  locationMode: 'gps' | 'city' | 'none';
  locationError: string | null;
  pendingPrice: PendingPrice | null;
  syncStatus: 'local' | 'syncing' | 'live' | 'offline';
  historyItemKey: string | null;

  getCart: () => ReturnType<typeof cartTotals>;
  getEstimates: () => ReturnType<typeof buildStoreEstimates>;
  getLastPrice: (itemName: string) => ReturnType<typeof getLastPriceInfo>;
  getMonthSpend: () => number;
  getArchiveForItem: (itemKey: string) => ArchiveEntry[];

  setTheme: (theme: ThemeMode) => void;
  setCityFallback: (city: string) => void;
  setOpenAiKey: (key: string) => void;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsDemo: () => void;

  addStore: (input: Omit<Store, 'id' | 'isCustom' | 'isFavorite'> & { isFavorite?: boolean }) => void;
  toggleFavorite: (storeId: string) => void;
  toggleSelectedStore: (storeId: string) => void;
  setActiveStore: (storeId: string) => void;

  addFromSuggestion: (input: {
    name: string;
    unit: Unit;
    category: Category;
    quantity?: number;
    catalogId?: string;
  }) => void;
  rememberCustomItem: (input: {
    name: string;
    unit: Unit;
    category: Category;
  }) => void;
  changeQuantity: (id: string, delta: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeListItem: (id: string) => void;

  /** Checkbox → otvara unos cijene (ako nije u korpi) ili izbacuje iz korpe */
  onToggleCheck: (id: string) => void;
  openPriceEntry: (itemId: string | null) => void;
  confirmToCart: (itemId: string, unitPrice: number, quantity: number) => Promise<void>;
  finishShopping: () => void;

  setBudget: (amount: number) => void;
  detectLocation: () => Promise<void>;
  useCityLocation: (city?: string) => void;
  joinSharedList: (code: string) => Promise<void>;
  startListSync: () => Promise<void>;
  setHistoryItemKey: (key: string | null) => void;
  bootstrapFirebase: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  cityFallback: 'Sarajevo',
  openAiApiKey: '',
  firebaseConfigured: isFirebaseConfigured(),
  useMockData: !isFirebaseConfigured(),
};

async function syncList(list: ShoppingList) {
  try {
    await pushShoppingList(list);
  } catch {
    /* offline queue */
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: {
        id: 'demo-user',
        email: 'demo@kupikm.ba',
        displayName: 'Demo korisnik',
        provider: 'demo',
      },
      settings: defaultSettings,
      stores: DEMO_STORES,
      list: DEMO_LIST,
      archive: buildDemoArchive(),
      remembered: [],
      trips: DEMO_TRIPS,
      budgetAmount: 400,
      userLocation: cityFallbackLocation('Sarajevo'),
      locationMode: 'city',
      locationError: null,
      pendingPrice: null,
      syncStatus: isFirebaseConfigured() ? 'syncing' : 'local',
      historyItemKey: null,

      getCart: () => cartTotals(get().list.items),

      getEstimates: () => {
        const { stores, list, archive } = get();
        const ids =
          list.selectedStoreIds.length > 0
            ? list.selectedStoreIds
            : stores.filter((s) => s.isFavorite).map((s) => s.id);
        return buildStoreEstimates(stores, ids, list.items.filter((i) => !i.checked), archive);
      },

      getLastPrice: (itemName) => getLastPriceInfo(get().archive, itemName),

      getMonthSpend: () => {
        const key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return get()
          .trips.filter((t) => t.date.startsWith(key))
          .reduce((s, t) => s + t.total, 0);
      },

      getArchiveForItem: (itemKey) =>
        get()
          .archive.filter((a) => a.itemKey === itemKey)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setCityFallback: (city) => set((s) => ({ settings: { ...s.settings, cityFallback: city } })),
      setOpenAiKey: (key) => set((s) => ({ settings: { ...s.settings, openAiApiKey: key } })),

      loginEmail: async (email, password) => {
        const user = await signInWithEmail(email, password);
        set({ user });
      },
      loginGoogle: async () => {
        const user = await signInWithGoogle();
        set({ user });
      },
      logout: async () => {
        await signOutFirebase();
        set({ user: null });
      },
      continueAsDemo: () =>
        set({
          user: {
            id: 'demo-user',
            email: 'demo@kupikm.ba',
            displayName: 'Demo korisnik',
            provider: 'demo',
          },
        }),

      addStore: (input) => {
        const store: Store = {
          ...input,
          id: uid('store'),
          isCustom: true,
          isFavorite: input.isFavorite ?? false,
        };
        set((s) => ({ stores: [...s.stores, store] }));
      },

      toggleFavorite: (storeId) =>
        set((s) => ({
          stores: s.stores.map((st) =>
            st.id === storeId ? { ...st, isFavorite: !st.isFavorite } : st,
          ),
        })),

      toggleSelectedStore: (storeId) => {
        const { list } = get();
        const exists = list.selectedStoreIds.includes(storeId);
        let next: string[];
        if (exists) next = list.selectedStoreIds.filter((id) => id !== storeId);
        else if (list.selectedStoreIds.length >= 5)
          next = [...list.selectedStoreIds.slice(1), storeId];
        else next = [...list.selectedStoreIds, storeId];
        const updated = { ...list, selectedStoreIds: next, updatedAt: new Date().toISOString() };
        set({ list: updated });
        void syncList(updated);
      },

      setActiveStore: (storeId) => {
        const updated = {
          ...get().list,
          activeStoreId: storeId,
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(updated);
      },

      addFromSuggestion: (input) => {
        const item: ListItem = {
          id: uid('item'),
          name: input.name,
          variant: input.name,
          quantity: input.quantity ?? 1,
          unit: input.unit,
          category: input.category,
          checked: false,
          catalogId: input.catalogId,
        };
        const updated = {
          ...get().list,
          items: [...get().list.items, item],
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(updated);
      },

      rememberCustomItem: (input) => {
        const remembered: RememberedItem = {
          id: uid('mem'),
          name: input.name.trim(),
          unit: input.unit,
          category: input.category,
          keywords: [normalizeItemKey(input.name)],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ remembered: [remembered, ...s.remembered] }));
        get().addFromSuggestion({
          name: remembered.name,
          unit: remembered.unit,
          category: remembered.category,
        });
        void pushRememberedItem(remembered);
      },

      changeQuantity: (id, delta) => {
        const updated = {
          ...get().list,
          items: get().list.items.map((it) => {
            if (it.id !== id) return it;
            const quantity = Math.max(0.1, Math.round((it.quantity + delta) * 10) / 10);
            const lineTotal =
              it.unitPrice != null ? Math.round(it.unitPrice * quantity * 100) / 100 : it.lineTotal;
            return { ...it, quantity, lineTotal };
          }),
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(updated);
      },

      setQuantity: (id, quantity) => {
        const q = Math.max(0.01, quantity);
        const updated = {
          ...get().list,
          items: get().list.items.map((it) => {
            if (it.id !== id) return it;
            const lineTotal =
              it.unitPrice != null ? Math.round(it.unitPrice * q * 100) / 100 : it.lineTotal;
            return { ...it, quantity: q, lineTotal };
          }),
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(updated);
      },

      removeListItem: (id) => {
        const updated = {
          ...get().list,
          items: get().list.items.filter((it) => it.id !== id),
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(updated);
      },

      onToggleCheck: (id) => {
        const item = get().list.items.find((i) => i.id === id);
        if (!item) return;
        if (item.checked) {
          const updated = {
            ...get().list,
            items: get().list.items.map((it) =>
              it.id === id
                ? { ...it, checked: false, unitPrice: undefined, lineTotal: undefined }
                : it,
            ),
            updatedAt: new Date().toISOString(),
          };
          set({ list: updated, pendingPrice: null });
          void syncList(updated);
          return;
        }
        set({ pendingPrice: { itemId: id } });
      },

      openPriceEntry: (itemId) =>
        set({ pendingPrice: itemId ? { itemId } : null }),

      confirmToCart: async (itemId, unitPrice, quantity) => {
        const { list, stores, archive } = get();
        const store = stores.find((s) => s.id === list.activeStoreId);
        const item = list.items.find((i) => i.id === itemId);
        if (!item || !store) return;

        const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
        const entry: ArchiveEntry = {
          id: uid('arch'),
          itemKey: normalizeItemKey(item.name),
          itemName: item.name,
          variant: item.variant,
          unit: item.unit,
          category: item.category,
          unitPrice,
          quantity,
          lineTotal,
          storeId: store.id,
          storeName: store.name,
          recordedAt: new Date().toISOString(),
          listId: list.id,
          source: 'cart',
        };

        const updated: ShoppingList = {
          ...list,
          items: list.items.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  checked: true,
                  quantity,
                  unitPrice,
                  lineTotal,
                }
              : it,
          ),
          updatedAt: new Date().toISOString(),
        };

        set({
          list: updated,
          archive: [entry, ...archive],
          pendingPrice: null,
        });

        void syncList(updated);
        void pushArchiveEntry(entry);

        // delta vs last (za UI se računa u modalu/headeru)
        void priceDeltaVsLast(archive, item.name, store.id, unitPrice);
      },

      finishShopping: () => {
        const { list, stores, trips } = get();
        const store = stores.find((s) => s.id === list.activeStoreId);
        const bought = list.items.filter((i) => i.checked && i.unitPrice != null);
        if (!bought.length) return;

        const trip: CompletedTrip = {
          id: uid('trip'),
          date: new Date().toISOString(),
          storeId: list.activeStoreId ?? 'unknown',
          storeName: store?.name ?? 'Nepoznata radnja',
          total: bought.reduce((s, i) => s + (i.lineTotal ?? 0), 0),
          itemCount: bought.length,
          items: bought.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice!,
            lineTotal: i.lineTotal ?? i.unitPrice! * i.quantity,
          })),
        };

        const updated: ShoppingList = {
          ...list,
          items: list.items.filter((i) => !i.checked),
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: [trip, ...trips],
          list: updated,
        });
        void syncList(updated);
      },

      setBudget: (amount) => set({ budgetAmount: amount }),

      detectLocation: async () => {
        const loc = await requestUserLocation();
        if (!loc) {
          set({
            locationError: 'Lokacija odbijena. Koristi se odabrani grad.',
            locationMode: 'city',
            userLocation: cityFallbackLocation(get().settings.cityFallback),
          });
          return;
        }
        set({ userLocation: loc, locationMode: 'gps', locationError: null });
      },

      useCityLocation: (city) => {
        const c = city ?? get().settings.cityFallback;
        set({
          settings: { ...get().settings, cityFallback: c },
          userLocation: cityFallbackLocation(c),
          locationMode: 'city',
          locationError: null,
        });
      },

      joinSharedList: async (code) => {
        const shareCode = code.trim().toUpperCase();
        const updated = {
          ...get().list,
          shareCode,
          name: `Dijeljeni spisak (${shareCode})`,
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        await syncList(updated);
        await get().startListSync();
      },

      startListSync: async () => {
        if (!isFirebaseConfigured()) {
          set({ syncStatus: 'local' });
          return;
        }
        set({ syncStatus: 'syncing' });
        const code = get().list.shareCode;
        await subscribeSharedList(code, (remote) => {
          if (remote.updatedAt > get().list.updatedAt) {
            set({ list: remote, syncStatus: 'live' });
          } else {
            set({ syncStatus: 'live' });
          }
        });
        await syncList(get().list);
        set({ syncStatus: 'live' });
      },

      setHistoryItemKey: (key) => set({ historyItemKey: key }),

      bootstrapFirebase: async () => {
        const result = await initFirebase();
        set((s) => ({
          settings: {
            ...s.settings,
            firebaseConfigured: result.mode === 'live',
            useMockData: result.mode !== 'live',
          },
          syncStatus: result.mode === 'live' ? 'syncing' : 'local',
        }));
        if (result.mode === 'live') {
          await get().startListSync();
        }
      },
    }),
    {
      name: 'kupikm-v2',
      partialize: (s) => ({
        settings: s.settings,
        stores: s.stores,
        list: s.list,
        archive: s.archive,
        remembered: s.remembered,
        trips: s.trips,
        budgetAmount: s.budgetAmount,
        user: s.user,
      }),
    },
  ),
);
