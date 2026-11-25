import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { formatDateTime, formatKm, normalizeItemKey } from '../../lib/format';
import {
  checkPriceSanity,
  checkShrinkflation,
  normalizedUnitPrice,
  scaleLineTotal,
} from '../../lib/priceChecks';
import { useAppStore } from '../../store/useAppStore';
import type { Unit } from '../../types';
import { PriceDeltaBadge } from './PriceDeltaBadge';

export function CartConfirmModal() {
  const pendingId = useAppStore((s) => s.pendingPriceItemId);
  const items = useAppStore((s) => s.list.items);
  const archive = useAppStore((s) => s.archive);
  const openPriceEntry = useAppStore((s) => s.openPriceEntry);
  const confirmToCart = useAppStore((s) => s.confirmToCart);
  const getLastPrice = useAppStore((s) => s.getLastPrice);
  const getArchiveForItem = useAppStore((s) => s.getArchiveForItem);
  const activeStoreId = useAppStore((s) => s.list.activeStoreId);
  const stores = useAppStore((s) => s.stores);

  const item = items.find((i) => i.id === pendingId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isPromo, setIsPromo] = useState(false);
  const [isExtraordinary, setIsExtraordinary] = useState(false);
  const [scaleMode, setScaleMode] = useState(false);
  const [scaleAmount, setScaleAmount] = useState('');
  const [scaleUnit, setScaleUnit] = useState<'g' | 'kg' | 'ml' | 'l'>('g');
  const [pricePerBase, setPricePerBase] = useState('');
  const [packSize, setPackSize] = useState('');
  const [forceOk, setForceOk] = useState(false);

  const last = item ? getLastPrice(item.name) : null;
  const activeStore = stores.find((s) => s.id === activeStoreId);
  const otherPrices = item
    ? getArchiveForItem(normalizeItemKey(item.name)).slice(0, 4)
    : [];

  useEffect(() => {
    if (!item) return;
    setQty(String(item.quantity));
    setPrice(last ? String(last.unitPrice) : '');
    setIsPromo(false);
    setIsExtraordinary(false);
    setScaleMode(false);
    setForceOk(false);
    setPackSize('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [item, last?.unitPrice]);

  const computed = useMemo(() => {
    if (scaleMode) {
      const amount = Number(scaleAmount.replace(',', '.'));
      const per = Number(pricePerBase.replace(',', '.'));
      if (Number.isNaN(amount) || amount <= 0 || Number.isNaN(per) || per < 0) {
        return null;
      }
      return scaleLineTotal(amount, scaleUnit, per);
    }
    const unitPrice = Number(price.replace(',', '.'));
    const quantity = Number(qty.replace(',', '.'));
    if (Number.isNaN(unitPrice) || unitPrice < 0 || Number.isNaN(quantity) || quantity <= 0) {
      return null;
    }
    return {
      quantity,
      unit: (item?.unit ?? 'kom') as Unit,
      unitPrice,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
    };
  }, [scaleMode, scaleAmount, scaleUnit, pricePerBase, price, qty, item?.unit]);

  const sanity = useMemo(() => {
    if (!item || !computed) return null;
    return checkPriceSanity(archive, item.name, computed.unitPrice);
  }, [item, computed, archive]);

  const norm = computed
    ? normalizedUnitPrice(computed.unitPrice, computed.quantity, computed.unit)
    : null;

  const pack = Number(packSize.replace(',', '.'));
  const shrink = useMemo(() => {
    if (!item) return null;
    return checkShrinkflation(
      archive,
      item.name,
      Number.isNaN(pack) || pack <= 0 ? undefined : pack,
      norm,
    );
  }, [item, archive, pack, norm]);

  if (!item) return null;

  const vsLast =
    last && computed
      ? Math.round((computed.unitPrice - last.unitPrice) * 100) / 100
      : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!computed) return;
    if (sanity && !sanity.ok && !forceOk) return;
    void confirmToCart(item.id, computed.unitPrice, computed.quantity, {
      isPromo,
      isExtraordinary,
      packSize: !Number.isNaN(pack) && pack > 0 ? pack : undefined,
      unit: computed.unit,
    });
  };

  return (
    <div className="modal-backdrop" onClick={() => openPriceEntry(null)} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cart-confirm-title" style={{ marginTop: 0, marginBottom: '0.25rem' }}>
          Unos cijene
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {item.name} · {activeStore?.name ?? 'Odaberi radnju'}
        </p>

        {last && (
          <div className="card" style={{ padding: '0.75rem', boxShadow: 'none' }}>
            <div style={{ fontSize: '0.9rem' }}>
              Zadnji put: <strong>{formatKm(last.unitPrice)}</strong> u {last.storeName}
            </div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>
              {formatDateTime(last.recordedAt)}
            </div>
            {last.activeStorePrice != null && (
              <div style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
                U aktivnoj radnji: <strong>{formatKm(last.activeStorePrice)}</strong>
                {last.activeStoreName ? ` (${last.activeStoreName})` : ''}
              </div>
            )}
            {last.lowestPrice != null && (
              <div style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>
                Najbolja cijena ikad:{' '}
                <strong className="badge badge-best" style={{ display: 'inline' }}>
                  {formatKm(last.lowestPrice)}
                </strong>{' '}
                u {last.lowestStoreName}
                {last.lowestRecordedAt ? ` · ${formatDateTime(last.lowestRecordedAt)}` : ''}
              </div>
            )}
          </div>
        )}

        {otherPrices.length > 1 && (
          <div className="chip-row" style={{ margin: '0.5rem 0' }}>
            {otherPrices.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                onClick={() => setPrice(String(p.unitPrice))}
              >
                {p.storeName}
                <small>{formatKm(p.unitPrice)}</small>
              </button>
            ))}
          </div>
        )}

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={scaleMode}
              onChange={(e) => setScaleMode(e.target.checked)}
            />
            <span>Kalkulator vage / rinfuze</span>
          </label>

          {scaleMode ? (
            <div className="form-row-2">
              <label className="label">
                Gramaža / zapremina
                <div className="row">
                  <input
                    className="input"
                    inputMode="decimal"
                    value={scaleAmount}
                    onChange={(e) => setScaleAmount(e.target.value)}
                    placeholder="npr. 350"
                    required
                  />
                  <select
                    className="select"
                    style={{ maxWidth: 80 }}
                    value={scaleUnit}
                    onChange={(e) => setScaleUnit(e.target.value as typeof scaleUnit)}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                  </select>
                </div>
              </label>
              <label className="label">
                Cijena po {scaleUnit === 'g' || scaleUnit === 'kg' ? 'kg' : 'L'} (KM)
                <input
                  className="input"
                  inputMode="decimal"
                  value={pricePerBase}
                  onChange={(e) => setPricePerBase(e.target.value)}
                  placeholder="npr. 12.90"
                  required
                />
              </label>
            </div>
          ) : (
            <div className="form-row-2">
              <label className="label">
                Cijena po jedinici (KM)
                <input
                  ref={inputRef}
                  className="input"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setForceOk(false);
                  }}
                  placeholder="npr. 3.89"
                  required
                />
              </label>
              <label className="label">
                Količina / težina ({item.unit})
                <input
                  className="input"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <label className="label">
            Veličina pakovanja (kg/L, opciono — za skrivenu inflaciju)
            <input
              className="input"
              inputMode="decimal"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              placeholder="npr. 0.9"
            />
          </label>

          {norm != null && (
            <div className="muted" style={{ fontSize: '0.88rem' }}>
              Jedinična cijena: <strong>{formatKm(norm)}</strong> /{' '}
              {computed?.unit === 'l' || computed?.unit === 'ml' ? '1 L' : '1 kg'}
            </div>
          )}

          {sanity && !sanity.ok && (
            <div className="alert-warn">
              <strong>Provjeri cijenu.</strong> {sanity.message}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ marginTop: '0.35rem' }}
                onClick={() => setForceOk(true)}
              >
                Ipak sačuvaj ovu cijenu
              </button>
            </div>
          )}

          {shrink?.detected && (
            <div className="alert-warn">
              <strong>Smanjeno pakovanje.</strong> {shrink.message}
            </div>
          )}

          <label className="switch-row">
            <input
              type="checkbox"
              checked={isPromo}
              onChange={(e) => setIsPromo(e.target.checked)}
            />
            <span>
              Akcijska cijena <span className="badge badge-action">Akcija</span>
            </span>
          </label>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={isExtraordinary}
              onChange={(e) => setIsExtraordinary(e.target.checked)}
            />
            <span>Vanredni trošak (ne ulazi u mjesečni budžet)</span>
          </label>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Redni iznos
              </div>
              <div className="price-big">{formatKm(computed?.lineTotal ?? 0)}</div>
            </div>
            <PriceDeltaBadge delta={vsLast} />
          </div>

          <div className="row">
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => openPriceEntry(null)}>
              Otkaži
            </button>
            <button
              type="submit"
              className="btn btn-action"
              style={{ flex: 1.5 }}
              disabled={!computed || (Boolean(sanity && !sanity.ok) && !forceOk)}
            >
              Potvrdi / U korpu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
