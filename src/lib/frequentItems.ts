import type { ArchiveEntry, Category, Unit } from '../types';
import { normalizeItemKey } from './format';

export interface FrequentItem {
  name: string;
  itemKey: string;
  category: Category;
  unit: Unit;
  count: number;
  lastPrice: number;
}

/** Najčešće kupovani artikli iz arhive (zadnjih 180 dana). */
export function getFrequentItems(archive: ArchiveEntry[], limit = 8): FrequentItem[] {
  const since = Date.now() - 180 * 86400000;
  const map = new Map<
    string,
    { name: string; category: Category; unit: Unit; count: number; lastAt: string; lastPrice: number }
  >();

  for (const a of archive) {
    if (new Date(a.recordedAt).getTime() < since) continue;
    const existing = map.get(a.itemKey);
    if (!existing) {
      map.set(a.itemKey, {
        name: a.itemName,
        category: a.category,
        unit: a.unit,
        count: 1,
        lastAt: a.recordedAt,
        lastPrice: a.unitPrice,
      });
    } else {
      existing.count += 1;
      if (a.recordedAt > existing.lastAt) {
        existing.lastAt = a.recordedAt;
        existing.lastPrice = a.unitPrice;
        existing.name = a.itemName;
        existing.category = a.category;
        existing.unit = a.unit;
      }
    }
  }

  return [...map.entries()]
    .map(([itemKey, v]) => ({
      itemKey,
      name: v.name,
      category: v.category,
      unit: v.unit,
      count: v.count,
      lastPrice: v.lastPrice,
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastPrice - a.lastPrice)
    .slice(0, limit);
}

export function parseVoiceItems(transcript: string): string[] {
  return transcript
    .split(/,|\bi\b|\n|;|\./gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .map((s) => s.replace(/^(dodaj|kupi|uzmi)\s+/i, '').trim())
    .filter(Boolean)
    .filter((s, i, arr) => normalizeItemKey(s) !== normalizeItemKey(arr[i - 1] ?? ''));
}
