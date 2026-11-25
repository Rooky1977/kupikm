import { flattenCatalogVariants } from '../data/catalog';
import type { Category, RememberedItem, Unit } from '../types';
import { normalizeItemKey } from './format';

export interface Suggestion {
  id: string;
  label: string;
  unit: Unit;
  category: Category;
  defaultQty: number;
  source: 'catalog' | 'remembered';
}

export function searchSuggestions(
  query: string,
  remembered: RememberedItem[],
  limit = 8,
): Suggestion[] {
  const q = normalizeItemKey(query);
  if (q.length < 1) return [];

  const catalogHits = flattenCatalogVariants()
    .map((v) => {
      const hay = normalizeItemKey([v.label, ...v.keywords].join(' '));
      const score =
        (hay.startsWith(q) ? 30 : 0) +
        (hay.includes(q) ? 20 : 0) +
        (v.keywords.some((k) => normalizeItemKey(k).startsWith(q)) ? 15 : 0);
      return { v, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ v }) => ({
      id: v.id,
      label: v.label,
      unit: v.unit,
      category: v.category,
      defaultQty: v.defaultQty,
      source: 'catalog' as const,
    }));

  const rememberedHits = remembered
    .filter((r) => {
      const hay = normalizeItemKey([r.name, ...r.keywords].join(' '));
      return hay.includes(q);
    })
    .map((r) => ({
      id: r.id,
      label: r.name,
      unit: r.unit,
      category: r.category,
      defaultQty: 1,
      source: 'remembered' as const,
    }));

  const seen = new Set<string>();
  const merged: Suggestion[] = [];
  for (const s of [...rememberedHits, ...catalogHits]) {
    const key = normalizeItemKey(s.label);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
    if (merged.length >= limit) break;
  }
  return merged;
}
