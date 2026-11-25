import type {
  ArchiveEntry,
  LastPriceInfo,
  ListItem,
  Store,
  StoreEstimate,
} from '../types';
import { normalizeItemKey } from './format';

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
): LastPriceInfo | null {
  const key = normalizeItemKey(itemName);
  const all = archive
    .filter((a) => a.itemKey === key)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  if (!all.length) return null;

  const last = all[0];
  const lowest = [...all].sort((a, b) => a.unitPrice - b.unitPrice)[0];

  return {
    unitPrice: last.unitPrice,
    storeId: last.storeId,
    storeName: last.storeName,
    recordedAt: last.recordedAt,
    isLowest: last.id === lowest.id,
    lowestPrice: lowest.unitPrice,
    lowestStoreName: lowest.storeName,
  };
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
): StoreEstimate[] {
  const selected = storeIds.length
    ? stores.filter((s) => storeIds.includes(s.id))
    : stores.slice(0, 5);

  const rows = selected.map((store) => ({
    storeId: store.id,
    ...estimateStoreTotal(items, store.id, archive),
    distanceKm: undefined as number | undefined,
    isCheapest: false,
  }));

  const withPrices = rows.filter((r) => r.pricedCount > 0);
  const minTotal = Math.min(...withPrices.map((r) => r.total), Infinity);

  return rows
    .map((r) => ({
      ...r,
      isCheapest: r.pricedCount > 0 && r.total === minTotal,
    }))
    .sort((a, b) => {
      if (a.pricedCount === 0) return 1;
      if (b.pricedCount === 0) return -1;
      return a.total - b.total;
    });
}

export function cartTotals(items: ListItem[]) {
  const inCart = items.filter((i) => i.checked && i.unitPrice != null);
  const remaining = items.filter((i) => !i.checked);
  const cartTotal = inCart.reduce((s, i) => s + (i.lineTotal ?? (i.unitPrice ?? 0) * i.quantity), 0);
  return {
    cartTotal,
    inCartCount: inCart.length,
    remainingCount: remaining.length,
    totalCount: items.length,
  };
}

export function priceDeltaVsLast(
  archive: ArchiveEntry[],
  itemName: string,
  storeId: string,
  newUnitPrice: number,
): number | null {
  const previous = archive
    .filter(
      (a) =>
        a.itemKey === normalizeItemKey(itemName) &&
        a.storeId === storeId,
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  if (!previous) return null;
  return newUnitPrice - previous.unitPrice;
}
