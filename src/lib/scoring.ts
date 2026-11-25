import type {
  ArchiveEntry,
  CirkaSummary,
  GeoPoint,
  LastPriceInfo,
  ListItem,
  Store,
  StoreEstimate,
} from '../types';
import { normalizeItemKey } from './format';
import { haversineKm } from './geolocation';

export function latestArchivePrice(
  archive: ArchiveEntry[],
  itemName: string,
  storeId?: string,
): ArchiveEntry | undefined {
  const key = normalizeItemKey(itemName);
  return archive
    .filter((a) => a.itemKey === key && (storeId ? a.storeId === storeId : true))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

export function getLastPriceInfo(
  archive: ArchiveEntry[],
  itemName: string,
  activeStoreId?: string,
): LastPriceInfo | null {
  const key = normalizeItemKey(itemName);
  const all = archive
    .filter((a) => a.itemKey === key)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  if (!all.length) return null;

  const last = all[0];
  const lowest = [...all].sort((a, b) => a.unitPrice - b.unitPrice)[0];
  const active = activeStoreId
    ? all.find((a) => a.storeId === activeStoreId)
    : undefined;

  return {
    unitPrice: last.unitPrice,
    storeId: last.storeId,
    storeName: last.storeName,
    recordedAt: last.recordedAt,
    isLowest: last.id === lowest.id,
    lowestPrice: lowest.unitPrice,
    lowestStoreName: lowest.storeName,
    lowestRecordedAt: lowest.recordedAt,
    activeStorePrice: active?.unitPrice,
    activeStoreName: active?.storeName,
    activeStoreRecordedAt: active?.recordedAt,
  };
}

/** Super cijena: najniža u 90 dana ili ≥8% ispod prosjeka. */
export function isSuperPrice(
  archive: ArchiveEntry[],
  itemName: string,
  currentUnitPrice?: number,
): boolean {
  const key = normalizeItemKey(itemName);
  const since = Date.now() - 90 * 86400000;
  const recent = archive.filter(
    (a) => a.itemKey === key && new Date(a.recordedAt).getTime() >= since,
  );
  if (recent.length < 2) return false;
  const price = currentUnitPrice ?? recent.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]?.unitPrice;
  if (price == null) return false;
  const min = Math.min(...recent.map((r) => r.unitPrice));
  const avg = recent.reduce((s, r) => s + r.unitPrice, 0) / recent.length;
  return price <= min + 0.001 || price <= avg * 0.92;
}

export function priceDeltaVsLast(
  archive: ArchiveEntry[],
  itemName: string,
  storeId: string,
  newUnitPrice: number,
): number | null {
  const previous = archive
    .filter((a) => a.itemKey === normalizeItemKey(itemName) && a.storeId === storeId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  if (!previous) return null;
  return Math.round((newUnitPrice - previous.unitPrice) * 100) / 100;
}

export function estimateItemLine(
  item: ListItem,
  storeId: string | undefined,
  archive: ArchiveEntry[],
): number {
  if (item.checked && item.lineTotal != null) return item.lineTotal;
  if (item.checked && item.unitPrice != null) return item.unitPrice * item.quantity;
  const entry = storeId
    ? latestArchivePrice(archive, item.name, storeId)
    : latestArchivePrice(archive, item.name);
  if (!entry) return 0;
  return entry.unitPrice * item.quantity;
}

export function estimateStoreTotal(
  items: ListItem[],
  storeId: string,
  archive: ArchiveEntry[],
): Pick<StoreEstimate, 'total' | 'pricedCount' | 'missingCount' | 'missingItemIds'> {
  let total = 0;
  let pricedCount = 0;
  const missingItemIds: string[] = [];

  for (const item of items) {
    const entry = latestArchivePrice(archive, item.name, storeId);
    if (!entry) {
      missingItemIds.push(item.id);
      continue;
    }
    total += entry.unitPrice * item.quantity;
    pricedCount += 1;
  }

  return {
    total,
    pricedCount,
    missingCount: missingItemIds.length,
    missingItemIds,
  };
}

export function buildStoreEstimates(
  stores: Store[],
  storeIds: string[],
  items: ListItem[],
  archive: ArchiveEntry[],
  userLocation?: GeoPoint | null,
): StoreEstimate[] {
  const selected = storeIds.length
    ? stores.filter((s) => storeIds.includes(s.id))
    : stores.filter((s) => s.isFavorite).slice(0, 3);

  const rows = selected.map((store) => {
    const est = estimateStoreTotal(items, store.id, archive);
    const distanceKm = userLocation
      ? haversineKm(userLocation, store.location)
      : undefined;
    return { storeId: store.id, ...est, distanceKm };
  });

  const withPrices = rows.filter((r) => r.pricedCount > 0);
  const minTotal = Math.min(...withPrices.map((r) => r.total), Infinity);
  const minDist = Math.min(...rows.map((r) => r.distanceKm ?? Infinity));
  const maxPrice = Math.max(...withPrices.map((r) => r.total), 1);
  const maxDist = Math.max(...rows.map((r) => r.distanceKm ?? 0), 1);

  return rows
    .map((r) => {
      const priceNorm = r.pricedCount > 0 ? r.total / maxPrice : 1;
      const distNorm = r.distanceKm != null ? r.distanceKm / maxDist : 0.5;
      const score = priceNorm * 0.7 + distNorm * 0.3;
      return {
        ...r,
        score,
        isCheapest: r.pricedCount > 0 && r.total === minTotal,
        isClosest: r.distanceKm != null && r.distanceKm === minDist,
        isBestChoice: false,
      };
    })
    .sort((a, b) => a.score - b.score)
    .map((r, i) => ({ ...r, isBestChoice: i === 0 }));
}

export function cartTotals(items: ListItem[]) {
  const inCart = items.filter((i) => i.checked && i.unitPrice != null);
  const cartTotal = inCart.reduce(
    (s, i) => s + (i.lineTotal ?? (i.unitPrice ?? 0) * i.quantity),
    0,
  );
  return {
    cartTotal,
    inCartCount: inCart.length,
    remainingCount: items.filter((i) => !i.checked).length,
    totalCount: items.length,
  };
}

export function computeCirka(
  items: ListItem[],
  activeStoreId: string | undefined,
  archive: ArchiveEntry[],
  budgetAmount: number,
  monthSpend: number,
): CirkaSummary {
  const cart = cartTotals(items);
  let remainingEstimate = 0;
  for (const item of items.filter((i) => !i.checked)) {
    remainingEstimate += estimateItemLine(item, activeStoreId, archive);
  }
  const estimatedFull = cart.cartTotal + remainingEstimate;
  const budgetRemaining = budgetAmount - monthSpend;
  const budgetPct = budgetAmount > 0 ? (monthSpend / budgetAmount) * 100 : 0;

  return {
    cartTotal: cart.cartTotal,
    estimatedFull,
    remainingEstimate,
    inCartCount: cart.inCartCount,
    totalCount: cart.totalCount,
    budgetRemaining,
    budgetAmount,
    budgetPct,
  };
}

export function itemStats(archive: ArchiveEntry[], itemKey: string) {
  const rows = archive.filter((a) => a.itemKey === itemKey);
  if (!rows.length) return null;
  const prices = rows.map((r) => r.unitPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  return { min, max, avg, count: rows.length };
}
