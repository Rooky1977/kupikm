import type {
  ArchiveEntry,
  PriceSanityResult,
  ShrinkflationResult,
  Unit,
} from '../types';
import { normalizeItemKey } from './format';
import { itemStats } from './scoring';

/** Pretvori količinu u baznu jedinicu (kg ili L) gdje je moguće. */
export function toBaseQuantity(quantity: number, unit: Unit): number | null {
  if (unit === 'kg' || unit === 'l') return quantity;
  if (unit === 'g' || unit === 'ml') return quantity / 1000;
  return null;
}

/** Cijena po 1 kg / 1 L. */
export function normalizedUnitPrice(
  unitPrice: number,
  quantity: number,
  unit: Unit,
): number | null {
  const base = toBaseQuantity(quantity, unit);
  if (base == null || base <= 0) return null;
  // unitPrice je cijena po jedinici unosa (npr. po kg, ili po pakovanju)
  // Za kg/l: unitPrice je već po kg/L
  if (unit === 'kg' || unit === 'l') return unitPrice;
  // Za g/ml: unitPrice je po gramu/ml → ×1000 = po kg/L
  if (unit === 'g' || unit === 'ml') return unitPrice * 1000;
  return null;
}

/** Line total iz rinfuze: težina + cijena po kg/L. */
export function scaleLineTotal(
  amount: number,
  amountUnit: 'g' | 'kg' | 'ml' | 'l',
  pricePerBase: number,
): { quantity: number; unit: Unit; unitPrice: number; lineTotal: number } {
  const isWeight = amountUnit === 'g' || amountUnit === 'kg';
  const baseQty =
    amountUnit === 'g' || amountUnit === 'ml' ? amount / 1000 : amount;
  const lineTotal = Math.round(baseQty * pricePerBase * 100) / 100;
  return {
    quantity: Math.round(baseQty * 1000) / 1000,
    unit: isWeight ? 'kg' : 'l',
    unitPrice: pricePerBase,
    lineTotal,
  };
}

export function checkPriceSanity(
  archive: ArchiveEntry[],
  itemName: string,
  newUnitPrice: number,
): PriceSanityResult {
  const key = normalizeItemKey(itemName);
  const stats = itemStats(archive, key);
  const recent = archive
    .filter((a) => a.itemKey === key)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const last = recent[0]?.unitPrice;
  const refCandidates = [last, stats?.avg].filter(
    (n): n is number => typeof n === 'number' && n > 0,
  );
  if (!refCandidates.length || newUnitPrice <= 0) {
    return { ok: true, ratio: 1, reference: newUnitPrice };
  }
  const reference = refCandidates[0]!;
  const ratio = newUnitPrice / reference;
  if (ratio > 2.5 || ratio < 1 / 2.5) {
    return {
      ok: false,
      ratio,
      reference,
      message:
        ratio > 2.5
          ? `Cijena je ${ratio.toFixed(1)}× veća od uobičajene (${reference.toFixed(2)} KM). Provjeri unos.`
          : `Cijena je ${(1 / ratio).toFixed(1)}× manja od uobičajene (${reference.toFixed(2)} KM). Provjeri unos.`,
    };
  }
  return { ok: true, ratio, reference };
}

export function checkShrinkflation(
  archive: ArchiveEntry[],
  itemName: string,
  currentPackSize: number | undefined,
  currentNormalized: number | null,
): ShrinkflationResult {
  if (currentPackSize == null || currentPackSize <= 0) {
    return { detected: false };
  }
  const key = normalizeItemKey(itemName);
  const previous = archive
    .filter((a) => a.itemKey === key && a.packSize != null && a.packSize > 0)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  if (!previous?.packSize) return { detected: false };

  if (currentPackSize < previous.packSize * 0.95) {
    const normNote =
      currentNormalized != null && previous.normalizedUnitPrice != null
        ? ` Jedinična cijena sada ${currentNormalized.toFixed(2)} KM/kg(L) (prije ${previous.normalizedUnitPrice.toFixed(2)}).`
        : '';
    return {
      detected: true,
      previousPackSize: previous.packSize,
      currentPackSize,
      message: `Pakovanje se smanjilo (${previous.packSize} → ${currentPackSize}). Moguća skrivena inflacija.${normNote}`,
    };
  }
  return {
    detected: false,
    previousPackSize: previous.packSize,
    currentPackSize,
  };
}
