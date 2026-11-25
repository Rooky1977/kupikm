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
  createFamilySpace,
  deleteAliasDoc,
  deleteArchiveEntry,
  deleteReceiptDoc,
  deleteRememberedDoc,
  deleteTemplateDoc,
  deleteTripDoc,
  generateShareCode,
  initFirebase,
  isFirebaseConfigured,
  joinFamilySpace,
  pushAlias,
  pushArchiveEntry,
  pushFamilyBudget,
  pushFamilyList,
  pushReceipt,
  pushRememberedItem,
  pushTemplate,
  pushTrip,
  registerWithEmail,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebase,
  subscribeFamily,
  watchAuth,
  type Unsub,
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
  ItemAlias,
  ListItem,
  Receipt,
  ReceiptItem,
  RememberedItem,
  ShoppingList,
  ShoppingTemplate,
  Store,
  SyncStatus,
  ThemeMode,
  Unit,
  UserProfile,
} from '../types';

interface AppState {
  user: UserProfile | null;
  authReady: boolean;
  authError: string | null;
  settings: AppSettings;
  stores: Store[];
  list: ShoppingList;
  archive: ArchiveEntry[];
  remembered: RememberedItem[];
  aliases: ItemAlias[];
  templates: ShoppingTemplate[];
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
  familyUnsub: Unsub | null;

  getCirka: () => ReturnType<typeof computeCirka>;
  getEstimates: (forAllItems?: boolean) => ReturnType<typeof buildStoreEstimates>;
  getLastPrice: (itemName: string) => ReturnType<typeof getLastPriceInfo>;
  getMonthSpend: () => number;
  getArchiveForItem: (itemKey: string) => ArchiveEntry[];
  familyCode: () => string | undefined;

  setTheme: (theme: ThemeMode) => void;
  setCityFallback: (city: string) => void;
  setAiSettings: (patch: Partial<Pick<AppSettings, 'aiProvider' | 'geminiApiKey' | 'groqApiKey'>>) => void;
  setOnline: (online: boolean) => void;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsDemo: () => void;
  clearAuthError: () => void;

  createFamily: () => Promise<string>;
  joinFamily: (code: string) => Promise<void>;

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
  renameRememberedItem: (id: string, name: string) => void;
  deleteRememberedItem: (id: string) => void;
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

  deleteReceipt: (receiptId: string) => Promise<void>;
  updateReceiptItem: (
    receiptId: string,
    itemIndex: number,
    patch: Partial<Pick<ReceiptItem, 'unitPrice' | 'quantity' | 'name'>>,
  ) => Promise<void>;
  deleteReceiptItem: (receiptId: string, itemIndex: number) => Promise<void>;

  updateArchiveEntry: (
    id: string,
    patch: Partial<Pick<ArchiveEntry, 'unitPrice' | 'quantity' | 'itemName'>>,
  ) => Promise<void>;
  deleteArchiveEntryById: (id: string) => Promise<void>;
  renameArchiveItem: (itemKey: string, newName: string) => Promise<void>;
  deleteArchiveItemGroup: (itemKey: string) => Promise<void>;

  saveAlias: (input: {
    rawName: string;
    catalogName: string;
    catalogId?: string;
    category: Category;
    unit: Unit;
  }) => Promise<void>;

  saveTemplateFromList: (name: string) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;

  setBudget: (amount: number) => void;
  detectLocation: () => Promise<void>;
  useCityLocation: (city?: string) => void;
  joinSharedList: (code: string) => Promise<void>;
  startFamilySync: (code: string) => Promise<void>;
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

function emptyList(code?: string): ShoppingList {
  const shareCode = code ?? generateShareCode();
  return {
    id: `list-${shareCode}`,
    name: 'Moj spisak',
    shareCode,
    items: [],
    selectedStoreIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function codeOf(get: () => AppState): string | undefined {
  return get().user?.familyCode || get().list.shareCode;
}

async function syncList(get: () => AppState, list: ShoppingList) {
  const code = get().user?.familyCode || list.shareCode;
  if (!code || get().user?.provider === 'demo') return;
  try {
    await pushFamilyList(code, list);
  } catch {
    /* offline */
  }
}

let bootstrapped = false;
let authUnsub: Unsub | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      authReady: false,
      authError: null,
      settings: defaultSettings,
      stores: DEMO_STORES,
      list: emptyList(),
      archive: [],
      remembered: [],
      aliases: [],
      templates: [],
      trips: [],
      receipts: [],
      budgetAmount: 400,
      userLocation: cityFallbackLocation('Sarajevo'),
      locationMode: 'city',
      locationError: null,
      pendingPriceItemId: null,
      syncStatus: isFirebaseConfigured() ? 'sync' : 'local',
      historyItemKey: null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      familyUnsub: null,

      familyCode: () => get().user?.familyCode || get().list.shareCode,

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
      clearAuthError: () => set({ authError: null }),

      loginEmail: async (email, password) => {
        set({ authError: null });
        try {
          const user = await signInWithEmail(email, password);
          set({ user });
        } catch (e) {
          set({ authError: e instanceof Error ? e.message : 'Prijava nije uspjela.' });
          throw e;
        }
      },

      registerEmail: async (email, password, displayName) => {
        set({ authError: null });
        try {
          const user = await registerWithEmail(email, password, displayName);
          set({ user });
        } catch (e) {
          set({ authError: e instanceof Error ? e.message : 'Registracija nije uspjela.' });
          throw e;
        }
      },

      loginGoogle: async () => {
        set({ authError: null });
        try {
          const user = await signInWithGoogle();
          set({ user });
        } catch (e) {
          set({ authError: e instanceof Error ? e.message : 'Google prijava nije uspjela.' });
          throw e;
        }
      },

      sendPasswordReset: async (email) => {
        set({ authError: null });
        try {
          await resetPassword(email);
        } catch (e) {
          set({ authError: e instanceof Error ? e.message : 'Reset lozinke nije uspio.' });
          throw e;
        }
      },

      logout: async () => {
        get().familyUnsub?.();
        await signOutFirebase();
        set({
          user: null,
          familyUnsub: null,
          syncStatus: 'local',
          list: emptyList(),
          archive: [],
          receipts: [],
          trips: [],
          aliases: [],
          templates: [],
          remembered: [],
        });
      },

      continueAsDemo: () => {
        get().familyUnsub?.();
        const code = generateShareCode();
        set({
          user: {
            id: 'demo-user',
            email: 'demo@kupikm.ba',
            displayName: 'Demo korisnik',
            provider: 'demo',
            familyCode: code,
          },
          list: { ...DEMO_LIST, shareCode: code },
          archive: buildDemoArchive(),
          receipts: DEMO_RECEIPTS,
          trips: DEMO_TRIPS,
          aliases: [],
          templates: [],
          remembered: [],
          familyUnsub: null,
          syncStatus: 'local',
          authReady: true,
        });
      },

      createFamily: async () => {
        const { user, list, budgetAmount } = get();
        if (!user || user.provider === 'demo') {
          const code = generateShareCode();
          const updated = { ...list, shareCode: code, name: 'Porodični spisak', updatedAt: new Date().toISOString() };
          set({
            user: user ? { ...user, familyCode: code } : user,
            list: updated,
          });
          return code;
        }
        const code = await createFamilySpace(user.id, user.displayName, {
          list,
          budgetAmount,
        });
        const updated = {
          ...list,
          shareCode: code,
          name: 'Porodični spisak',
          updatedAt: new Date().toISOString(),
        };
        set({ user: { ...user, familyCode: code }, list: updated });
        await get().startFamilySync(code);
        return code;
      },

      joinFamily: async (raw) => {
        const { user } = get();
        if (!user) throw new Error('Prijavi se prije pridruživanja.');
        if (user.provider === 'demo') {
          const code = raw.trim().toUpperCase();
          set({
            user: { ...user, familyCode: code },
            list: { ...get().list, shareCode: code, name: `Dijeljeni spisak (${code})` },
          });
          return;
        }
        const code = await joinFamilySpace(user.id, raw);
        set({
          user: { ...user, familyCode: code },
          list: { ...get().list, shareCode: code, name: `Dijeljeni spisak (${code})` },
        });
        await get().startFamilySync(code);
      },

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
        void syncList(get, updated);
      },

      setSelectedStores: (ids) => {
        const updated = {
          ...get().list,
          selectedStoreIds: ids.slice(0, 3),
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(get, updated);
      },

      setActiveStore: (storeId) => {
        const updated = {
          ...get().list,
          activeStoreId: storeId,
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(get, updated);
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
        void syncList(get, updated);
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
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void pushRememberedItem(code, remembered);
      },

      renameRememberedItem: (id, name) => {
        const next = get().remembered.map((r) =>
          r.id === id
            ? { ...r, name: name.trim(), keywords: [normalizeItemKey(name)] }
            : r,
        );
        set({ remembered: next });
        const item = next.find((r) => r.id === id);
        const code = codeOf(get);
        if (item && code && get().user?.provider !== 'demo') void pushRememberedItem(code, item);
      },

      deleteRememberedItem: (id) => {
        set((s) => ({ remembered: s.remembered.filter((r) => r.id !== id) }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void deleteRememberedDoc(code, id);
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
        void syncList(get, updated);
      },

      removeListItem: (id) => {
        const updated = {
          ...get().list,
          items: get().list.items.filter((it) => it.id !== id),
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(get, updated);
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
          void syncList(get, updated);
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

        void syncList(get, updated);
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          void pushArchiveEntry(code, entry).then(() => {
            if (get().online && isFirebaseConfigured()) set({ syncStatus: 'online' });
          });
        }
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
        void syncList(get, updated);
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void pushTrip(code, trip);
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

        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          void pushReceipt(code, receipt);
          for (const entry of newArchive) void pushArchiveEntry(code, entry);
          void pushTrip(code, trip);
        }
      },

      deleteReceipt: async (receiptId) => {
        const linkedArchive = get().archive.filter((a) => a.receiptId === receiptId);
        const linkedTrips = get().trips.filter((t) => t.receiptId === receiptId);
        set((s) => ({
          receipts: s.receipts.filter((r) => r.id !== receiptId),
          archive: s.archive.filter((a) => a.receiptId !== receiptId),
          trips: s.trips.filter((t) => t.receiptId !== receiptId),
        }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          void deleteReceiptDoc(code, receiptId);
          for (const a of linkedArchive) void deleteArchiveEntry(code, a.id);
          for (const t of linkedTrips) void deleteTripDoc(code, t.id);
        }
      },

      updateReceiptItem: async (receiptId, itemIndex, patch) => {
        const receipt = get().receipts.find((r) => r.id === receiptId);
        if (!receipt) return;
        const prevArchive = get().archive.filter((a) => a.receiptId === receiptId);
        const items = receipt.items.map((it, i) => {
          if (i !== itemIndex) return it;
          const quantity = patch.quantity ?? it.quantity;
          const unitPrice = patch.unitPrice ?? it.unitPrice;
          const name = patch.name ?? it.name;
          return {
            ...it,
            name,
            quantity,
            unitPrice,
            lineTotal: Math.round(unitPrice * quantity * 100) / 100,
          };
        });
        const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
        const updatedReceipt: Receipt = { ...receipt, items, total };

        const without = get().archive.filter((a) => a.receiptId !== receiptId);
        const rebuilt: ArchiveEntry[] = items.map((it, idx) => {
          const prev = prevArchive[idx];
          return {
            id: prev?.id ?? uid('arch'),
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
            receiptId,
          };
        });

        const trips = get().trips.map((t) =>
          t.receiptId === receiptId
            ? {
                ...t,
                total,
                itemCount: items.length,
                items: items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  unitPrice: i.unitPrice,
                  lineTotal: i.lineTotal,
                })),
              }
            : t,
        );

        set({
          receipts: get().receipts.map((r) => (r.id === receiptId ? updatedReceipt : r)),
          archive: [...rebuilt, ...without],
          trips,
        });

        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          void pushReceipt(code, updatedReceipt);
          const keep = new Set(rebuilt.map((r) => r.id));
          for (const a of prevArchive) {
            if (!keep.has(a.id)) void deleteArchiveEntry(code, a.id);
          }
          for (const entry of rebuilt) void pushArchiveEntry(code, entry);
          const trip = trips.find((t) => t.receiptId === receiptId);
          if (trip) void pushTrip(code, trip);
        }
      },

      deleteReceiptItem: async (receiptId, itemIndex) => {
        const receipt = get().receipts.find((r) => r.id === receiptId);
        if (!receipt) return;
        if (receipt.items.length <= 1) {
          await get().deleteReceipt(receiptId);
          return;
        }
        const removed = receipt.items[itemIndex];
        const items = receipt.items.filter((_, i) => i !== itemIndex);
        const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
        const updatedReceipt: Receipt = { ...receipt, items, total };

        let removedArchive = false;
        const archive = get().archive.filter((a) => {
          if (a.receiptId !== receiptId) return true;
          if (
            !removedArchive &&
            removed &&
            a.itemKey === normalizeItemKey(removed.name) &&
            Math.abs(a.unitPrice - removed.unitPrice) < 0.001
          ) {
            removedArchive = true;
            const code = codeOf(get);
            if (code && get().user?.provider !== 'demo') void deleteArchiveEntry(code, a.id);
            return false;
          }
          return true;
        });

        const trips = get().trips.map((t) =>
          t.receiptId === receiptId
            ? {
                ...t,
                total,
                itemCount: items.length,
                items: items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  unitPrice: i.unitPrice,
                  lineTotal: i.lineTotal,
                })),
              }
            : t,
        );

        set({
          receipts: get().receipts.map((r) => (r.id === receiptId ? updatedReceipt : r)),
          archive,
          trips,
        });

        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          void pushReceipt(code, updatedReceipt);
          const trip = trips.find((t) => t.receiptId === receiptId);
          if (trip) void pushTrip(code, trip);
        }
      },

      updateArchiveEntry: async (id, patch) => {
        const entry = get().archive.find((a) => a.id === id);
        if (!entry) return;
        const unitPrice = patch.unitPrice ?? entry.unitPrice;
        const quantity = patch.quantity ?? entry.quantity;
        const itemName = patch.itemName ?? entry.itemName;
        const updated: ArchiveEntry = {
          ...entry,
          unitPrice,
          quantity,
          itemName,
          itemKey: normalizeItemKey(itemName),
          lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        };
        set((s) => ({
          archive: s.archive.map((a) => (a.id === id ? updated : a)),
        }));

        if (entry.receiptId) {
          const receipt = get().receipts.find((r) => r.id === entry.receiptId);
          if (receipt) {
            const items = receipt.items.map((it) =>
              normalizeItemKey(it.name) === entry.itemKey &&
              Math.abs(it.unitPrice - entry.unitPrice) < 0.001
                ? {
                    ...it,
                    name: itemName,
                    unitPrice,
                    quantity,
                    lineTotal: Math.round(unitPrice * quantity * 100) / 100,
                  }
                : it,
            );
            const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
            const updatedReceipt = { ...receipt, items, total };
            set((s) => ({
              receipts: s.receipts.map((r) => (r.id === entry.receiptId ? updatedReceipt : r)),
              trips: s.trips.map((t) =>
                t.receiptId === entry.receiptId
                  ? {
                      ...t,
                      total,
                      items: items.map((i) => ({
                        name: i.name,
                        quantity: i.quantity,
                        unit: i.unit,
                        unitPrice: i.unitPrice,
                        lineTotal: i.lineTotal,
                      })),
                    }
                  : t,
              ),
            }));
            const code = codeOf(get);
            if (code && get().user?.provider !== 'demo') void pushReceipt(code, updatedReceipt);
          }
        }

        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void pushArchiveEntry(code, updated);
      },

      deleteArchiveEntryById: async (id) => {
        const entry = get().archive.find((a) => a.id === id);
        set((s) => ({
          archive: s.archive.filter((a) => a.id !== id),
          historyItemKey:
            s.historyItemKey && entry && entry.itemKey === s.historyItemKey
              ? s.archive.filter((a) => a.id !== id && a.itemKey === s.historyItemKey).length
                ? s.historyItemKey
                : null
              : s.historyItemKey,
        }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void deleteArchiveEntry(code, id);
      },

      renameArchiveItem: async (itemKey, newName) => {
        const name = newName.trim();
        if (!name) return;
        const newKey = normalizeItemKey(name);
        const updated = get().archive.map((a) =>
          a.itemKey === itemKey ? { ...a, itemName: name, itemKey: newKey } : a,
        );
        set({
          archive: updated,
          historyItemKey: get().historyItemKey === itemKey ? newKey : get().historyItemKey,
          remembered: get().remembered.map((r) =>
            normalizeItemKey(r.name) === itemKey
              ? { ...r, name, keywords: [newKey] }
              : r,
          ),
        });
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          for (const a of updated.filter((x) => x.itemKey === newKey)) {
            void pushArchiveEntry(code, a);
          }
        }
      },

      deleteArchiveItemGroup: async (itemKey) => {
        const toDelete = get().archive.filter((a) => a.itemKey === itemKey);
        set((s) => ({
          archive: s.archive.filter((a) => a.itemKey !== itemKey),
          historyItemKey: s.historyItemKey === itemKey ? null : s.historyItemKey,
          remembered: s.remembered.filter((r) => normalizeItemKey(r.name) !== itemKey),
        }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          for (const a of toDelete) void deleteArchiveEntry(code, a.id);
        }
      },

      saveAlias: async (input) => {
        const alias: ItemAlias = {
          id: uid('alias'),
          rawName: input.rawName,
          rawKey: normalizeItemKey(input.rawName),
          catalogName: input.catalogName,
          catalogId: input.catalogId,
          category: input.category,
          unit: input.unit,
          createdAt: new Date().toISOString(),
        };
        const existing = get().aliases.filter((a) => a.rawKey !== alias.rawKey);
        set({ aliases: [alias, ...existing] });
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') {
          const old = get().aliases.find((a) => a.rawKey === alias.rawKey && a.id !== alias.id);
          if (old) void deleteAliasDoc(code, old.id);
          void pushAlias(code, alias);
        }
      },

      saveTemplateFromList: (name) => {
        const items = get().list.items;
        if (!items.length) return;
        const template: ShoppingTemplate = {
          id: uid('tpl'),
          name: name.trim() || 'Šablon kupovine',
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            category: i.category,
            catalogId: i.catalogId,
          })),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ templates: [template, ...s.templates] }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void pushTemplate(code, template);
      },

      loadTemplate: (templateId) => {
        const tpl = get().templates.find((t) => t.id === templateId);
        if (!tpl) return;
        const existingKeys = new Set(get().list.items.map((i) => normalizeItemKey(i.name)));
        const additions: ListItem[] = tpl.items
          .filter((i) => !existingKeys.has(normalizeItemKey(i.name)))
          .map((i) => ({
            id: uid('item'),
            name: i.name,
            variant: i.name,
            quantity: i.quantity,
            unit: i.unit,
            category: i.category,
            checked: false,
            catalogId: i.catalogId,
          }));
        if (!additions.length) return;
        const updated = {
          ...get().list,
          items: [...get().list.items, ...additions],
          updatedAt: new Date().toISOString(),
        };
        set({ list: updated });
        void syncList(get, updated);
      },

      deleteTemplate: (templateId) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== templateId) }));
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void deleteTemplateDoc(code, templateId);
      },

      setBudget: (amount) => {
        set({ budgetAmount: amount });
        const code = codeOf(get);
        if (code && get().user?.provider !== 'demo') void pushFamilyBudget(code, amount);
      },

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
        await get().joinFamily(code);
      },

      startFamilySync: async (code) => {
        if (!isFirebaseConfigured() || !code || get().user?.provider === 'demo') {
          set({ syncStatus: 'local' });
          return;
        }
        get().familyUnsub?.();
        set({ syncStatus: 'sync' });
        const unsub = await subscribeFamily(code, (patch) => {
          set((s) => {
            const next: Partial<AppState> = {
              syncStatus: s.online ? 'online' : 'offline',
            };
            if (patch.list && patch.list.updatedAt >= s.list.updatedAt) {
              next.list = patch.list;
            }
            if (typeof patch.budgetAmount === 'number') next.budgetAmount = patch.budgetAmount;
            if (patch.archive) next.archive = patch.archive as ArchiveEntry[];
            if (patch.receipts) next.receipts = patch.receipts as Receipt[];
            if (patch.remembered) next.remembered = patch.remembered as RememberedItem[];
            if (patch.aliases) next.aliases = patch.aliases as ItemAlias[];
            if (patch.templates) next.templates = patch.templates as ShoppingTemplate[];
            if (patch.trips) next.trips = patch.trips as CompletedTrip[];
            return next;
          });
        });
        set({ familyUnsub: unsub });
        await syncList(get, get().list);
        set({ syncStatus: get().online ? 'online' : 'offline' });
      },

      setHistoryItemKey: (key) => set({ historyItemKey: key }),

      bootstrapFirebase: async () => {
        if (bootstrapped) return;
        bootstrapped = true;
        const result = await initFirebase();
        set((s) => ({
          settings: {
            ...s.settings,
            firebaseConfigured: result.mode === 'live',
            useMockData: result.mode !== 'live',
          },
          syncStatus: result.mode === 'live' ? 'sync' : 'local',
        }));

        if (result.mode !== 'live') {
          // Restore persisted demo session if present
          if (get().user?.provider === 'demo') {
            set({ authReady: true });
            return;
          }
          set({ authReady: true });
          return;
        }

        authUnsub?.();
        authUnsub = await watchAuth(async (profile) => {
          if (!profile) {
            if (get().user?.provider === 'demo') {
              set({ authReady: true });
              return;
            }
            get().familyUnsub?.();
            set({ user: null, authReady: true, familyUnsub: null });
            return;
          }

          let user = profile;
          if (!user.familyCode) {
            try {
              const code = await createFamilySpace(user.id, user.displayName, {
                list: get().list,
                budgetAmount: get().budgetAmount,
              });
              user = { ...user, familyCode: code };
            } catch {
              user = { ...user, familyCode: get().list.shareCode || generateShareCode() };
            }
          }

          set({
            user,
            authReady: true,
            list: {
              ...get().list,
              shareCode: user.familyCode ?? get().list.shareCode,
            },
          });

          if (user.familyCode) await get().startFamilySync(user.familyCode);
        });
      },
    }),
    {
      name: 'kupikm-v4',
      partialize: (s) => ({
        settings: s.settings,
        stores: s.stores,
        list: s.list,
        archive: s.archive,
        remembered: s.remembered,
        aliases: s.aliases,
        templates: s.templates,
        trips: s.trips,
        receipts: s.receipts,
        budgetAmount: s.budgetAmount,
        user: s.user?.provider === 'demo' ? s.user : null,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          authReady: false,
          familyUnsub: null,
          settings: normalizeSettings(p.settings ?? current.settings),
          aliases: p.aliases ?? [],
          templates: p.templates ?? [],
        };
      },
    },
  ),
);
