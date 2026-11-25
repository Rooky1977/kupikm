import type { ArchiveEntry, ListItem, SplitCartSuggestion, Store } from '../types';
import { latestArchivePrice } from './scoring';

/** Optimalna kombinacija 2 radnje za najveću uštedu. */
export function computeSplitCart(
  items: ListItem[],
  stores: Store[],
  storeIds: string[],
  archive: ArchiveEntry[],
): SplitCartSuggestion | null {
  const ids = storeIds.slice(0, 5);
  if (ids.length < 2 || !items.length) return null;

  const priced = items
    .map((item) => {
      const options = ids
        .map((storeId) => {
          const entry = latestArchivePrice(archive, item.name, storeId);
          if (!entry) return null;
          return { storeId, line: entry.unitPrice * item.quantity };
        })
        .filter(Boolean) as Array<{ storeId: string; line: number }>;
      return { item, options };
    })
    .filter((r) => r.options.length > 0);

  if (!priced.length) return null;

  let best: SplitCartSuggestion | null = null;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const storeAItems: SplitCartSuggestion['storeAItems'] = [];
      const storeBItems: SplitCartSuggestion['storeBItems'] = [];
      let combined = 0;
      let covered = 0;

      for (const row of priced) {
        const optA = row.options.find((o) => o.storeId === a);
        const optB = row.options.find((o) => o.storeId === b);
        if (!optA && !optB) continue;
        covered += 1;
        if (optA && (!optB || optA.line <= optB.line)) {
          storeAItems.push({ itemId: row.item.id, name: row.item.name, line: optA.line });
          combined += optA.line;
        } else if (optB) {
          storeBItems.push({ itemId: row.item.id, name: row.item.name, line: optB.line });
          combined += optB.line;
        }
      }

      if (covered < 2) continue;

      const singleTotals = [a, b].map((sid) =>
        priced.reduce((sum, row) => {
          const o = row.options.find((x) => x.storeId === sid);
          return sum + (o?.line ?? Infinity);
        }, 0),
      );
      const bestSingleTotal = Math.min(...singleTotals.filter((n) => Number.isFinite(n)));
      if (!Number.isFinite(bestSingleTotal)) continue;

      const savings = Math.round((bestSingleTotal - combined) * 100) / 100;
      if (savings <= 0.05) continue;

      const storeA = stores.find((s) => s.id === a);
      const storeB = stores.find((s) => s.id === b);
      const suggestion: SplitCartSuggestion = {
        storeAId: a,
        storeBId: b,
        storeAName: storeA?.name ?? a,
        storeBName: storeB?.name ?? b,
        storeAItems,
        storeBItems,
        combinedTotal: Math.round(combined * 100) / 100,
        bestSingleTotal: Math.round(bestSingleTotal * 100) / 100,
        savings,
      };

      if (!best || suggestion.savings > best.savings) best = suggestion;
    }
  }

  return best;
}
