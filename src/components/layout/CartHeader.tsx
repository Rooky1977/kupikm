import { formatKm, normalizeItemKey } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

export function CartHeader() {
  const getCart = useAppStore((s) => s.getCart);
  const list = useAppStore((s) => s.list);
  const stores = useAppStore((s) => s.stores);
  const archive = useAppStore((s) => s.archive);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const cart = getCart();
  const active = stores.find((s) => s.id === list.activeStoreId);

  const deltas = list.items
    .filter((i) => i.checked && i.unitPrice != null)
    .map((i) => {
      const key = normalizeItemKey(i.name);
      const prev = archive
        .filter((a) => a.itemKey === key && a.storeId === list.activeStoreId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[1];
      if (!prev || i.unitPrice == null) return 0;
      return (i.unitPrice - prev.unitPrice) * i.quantity;
    });
  const deltaSum = deltas.reduce((a, b) => a + b, 0);

  return (
    <div className="cart-header" aria-live="polite">
      <div>
        <div className="label">Ukupan iznos korpe</div>
        <strong>{formatKm(cart.cartTotal)}</strong>
      </div>
      <div>
        <div className="label">U korpi · {active?.brand ?? 'Radnja'}</div>
        <strong>
          {cart.inCartCount}/{cart.totalCount}
        </strong>
      </div>
      <div className="desktop-only-slot">
        <div className="label">
          {syncStatus === 'live'
            ? 'Uživo sync'
            : syncStatus === 'local'
              ? 'Lokalni režim'
              : 'Sinhronizacija…'}
        </div>
        <strong
          className={
            deltaSum > 0.01 ? 'cart-delta up' : deltaSum < -0.01 ? 'cart-delta down' : undefined
          }
          style={{ fontSize: '1.05rem' }}
        >
          {deltaSum > 0.01
            ? `↑ +${formatKm(deltaSum)}`
            : deltaSum < -0.01
              ? `↓ ${formatKm(deltaSum)}`
              : 'Stabilne cijene'}
        </strong>
      </div>
    </div>
  );
}
