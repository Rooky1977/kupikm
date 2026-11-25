import type { PantryItem } from '../types';
import { normalizeItemKey } from './format';

export type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'none';

export function getExpiryStatus(expiresAt?: string, soonDays = 7): ExpiryStatus {
  if (!expiresAt) return 'none';
  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = (end.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return 'expired';
  if (diff <= soonDays) return 'soon';
  return 'ok';
}

export function findPantryMatch(
  pantry: PantryItem[],
  itemName: string,
): PantryItem | undefined {
  const key = normalizeItemKey(itemName);
  return pantry.find((p) => p.itemKey === key && p.quantity > 0);
}

export function pantryWarningText(item: PantryItem): string {
  const status = getExpiryStatus(item.expiresAt);
  const base = `U špajzu: ${item.quantity} ${item.unit}`;
  if (status === 'expired') return `${base} · rok ISTEKAO`;
  if (status === 'soon' && item.expiresAt) {
    return `${base} · rok uskoro (${new Date(item.expiresAt).toLocaleDateString('bs-BA')})`;
  }
  if (item.expiresAt) {
    return `${base} · rok do ${new Date(item.expiresAt).toLocaleDateString('bs-BA')}`;
  }
  return base;
}
