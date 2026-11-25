import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEMO_LIST,
  DEMO_RECEIPTS,
  DEMO_STORES,
  DEMO_TRIPS,
  buildDemoArchive,
} from '../data/demo';
import { toReceiptItems } from '../lib/aiParse';
import {
  initFirebase,
  isFirebaseConfigured,
  pushArchiveEntry,
  pushReceipt,
  pushRememberedItem,
  pushShoppingList,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebase,
  subscribeSharedList,
} from '../lib/firebase';
import { cityFallbackLocation, requestUserLocation } from '../lib/geolocation';
import { monthKey, normalizeItemKey, uid } from '../lib/format';
import {
  buildStoreEstimates,
  computeCirka,
  getLastPriceInfo,
  priceDeltaVsLast,
} from '../lib/scoring';
import type {
  AiProvider,
  AppSettings,
  ArchiveEntry,
  Category,
  CompletedTrip,
  GeoPoint,
  ListItem,
  Receipt,
  ReceiptItem,
  RememberedItem,
  ShoppingList,
  Store,
  SyncStatus,
  ThemeMode,
  Unit,
  UserProfile,
} from '../types';

interface AppState {
  user: UserProfile | null;
  settings: AppSettings;
  stores: Store[];
  list: ShoppingList;
  archive: ArchiveEntry[];
  remembered: RememberedItem[];
  trips: CompletedTrip[];
  receipts: Receipt[];
  budgetAmount: number;
  userLocation: GeoPoint | null;
  locationMode: 'gps' | 'city' | 'none';
  locationError: string | null;
  pendingPriceItemId: string | null;
  syncStatus: SyncStatus;
  historyItemKey: string | null;
  online: boolean;

  getCirka: () => ReturnType<typeof computeCirka>;
  getEstimates: (forAllItems?: boolean) => ReturnType<typeof buildStoreEstimates>;
  getLastPrice: (itemName: string) => ReturnType<typeof getLastPriceInfo>;
  getMonthSpend: () => number;
  getArchiveForItem: (itemKey: string) => ArchiveEntry[];

  setTheme: (theme: ThemeMode) => void;
  setCityFallback: (city: string) => void;
  setAiSettings: (patch: Partial<Pick<AppSettings, 'aiProvider' | 'geminiApiKey' | 'groqApiKey'>>) => void;
  setOnline: (online: boolean) => void;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsDemo: () => void;

  addStore: (input: Omit<Store, 'id' | 'isCustom' | 'isFavorite'> & { isFavorite?: boolean }) => void;
  toggleFavorite: (storeId: string) => void;
  toggleSelectedStore: (storeId: string) => void;
  setSelectedStores: (ids: string[]) => void;
  setActiveStore: (storeId: string) => void;

  addFromSuggestion: (input: {
    name: string;
    unit: Unit;
    category: Category;
    quantity?: number;
    catalogId?: string;
  }) => void;
  rememberCustomItem: (input: { name: string; unit: Unit; category: Category }) => void;
  changeQuantity: (id: string, delta: number) => void;
  removeListItem: (id: string) => void;

  onToggleCheck: (id: string) => void;
  openPriceEntry: (itemId: string | null) => void;
  confirmToCart: (itemId: string, unitPrice: number, quantity: number) => Promise<void>;
  finishShopping: () => void;

  saveReceipt: (input: {
    storeId: string;
    storeName: string;
    date: string;
    items: ReceiptItem[];
    total: number;
    imageDataUrl?: string;
    source: Receipt['source'];
    note?: string;
  }) => Promise<void>;

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
  aiProvider: 'auto',
  geminiApiKey: '',
  groqApiKey: '',
  firebaseConfigured: isFirebaseConfigured(),
  useMockData: !isFirebaseConfigured(),
};

function normalizeSettings(raw?: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...raw,
    aiProvider: (raw?.aiProvider as AiProvider) || 'auto',
    geminiApiKey: raw?.geminiApiKey ?? '',
    groqApiKey: raw?.groqApiKey ?? '',
  };
}

async function syncList(list: ShoppingList) {
  try {
    await pushShoppingList(list);
  } catch {
    /* offline */
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
      receipts: DEMO_RECEIPTS,
      budgetAmount: 400,
      userLocation: cityFallbackLocation('Sarajevo'),
      locationMode: 'city',
      locationError: null,
      pendingPriceItemId: null,
      syncStatus: isFirebaseConfigured() ? 'sync' : 'local',
      historyItemKey: null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,

      getCirka: () => {
        const s = get();
        return computeCirka(
          s.list.items,
          s.list.activeStoreId,
          s.archive,
          s.budgetAmount,
          s.getMonthSpend(),
        );
      },

      getEstimates: (forAllItems = true) => {
        const { stores, list, archive, userLocation } = get();
        const ids =
          list.selectedStoreIds.length > 0
            ? list.selectedStoreIds.slice(0, 3)
            : stores.filter((st) => st.isFavorite).map((st) => st.id).slice(0, 3);
        const items = forAllItems ? list.items : list.items.filter((i) => !i.checked);
        return buildStoreEstimates(stores, ids, items, archive, userLocation);
      },

      getLastPrice: (itemName) => getLastPriceInfo(get().archive, itemName),

      getMonthSpend: () => {
        const key = monthKey();
        const fromTrips = get()
          .trips.filter((t) => t.date.startsWith(key))
          .reduce((s, t) => s + t.total, 0);
        const tripReceiptIds = new Set(
          get()
            .trips.filter((t) => t.date.startsWith(key) && t.receiptId)
            .map((t) => t.receiptId),
        );
        const fromReceipts = get()
          .receipts.filter((r) => r.date.startsWith(key) && !tripReceiptIds.has(r.id))
          .reduce((s, r) => s + r.total, 0);
        return fromTrips + fromReceipts;
      },

      getArchiveForItem: (itemKey) =>
        get()
          .archive.filter((a) => a.itemKey === itemKey)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setCityFallback: (city) => set((s) => ({ settings: { ...s.settings, cityFallback: city } })),
      setAiSettings: (patch) =>
        set((s) => ({ settings: normalizeSettings({ ...s.settings, ...patch }) })),
      setOnline: (online) =>
        set({
          online,
          syncStatus: !online
            ? 'offline'
            : isFirebaseConfigured()
              ? 'online'
              : 'local',
        }),

      loginEmail: async (email, password) => {
        set({ user: await signInWithEmail(email, password) });
      },
      loginGoogle: async () => {
        set({ user: await signInWithGoogle() });
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
        set((s) => ({
          stores: [
            ...s.stores,
            {
              ...input,
              id: uid('store'),
              isCustom: true,
              isFavorite: input.isFavorite ?? false,
            },
          ],
        }));
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
        else if (list.selectedStoreIds.length >= 3)
          next = [...list.selectedStoreIds.slice(1), storeId];
        else next = [...list.selectedStoreIds, storeId];
        const updated = { ...list, selectedStoreIds: next, updatedAt: new Date().toISOString() };
        set({ list: updated });
        void syncList(updated);
      },

      setSelectedStores: (ids) => {
        const updated = {
          ...get().list,
          selectedStoreIds: ids.slice(0, 3),
          updatedAt: new Date().toISOString(),
        };
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
            const step = it.unit === 'kg' || it.unit === 'l' ? 0.1 : 1;
            const quantity = Math.max(step, Math.round((it.quantity + delta * step) * 10) / 10);
            const lineTotal =
              it.unitPrice != null ? Math.round(it.unitPrice * quantity * 100) / 100 : it.lineTotal;
            return { ...it, quantity, lineTotal };
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
                ? {
                    ...it,
                    checked: false,
                    unitPrice: undefined,
                    lineTotal: undefined,
                    priceDelta: undefined,
                  }
                : it,
            ),
            updatedAt: new Date().toISOString(),
          };
          set({ list: updated, pendingPriceItemId: null });
          void syncList(updated);
          return;
        }
        set({ pendingPriceItemId: id });
      },

      openPriceEntry: (itemId) => set({ pendingPriceItemId: itemId }),

      confirmToCart: async (itemId, unitPrice, quantity) => {
        const { list, stores, archive } = get();
        const store = stores.find((s) => s.id === list.activeStoreId);
        const item = list.items.find((i) => i.id === itemId);
        if (!item || !store) return;

        const delta = priceDeltaVsLast(archive, item.name, store.id, unitPrice);
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
                  priceDelta: delta ?? undefined,
                }
              : it,
          ),
          updatedAt: new Date().toISOString(),
        };

        set({
          list: updated,
          archive: [entry, ...archive],
          pendingPriceItemId: null,
          syncStatus: get().online && isFirebaseConfigured() ? 'sync' : get().syncStatus,
        });

        void syncList(updated);
        void pushArchiveEntry(entry).then(() => {
          if (get().online && isFirebaseConfigured()) set({ syncStatus: 'online' });
        });
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

        set({ trips: [trip, ...trips], list: updated });
        void syncList(updated);
      },

      saveReceipt: async (input) => {
        const receipt: Receipt = {
          id: uid('rcpt'),
          storeId: input.storeId,
          storeName: input.storeName,
          date: input.date,
          total: input.total,
          items: input.items.length ? input.items : toReceiptItems([]),
          imageDataUrl: input.imageDataUrl,
          note: input.note,
          createdAt: new Date().toISOString(),
          source: input.source,
        };

        const newArchive: ArchiveEntry[] = receipt.items.map((it) => ({
          id: uid('arch'),
          itemKey: normalizeItemKey(it.name),
          itemName: it.name,
          unit: it.unit,
          category: it.category,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          lineTotal: it.lineTotal,
          storeId: receipt.storeId,
          storeName: receipt.storeName,
          recordedAt: receipt.date,
          listId: get().list.id,
          source: 'receipt' as const,
          receiptId: receipt.id,
        }));

        const trip: CompletedTrip = {
          id: uid('trip'),
          date: receipt.date,
          storeId: receipt.storeId,
          storeName: receipt.storeName,
          total: receipt.total,
          itemCount: receipt.items.length,
          items: receipt.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
          receiptId: receipt.id,
        };

        set((s) => ({
          receipts: [receipt, ...s.receipts],
          archive: [...newArchive, ...s.archive],
          trips: [trip, ...s.trips],
        }));

        void pushReceipt(receipt);
        for (const entry of newArchive) void pushArchiveEntry(entry);
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
        set({ syncStatus: 'sync' });
        const code = get().list.shareCode;
        await subscribeSharedList(code, (remote) => {
          if (remote.updatedAt > get().list.updatedAt) {
            set({ list: remote, syncStatus: get().online ? 'online' : 'offline' });
          } else {
            set({ syncStatus: get().online ? 'online' : 'offline' });
          }
        });
        await syncList(get().list);
        set({ syncStatus: get().online ? 'online' : 'offline' });
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
          syncStatus: result.mode === 'live' ? 'sync' : 'local',
        }));
        if (result.mode === 'live') await get().startListSync();
      },
    }),
    {
      name: 'kupikm-v3',
      partialize: (s) => ({
        settings: s.settings,
        stores: s.stores,
        list: s.list,
        archive: s.archive,
        remembered: s.remembered,
        trips: s.trips,
        receipts: s.receipts,
        budgetAmount: s.budgetAmount,
        user: s.user,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          settings: normalizeSettings(p.settings ?? current.settings),
        };
      },
    },
  ),
);
