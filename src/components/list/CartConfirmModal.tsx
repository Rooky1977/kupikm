import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatDateTime, formatKm } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

export function CartConfirmModal() {
  const pending = useAppStore((s) => s.pendingPrice);
  const items = useAppStore((s) => s.list.items);
  const openPriceEntry = useAppStore((s) => s.openPriceEntry);
  const confirmToCart = useAppStore((s) => s.confirmToCart);
  const getLastPrice = useAppStore((s) => s.getLastPrice);
  const activeStoreId = useAppStore((s) => s.list.activeStoreId);
  const stores = useAppStore((s) => s.stores);

  const item = items.find((i) => i.id === pending?.itemId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  const last = item ? getLastPrice(item.name) : null;
  const activeStore = stores.find((s) => s.id === activeStoreId);

  useEffect(() => {
    if (!item) return;
    setQty(String(item.quantity));
    setPrice(last ? String(last.unitPrice) : '');
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [item, last?.unitPrice]);

  if (!item) return null;

  const unitPrice = Number(price.replace(',', '.'));
  const quantity = Number(qty.replace(',', '.'));
  const line =
    !Number.isNaN(unitPrice) && !Number.isNaN(quantity) ? unitPrice * quantity : 0;
  const vsLast =
    last && !Number.isNaN(unitPrice) ? unitPrice - last.unitPrice : null;

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
          U korpu
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {item.name} · {activeStore?.name ?? 'Odaberi radnju'}
        </p>

        {last && (
          <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', boxShadow: 'none' }}>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
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
                placeholder="npr. 2.19"
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
            {vsLast != null && (
              <div
                style={{
                  fontWeight: 800,
                  color: vsLast > 0.01 ? 'var(--danger)' : vsLast < -0.01 ? 'var(--success)' : undefined,
                }}
              >
                {vsLast > 0.01
                  ? `↑ +${formatKm(vsLast)}`
                  : vsLast < -0.01
                    ? `↓ ${formatKm(vsLast)}`
                    : 'Isto kao zadnji put'}
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'stretch' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => openPriceEntry(null)}>
              Otkaži
            </button>
            <button type="submit" className="btn btn-action" style={{ flex: 1.4 }}>
              Potvrdi / U korpu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
