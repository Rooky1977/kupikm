import { SmartAdd } from '../components/list/SmartAdd';
import { formatKm } from '../lib/format';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY_LABELS } from '../types';

export function ListPage() {
  const list = useAppStore((s) => s.list);
  const stores = useAppStore((s) => s.stores);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const onToggleCheck = useAppStore((s) => s.onToggleCheck);
  const changeQuantity = useAppStore((s) => s.changeQuantity);
  const removeListItem = useAppStore((s) => s.removeListItem);
  const finishShopping = useAppStore((s) => s.finishShopping);
  const getLastPrice = useAppStore((s) => s.getLastPrice);
  const getEstimates = useAppStore((s) => s.getEstimates);
  const addStore = useAppStore((s) => s.addStore);
  const userLocation = useAppStore((s) => s.userLocation);

  const todo = list.items.filter((i) => !i.checked);
  const cart = list.items.filter((i) => i.checked);
  const estimates = getEstimates();

  const onNewStore = () => {
    const name = window.prompt('Naziv nove radnje (npr. Bingo Centar)');
    if (!name?.trim()) return;
    const brand = window.prompt('Marka / lanac (npr. Bingo)') ?? name;
    addStore({
      name: name.trim(),
      brand: brand.trim(),
      city: 'Sarajevo',
      address: 'Ručno dodana radnja',
      location: userLocation ?? { lat: 43.8563, lng: 18.4131 },
    });
  };

  return (
    <div className="desktop-layout">
      <section className="stack">
        <div className="page-header">
          <div>
            <h1>{list.name}</h1>
            <p>
              Kod: <strong>{list.shareCode}</strong>
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

        <div className="card">
          <label className="label">
            Aktivna prodavnica (gdje kupuješ)
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
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{item.name}</div>
                <div className="chip-row" style={{ marginTop: '0.35rem' }}>
                  <span className="badge">{CATEGORY_LABELS[item.category]}</span>
                  {last ? (
                    <span className="badge badge-best">
                      od {formatKm(last.lowestPrice ?? last.unitPrice)} · {last.lowestStoreName ?? last.storeName}
                    </span>
                  ) : (
                    <span className="badge badge-warn">Nema cijene</span>
                  )}
                </div>
                <div className="qty-ctrl">
                  <button type="button" aria-label="Smanji" onClick={() => changeQuantity(item.id, item.unit === 'kg' ? -0.1 : -1)}>
                    −
                  </button>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <button type="button" aria-label="Povećaj" onClick={() => changeQuantity(item.id, item.unit === 'kg' ? 0.1 : 1)}>
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
              <div className="muted" style={{ marginTop: '0.25rem' }}>
                {item.quantity} {item.unit} × {formatKm(item.unitPrice ?? 0)} ={' '}
                <strong>{formatKm(item.lineTotal ?? 0)}</strong>
              </div>
            </div>
            <span className="badge badge-best">Kupljeno</span>
          </article>
        ))}

        {!list.items.length && (
          <div className="card muted" style={{ textAlign: 'center' }}>
            Spisak je prazan. Ukucaj namirnicu iznad da dodaš stavke.
          </div>
        )}
      </section>

      <aside className="stack">
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Poređenje korpe po radnjama</h2>
          <p className="muted" style={{ margin: 0 }}>
            Procjena na osnovu zadnjih cijena iz arhive (stavke koje još nisu u korpi).
          </p>
          {estimates.map((est) => {
            const store = stores.find((s) => s.id === est.storeId);
            return (
              <div key={est.storeId} className={`store-card${est.isCheapest ? ' best' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{store?.name}</strong>
                  {est.isCheapest && <span className="badge badge-best">NAJJEFTINIJE</span>}
                </div>
                <div className="price-big">
                  {est.pricedCount > 0 ? formatKm(est.total) : '—'}
                </div>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  {est.pricedCount}/{todo.length || list.items.filter((i) => !i.checked).length} artikala sa
                  cijenom
                  {est.missingCount > 0 ? ` · ${est.missingCount} bez cijene` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
