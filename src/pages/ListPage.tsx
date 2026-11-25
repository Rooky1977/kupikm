import { SmartAdd } from '../components/list/SmartAdd';
import { PriceDeltaBadge } from '../components/list/PriceDeltaBadge';
import { formatDistance, formatKm } from '../lib/format';
import { haversineKm } from '../lib/geolocation';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY_LABELS } from '../types';

export function ListPage() {
  const list = useAppStore((s) => s.list);
  const stores = useAppStore((s) => s.stores);
  const userLocation = useAppStore((s) => s.userLocation);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const toggleSelectedStore = useAppStore((s) => s.toggleSelectedStore);
  const onToggleCheck = useAppStore((s) => s.onToggleCheck);
  const changeQuantity = useAppStore((s) => s.changeQuantity);
  const removeListItem = useAppStore((s) => s.removeListItem);
  const finishShopping = useAppStore((s) => s.finishShopping);
  const getLastPrice = useAppStore((s) => s.getLastPrice);
  const getEstimates = useAppStore((s) => s.getEstimates);
  const addStore = useAppStore((s) => s.addStore);

  const todo = list.items.filter((i) => !i.checked);
  const cart = list.items.filter((i) => i.checked);
  const estimates = getEstimates(true);

  const nearby = [...stores]
    .map((s) => ({
      ...s,
      distanceKm: userLocation ? haversineKm(userLocation, s.location) : undefined,
    }))
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, 4);

  const onNewStore = () => {
    const name = window.prompt('Naziv nove radnje');
    if (!name?.trim()) return;
    const brand = window.prompt('Marka / lanac') ?? name;
    addStore({
      name: name.trim(),
      brand: brand.trim(),
      city: 'Sarajevo',
      address: 'Ručno dodana radnja',
      location: userLocation ?? { lat: 43.8563, lng: 18.4131 },
    });
  };

  return (
    <div className="desktop-3col">
      <section className="stack">
        <div className="page-header">
          <div>
            <h1>{list.name}</h1>
            <p>
              Kod dijeljenja: <strong>{list.shareCode}</strong>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action"
            onClick={finishShopping}
            disabled={!cart.length}
          >
            Završi kupovinu
          </button>
        </div>

        <div className="card stack">
          <label className="label">
            Aktivna prodavnica
            <select
              className="select"
              value={list.activeStoreId ?? ''}
              onChange={(e) => {
                if (e.target.value === '__new') onNewStore();
                else setActiveStore(e.target.value);
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__new">+ Nova radnja</option>
            </select>
          </label>
          <div>
            <div className="label" style={{ marginBottom: '0.4rem' }}>
              Poređenje (do 3 radnje)
            </div>
            <div className="chip-row">
              {stores.slice(0, 8).map((s) => {
                const selected = list.selectedStoreIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip${selected ? ' active' : ''}`}
                    onClick={() => toggleSelectedStore(s.id)}
                  >
                    {s.brand}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <SmartAdd />

        {todo.length > 0 && <div className="section-title">Za kupiti</div>}
        {todo.map((item) => {
          const last = getLastPrice(item.name);
          return (
            <article key={item.id} className="item-row">
              <button
                type="button"
                className="check-btn"
                aria-label="Stavi u korpu"
                onClick={() => onToggleCheck(item.id)}
              >
                ✓
              </button>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.02rem' }}>{item.name}</div>
                <div className="chip-row" style={{ marginTop: '0.3rem' }}>
                  <span className="badge">{CATEGORY_LABELS[item.category]}</span>
                  {last ? (
                    <span className="badge badge-best">
                      {formatKm(last.lowestPrice ?? last.unitPrice)} ·{' '}
                      {last.lowestStoreName ?? last.storeName}
                    </span>
                  ) : (
                    <span className="badge badge-warn">Nema cijene</span>
                  )}
                </div>
                <div className="qty-ctrl">
                  <button type="button" aria-label="Smanji" onClick={() => changeQuantity(item.id, -1)}>
                    −
                  </button>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <button type="button" aria-label="Povećaj" onClick={() => changeQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeListItem(item.id)}>
                Ukloni
              </button>
            </article>
          );
        })}

        {cart.length > 0 && <div className="section-title">U korpi</div>}
        {cart.map((item) => (
          <article key={item.id} className="item-row in-cart">
            <button
              type="button"
              className="check-btn"
              aria-label="Izvadi iz korpe"
              onClick={() => onToggleCheck(item.id)}
            >
              ✓
            </button>
            <div>
              <div style={{ fontWeight: 800 }}>{item.name}</div>
              <div className="muted" style={{ marginTop: '0.2rem', fontSize: '0.9rem' }}>
                {item.quantity} {item.unit} × {formatKm(item.unitPrice ?? 0)} ={' '}
                <strong>{formatKm(item.lineTotal ?? 0)}</strong>
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <PriceDeltaBadge delta={item.priceDelta} />
              </div>
            </div>
            <span className="badge badge-best">Kupljeno</span>
          </article>
        ))}

        {!list.items.length && (
          <div className="card muted" style={{ textAlign: 'center' }}>
            Spisak je prazan. Ukucaj namirnicu iznad (npr. „ulje” za Floriol).
          </div>
        )}
      </section>

      <aside className="stack">
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Poređenje radnji</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Procjena cijelog spiska po zadnjim cijenama iz arhive.
          </p>
          {estimates.map((est) => {
            const store = stores.find((s) => s.id === est.storeId);
            return (
              <div key={est.storeId} className={`store-card${est.isCheapest ? ' best' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <strong>{store?.name}</strong>
                  <div className="chip-row">
                    {est.isCheapest && <span className="badge badge-action">NAJJEFTINIJE</span>}
                    {est.isClosest && <span className="badge badge-best">Najbliže</span>}
                    {est.isBestChoice && <span className="badge">Najbolji omjer</span>}
                  </div>
                </div>
                <div className="price-big" style={{ fontSize: '1.3rem' }}>
                  {est.pricedCount > 0 ? formatKm(est.total) : '—'}
                </div>
                <div className="muted" style={{ fontSize: '0.82rem' }}>
                  {est.pricedCount}/{list.items.length} sa cijenom
                  {est.distanceKm != null ? ` · ${formatDistance(est.distanceKm)}` : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Najbliže radnje</h2>
          {nearby.map((s) => (
            <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{s.name}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {s.distanceKm != null ? formatDistance(s.distanceKm) : s.zone}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setActiveStore(s.id)}>
                Kupuj
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
