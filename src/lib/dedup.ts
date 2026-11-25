import { flattenCatalogVariants } from '../data/catalog';
import type {
  ArchiveEntry,
  Category,
  DedupSuggestion,
  PantryItem,
  RememberedItem,
  Unit,
} from '../types';
import { normalizeForMatch, normalizeItemKey } from './format';

function scoreMatch(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 78;
  const ta = new Set(na.split(' ').filter((t) => t.length > 1));
  const tb = nb.split(' ').filter((t) => t.length > 1);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit += 1;
  return Math.round((hit / Math.max(ta.size, tb.length)) * 70);
}

/** Predloži postojeće artikle da se izbjegnu duplikati. */
export function findDedupSuggestions(
  rawName: string,
  opts: {
    archive: ArchiveEntry[];
    remembered: RememberedItem[];
    pantry: PantryItem[];
    limit?: number;
  },
): DedupSuggestion[] {
  const limit = opts.limit ?? 5;
  const map = new Map<string, DedupSuggestion>();

  const consider = (
    name: string,
    unit: Unit,
    category: Category,
    source: DedupSuggestion['source'],
    catalogId?: string,
  ) => {
    const score = scoreMatch(rawName, name);
    if (score < 45) return;
    const key = normalizeItemKey(name);
    const prev = map.get(key);
    if (!prev || score > prev.score) {
      map.set(key, { name, unit, category, catalogId, score, source });
    }
  };

  for (const v of flattenCatalogVariants()) {
    consider(v.label, v.unit, v.category, 'katalog', v.id);
  }
  for (const r of opts.remembered) {
    consider(r.name, r.unit, r.category, 'zapamćeno');
  }
  for (const p of opts.pantry) {
    consider(p.name, p.unit, p.category, 'špajz');
  }
  const seenArch = new Set<string>();
  for (const a of opts.archive) {
    if (seenArch.has(a.itemKey)) continue;
    seenArch.add(a.itemKey);
    consider(a.itemName, a.unit, a.category, 'arhiva');
  }

  const self = normalizeForMatch(rawName);
  return [...map.values()]
    .filter((s) => normalizeForMatch(s.name) !== self || s.score < 100)
    .filter((s) => normalizeItemKey(s.name) !== normalizeItemKey(rawName) || s.score < 100)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function isLikelyDuplicate(
  rawName: string,
  existingNames: string[],
): string | null {
  const key = normalizeForMatch(rawName);
  for (const n of existingNames) {
    if (normalizeForMatch(n) === key) return n;
    if (scoreMatch(rawName, n) >= 85) return n;
  }
  return null;
}
