import type {
  ArchiveEntry,
  ListItem,
  ReceiptItem,
  TripVarianceSummary,
} from '../types';
import { monthKey, normalizeItemKey } from './format';
import { latestArchivePrice } from './scoring';

export function analyzeCartVsEstimate(
  bought: ListItem[],
  archive: ArchiveEntry[],
  storeId?: string,
): TripVarianceSummary {
  const lines = bought.map((item) => {
    const prior = archive.filter(
      (a) =>
        a.itemKey === normalizeItemKey(item.name) &&
        // exclude the just-added cart entries from this trip if same second — use older
        !(item.unitPrice != null && Math.abs(a.unitPrice - item.unitPrice) < 0.001 && a.source === 'cart'),
    );
    const estEntry =
      (storeId ? latestArchivePrice(prior, item.name, storeId) : undefined) ??
      latestArchivePrice(prior, item.name);
    const estimated = estEntry ? estEntry.unitPrice * item.quantity : item.lineTotal ?? 0;
    const actual = item.lineTotal ?? (item.unitPrice ?? 0) * item.quantity;
    return {
      name: item.name,
      estimated: Math.round(estimated * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      delta: Math.round((actual - estimated) * 100) / 100,
    };
  });

  const estimatedTotal = Math.round(lines.reduce((s, l) => s + l.estimated, 0) * 100) / 100;
  const actualTotal = Math.round(lines.reduce((s, l) => s + l.actual, 0) * 100) / 100;
  const topDrivers = [...lines]
    .filter((l) => Math.abs(l.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return {
    estimatedTotal,
    actualTotal,
    delta: Math.round((actualTotal - estimatedTotal) * 100) / 100,
    topDrivers,
  };
}

export function analyzeReceiptVsEstimate(
  items: ReceiptItem[],
  archive: ArchiveEntry[],
  storeId: string,
  total: number,
): TripVarianceSummary {
  const lines = items.map((item) => {
    const estEntry =
      latestArchivePrice(archive, item.name, storeId) ??
      latestArchivePrice(archive, item.name);
    const estimated = estEntry ? estEntry.unitPrice * item.quantity : item.lineTotal;
    return {
      name: item.name,
      estimated: Math.round(estimated * 100) / 100,
      actual: item.lineTotal,
      delta: Math.round((item.lineTotal - estimated) * 100) / 100,
    };
  });
  const estimatedTotal = Math.round(lines.reduce((s, l) => s + l.estimated, 0) * 100) / 100;
  return {
    estimatedTotal,
    actualTotal: total,
    delta: Math.round((total - estimatedTotal) * 100) / 100,
    topDrivers: [...lines]
      .filter((l) => Math.abs(l.delta) >= 0.05)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3),
  };
}

export function topSpendItems(
  archive: ArchiveEntry[],
  limit = 5,
  key = monthKey(),
): Array<{ name: string; total: number; count: number }> {
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const a of archive) {
    if (!a.recordedAt.startsWith(key)) continue;
    if (a.isExtraordinary) continue;
    if (a.source !== 'cart' && a.source !== 'receipt') continue;
    const cur = map.get(a.itemKey);
    if (!cur) {
      map.set(a.itemKey, { name: a.itemName, total: a.lineTotal, count: 1 });
    } else {
      cur.total += a.lineTotal;
      cur.count += 1;
      cur.name = a.itemName;
    }
  }
  return [...map.values()]
    .map((v) => ({ ...v, total: Math.round(v.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
