import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatDateTime, formatKm, normalizeItemKey } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import { PriceDeltaBadge } from './PriceDeltaBadge';

export function CartConfirmModal() {
  const pendingId = useAppStore((s) => s.pendingPriceItemId);
  const items = useAppStore((s) => s.list.items);
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

  const last = item ? getLastPrice(item.name) : null;
  const activeStore = stores.find((s) => s.id === activeStoreId);
  const otherPrices = item
    ? getArchiveForItem(normalizeItemKey(item.name)).slice(0, 4)
    : [];

  useEffect(() => {
    if (!item) return;
    setQty(String(item.quantity));
    setPrice(last ? String(last.unitPrice) : '');
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [item, last?.unitPrice]);

  if (!item) return null;

  const unitPrice = Number(price.replace(',', '.'));
  const quantity = Number(qty.replace(',', '.'));
  const line =
    !Number.isNaN(unitPrice) && !Number.isNaN(quantity) ? unitPrice * quantity : 0;
  const vsLast =
    last && !Number.isNaN(unitPrice)
      ? Math.round((unitPrice - last.unitPrice) * 100) / 100
      : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(unitPrice) || unitPrice < 0 || Number.isNaN(quantity) || quantity <= 0) return;
    void confirmToCart(item.id, unitPrice, quantity);
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
              {last.lowestPrice != null && (
                <>
                  {' '}
                  · najniže {formatKm(last.lowestPrice)} ({last.lowestStoreName})
                </>
              )}
            </div>
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
          <div className="form-row-2">
            <label className="label">
              Cijena po jedinici (KM)
              <input
                ref={inputRef}
                className="input"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Redni iznos
              </div>
              <div className="price-big">{formatKm(line || 0)}</div>
            </div>
            <PriceDeltaBadge delta={vsLast} />
          </div>

          <div className="row">
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => openPriceEntry(null)}>
              Otkaži
            </button>
            <button type="submit" className="btn btn-action" style={{ flex: 1.5 }}>
              Potvrdi / U korpu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
