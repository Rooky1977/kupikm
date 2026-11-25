import { flattenCatalogVariants } from '../data/catalog';
import type { Category, ItemAlias, Unit } from '../types';
import { normalizeItemKey } from './format';

export interface AliasMatch {
  rawName: string;
  suggestedName: string;
  catalogId?: string;
  category: Category;
  unit: Unit;
  confidence: number;
  fromAlias: boolean;
}

function tokens(s: string): string[] {
  return normalizeItemKey(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function scoreNames(raw: string, candidate: string): number {
  const a = normalizeItemKey(raw);
  const b = normalizeItemKey(candidate);
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 70;
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit += 1;
  return Math.round((hit / Math.max(ta.size, tb.length)) * 60);
}

export function resolveAlias(
  rawName: string,
  aliases: ItemAlias[],
): AliasMatch | null {
  const key = normalizeItemKey(rawName);
  const hit = aliases.find((a) => a.rawKey === key);
  if (!hit) return null;
  return {
    rawName,
    suggestedName: hit.catalogName,
    catalogId: hit.catalogId,
    category: hit.category,
    unit: hit.unit,
    confidence: 100,
    fromAlias: true,
  };
}

export function suggestCatalogMatch(
  rawName: string,
  aliases: ItemAlias[],
): AliasMatch {
  const fromAlias = resolveAlias(rawName, aliases);
  if (fromAlias) return fromAlias;

  const variants = flattenCatalogVariants();
  let best = variants[0];
  let bestScore = 0;
  for (const v of variants) {
    const s = scoreNames(rawName, v.label);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  if (best && bestScore >= 25) {
    return {
      rawName,
      suggestedName: best.label,
      catalogId: best.id,
      category: best.category,
      unit: best.unit,
      confidence: bestScore,
      fromAlias: false,
    };
  }

  return {
    rawName,
    suggestedName: rawName,
    category: 'ostalo',
    unit: 'kom',
    confidence: 0,
    fromAlias: false,
  };
}

export function topCatalogSuggestions(rawName: string, limit = 8) {
  return flattenCatalogVariants()
    .map((v) => ({ v, score: scoreNames(rawName, v.label) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ v, score }) => ({
      id: v.id,
      label: v.label,
      unit: v.unit,
      category: v.category,
      score,
    }));
}
