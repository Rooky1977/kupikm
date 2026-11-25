import { flattenCatalogVariants } from '../data/catalog';
import { CATEGORY_LABELS, type Category, type RememberedItem, type Unit } from '../types';
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
  limit = 12,
): Suggestion[] {
  const q = normalizeItemKey(query);
  if (q.length < 1) return [];

  const catalogHits = flattenCatalogVariants()
    .map((v) => {
      const categoryLabel = CATEGORY_LABELS[v.category] ?? '';
      const hay = normalizeItemKey([v.label, v.productName, categoryLabel, ...v.keywords].join(' '));
      const score =
        (normalizeItemKey(v.label).startsWith(q) ? 40 : 0) +
        (hay.startsWith(q) ? 25 : 0) +
        (hay.includes(q) ? 18 : 0) +
        (v.keywords.some((k) => normalizeItemKey(k).startsWith(q)) ? 20 : 0) +
        (normalizeItemKey(categoryLabel).includes(q) ? 12 : 0) +
        (normalizeItemKey(v.productName).includes(q) ? 10 : 0);
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
      const hay = normalizeItemKey([r.name, CATEGORY_LABELS[r.category] ?? '', ...r.keywords].join(' '));
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
