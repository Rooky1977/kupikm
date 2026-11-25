import { useEffect, useMemo, useState } from 'react';
import { SmartAdd } from '../components/list/SmartAdd';
import { PriceDeltaBadge } from '../components/list/PriceDeltaBadge';
import { LoyaltyCardsModal } from '../components/loyalty/LoyaltyCards';
import { getFrequentItems } from '../lib/frequentItems';
import { formatDateTime, formatDistance, formatKm } from '../lib/format';
import { haversineKm } from '../lib/geolocation';
import { findPantryMatch, pantryWarningText } from '../lib/pantry';
import { isSuperPrice } from '../lib/scoring';
import { computeSplitCart } from '../lib/splitCart';
import {
  bindWakeLockVisibility,
  disableWakeLock,
  enableWakeLock,
  isWakeLockSupported,
} from '../lib/wakeLock';
import { useAppStore } from '../store/useAppStore';
import {
  CATEGORY_LABELS,
  DEFAULT_ZONE_ORDER,
  type Category,
  type ListItem,
} from '../types';

export function ListPage() {
  const list = useAppStore((s) => s.list);
  const stores = useAppStore((s) => s.stores);
  const archive = useAppStore((s) => s.archive);
  const pantry = useAppStore((s) => s.pantry);
  const templates = useAppStore((s) => s.templates);
  const settings = useAppStore((s) => s.settings);
  const lastUiError = useAppStore((s) => s.lastUiError);
  const lastTripVariance = useAppStore((s) => s.lastTripVariance);
  const pendingPantryOffer = useAppStore((s) => s.pendingPantryOffer);
  const clearTripVariance = useAppStore((s) => s.clearTripVariance);
  const applyPendingPantryOffer = useAppStore((s) => s.applyPendingPantryOffer);
  const dismissPendingPantryOffer = useAppStore((s) => s.dismissPendingPantryOffer);
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
  const addFromSuggestion = useAppStore((s) => s.addFromSuggestion);
  const saveTemplateFromList = useAppStore((s) => s.saveTemplateFromList);
  const loadTemplate = useAppStore((s) => s.loadTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const moveZone = useAppStore((s) => s.moveZone);
  const setKeepScreenOn = useAppStore((s) => s.setKeepScreenOn);
  const setUiError = useAppStore((s) => s.setUiError);

  const [tplMsg, setTplMsg] = useState('');
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [wakeMsg, setWakeMsg] = useState('');
  const [pantrySelected, setPantrySelected] = useState<Record<string, boolean>>({});

  const todo = list.items.filter((i) => !i.checked);
  const cart = list.items.filter((i) => i.checked);
  const estimates = getEstimates(true);
  const zoneOrder = list.zoneOrder ?? DEFAULT_ZONE_ORDER;

  const frequent = useMemo(() => getFrequentItems(archive, 8), [archive]);
  const onListKeys = useMemo(
    () => new Set(list.items.filter((i) => !i.checked).map((i) => i.name.toLowerCase())),
    [list.items],
  );

  const split = useMemo(
    () =>
      computeSplitCart(
        list.items,
        stores,
        list.selectedStoreIds.length >= 2
          ? list.selectedStoreIds
          : estimates.map((e) => e.storeId),
        archive,
      ),
    [list.items, list.selectedStoreIds, stores, archive, estimates],
  );

  const groupedTodo = useMemo(() => {
    const map = new Map<Category, ListItem[]>();
    for (const cat of zoneOrder) map.set(cat, []);
    for (const item of todo) {
      const cat = map.has(item.category) ? item.category : 'ostalo';
      map.get(cat)!.push(item);
    }
    return zoneOrder
      .map((cat) => ({ cat, items: map.get(cat) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [todo, zoneOrder]);

  useEffect(() => {
    const unbind = bindWakeLockVisibility();
    return () => {
      unbind();
      void disableWakeLock();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (settings.keepScreenOn) {
        const res = await enableWakeLock();
        if (cancelled) return;
        if (res.ok) setWakeMsg('Ekran ostaje upaljen dok je spisak aktivan.');
        else if (res.fallback) {
          setWakeMsg(
            isWakeLockSupported()
              ? 'Wake Lock nije odobren — ostavi aplikaciju otvorenu.'
              : 'Preglednik ne podržava Wake Lock — drži tab otvoren.',
          );
        }
      } else {
        await disableWakeLock();
        if (!cancelled) setWakeMsg('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.keepScreenOn]);

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

  useEffect(() => {
    if (!pendingPantryOffer) return;
    const init: Record<string, boolean> = {};
    for (const row of pendingPantryOffer) init[row.name] = true;
    setPantrySelected(init);
  }, [pendingPantryOffer]);

  const renderItem = (item: ListItem) => {
    const last = getLastPrice(item.name);
    const superDeal = last ? isSuperPrice(archive, item.name, last.unitPrice) : false;
    const stock = findPantryMatch(pantry, item.name);
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
            {superDeal && <span className="badge badge-super">Super cijena</span>}
            {stock && (
              <span className="badge badge-pantry" title={pantryWarningText(stock)}>
                Špajz: {stock.quantity} {stock.unit}
              </span>
            )}
            {last?.activeStorePrice != null ? (
              <span className="badge">
                Ovdje {formatKm(last.activeStorePrice)}
              </span>
            ) : null}
            {last?.lowestPrice != null ? (
              <span className="badge badge-best">
                Najbolja {formatKm(last.lowestPrice)} · {last.lowestStoreName}
                {last.lowestRecordedAt ? ` · ${formatDateTime(last.lowestRecordedAt)}` : ''}
              </span>
            ) : last ? (
              <span className="badge badge-best">
                {formatKm(last.unitPrice)} · {last.storeName}
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
  };

  return (
    <div className="desktop-3col" id="spisak">
      <section className="stack">
        <div className="card stack">
          <div className="list-toolbar">
            <div className="row" style={{ gap: '0.65rem' }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(0,230,118,0.16)',
                  color: 'var(--cyber-green)',
                }}
                aria-hidden
              >
                🛒
              </span>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Moj spisak</h1>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Kod: <strong style={{ color: 'var(--cyber-green)' }}>{list.shareCode}</strong>
                </p>
              </div>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLoyaltyOpen(true)}>
                Kartice
              </button>
              <button type="button" className="btn btn-sm btn-action">
                Lista
              </button>
              <button
                type="button"
                className="btn btn-sm btn-action"
                onClick={finishShopping}
                disabled={!cart.length}
              >
                Završi
              </button>
            </div>
          </div>

          <div className="wake-bar">
            <div className="row">
              <span aria-hidden>🔒</span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                Ekran upaljen (Wake Lock) dok kupuješ
              </span>
            </div>
            <button
              type="button"
              className={`cyber-toggle${settings.keepScreenOn ? ' on' : ''}`}
              aria-label="Wake Lock"
              onClick={() => setKeepScreenOn(!settings.keepScreenOn)}
            >
              <span />
            </button>
          </div>
          {wakeMsg && <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{wakeMsg}</p>}
        </div>

        {lastUiError && (
          <div className="alert-warn" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span>{lastUiError}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setUiError(null)}>
              ✕
            </button>
          </div>
        )}

        {frequent.length > 0 && (
          <div className="card stack">
            <div className="section-title" style={{ margin: 0 }}>
              Često kupuješ
            </div>
            <div className="chip-row">
              {frequent.map((f) => {
                const onList = onListKeys.has(f.name.toLowerCase());
                return (
                  <button
                    key={f.itemKey}
                    type="button"
                    className={`chip${onList ? '' : ' active'}`}
                    disabled={onList}
                    onClick={() =>
                      addFromSuggestion({
                        name: f.name,
                        unit: f.unit,
                        category: f.category,
                      })
                    }
                  >
                    {f.name}
                    <small>
                      {f.count}× · {formatKm(f.lastPrice)}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Brzi šabloni (korpe)</h2>
            <button
              type="button"
              className="btn btn-sm btn-action"
              disabled={!list.items.length}
              onClick={() => {
                const name = window.prompt('Naziv šablona', 'Sedmična kupovina');
                if (!name?.trim()) return;
                saveTemplateFromList(name.trim());
                setTplMsg(`Šablon „${name.trim()}“ sačuvan.`);
              }}
            >
              Sačuvaj trenutni spisak
            </button>
          </div>
          {tplMsg && <p className="muted" style={{ margin: 0 }}>{tplMsg}</p>}
          <div className="chip-row">
            {templates.map((t) => (
              <div key={t.id} className="row" style={{ gap: '0.25rem' }}>
                <button
                  type="button"
                  className="chip active"
                  onClick={() => {
                    loadTemplate(t.id);
                    setTplMsg(`Učitano ${t.items.length} artikala iz „${t.name}”.`);
                  }}
                >
                  {t.name} ({t.items.length})
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  aria-label="Obriši šablon"
                  onClick={() => deleteTemplate(t.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <SmartAdd />

        {todo.length > 0 && (
          <div className="card stack">
            <div className="section-title" style={{ margin: 0 }}>
              Zone / redoslijed u radnji
            </div>
            <div className="chip-row">
              {zoneOrder.map((cat) => (
                <div key={cat} className="zone-chip">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => moveZone(cat, -1)}>
                    ↑
                  </button>
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => moveZone(cat, 1)}>
                    ↓
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedTodo.map((g) => (
          <div key={g.cat} className="stack">
            <div className="section-title">{CATEGORY_LABELS[g.cat]}</div>
            {g.items.map(renderItem)}
          </div>
        ))}

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
              <div style={{ marginTop: '0.35rem' }} className="chip-row">
                <PriceDeltaBadge delta={item.priceDelta} />
                {item.isPromo && <span className="badge badge-action">Akcija</span>}
                {item.isExtraordinary && <span className="badge badge-warn">Vanredni</span>}
                {item.unitPrice != null && isSuperPrice(archive, item.name, item.unitPrice) && (
                  <span className="badge badge-super">Super cijena</span>
                )}
              </div>
            </div>
            <span className="badge badge-best">Kupljeno</span>
          </article>
        ))}

        {!list.items.length && (
          <div className="empty-dash">
            Spisak je prazan. Ukucaj, izgovori ili skeniraj namirnicu.
          </div>
        )}
      </section>

      <aside className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
              <span style={{ color: 'var(--cyber-green)', marginRight: 6 }}>📊</span>
              Poređenje radnji
            </h2>
          </div>
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
                <div className="row" style={{ justifyContent: 'space-between', marginTop: '0.35rem' }}>
                  <span className="muted" style={{ fontSize: '0.82rem' }}>
                    {est.pricedCount}/{list.items.length} sa cijenom
                    {est.distanceKm != null ? ` · ${formatDistance(est.distanceKm)}` : ''}
                  </span>
                  <strong className="price-big" style={{ fontSize: '1.05rem' }}>
                    {est.pricedCount > 0 ? `${formatKm(est.total)} ›` : '—'}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        {split && (
          <div className="card stack split-card">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Optimalna kombinacija (2 radnje)</h2>
              <span className="badge badge-super">Ušteda {formatKm(split.savings)}</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
              Umjesto {formatKm(split.bestSingleTotal)} u jednoj radnji, podijeli kupovinu i plati{' '}
              <strong>{formatKm(split.combinedTotal)}</strong>.
            </p>
            <div className="store-card">
              <strong>{split.storeAName}</strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {split.storeAItems.length} artikala ·{' '}
                {formatKm(split.storeAItems.reduce((s, i) => s + i.line, 0))}
              </div>
            </div>
            <div className="store-card">
              <strong>{split.storeBName}</strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {split.storeBItems.length} artikala ·{' '}
                {formatKm(split.storeBItems.reduce((s, i) => s + i.line, 0))}
              </div>
            </div>
          </div>
        )}

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Najbliže radnje</h2>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setActiveStore(nearby[0]?.id ?? '')}>
              Pogledaj sve →
            </button>
          </div>
          {nearby.map((s) => (
            <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{s.name}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {s.distanceKm != null ? formatDistance(s.distanceKm) : s.zone}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-action" onClick={() => setActiveStore(s.id)}>
                Kupi
              </button>
            </div>
          ))}
        </div>
      </aside>

      <LoyaltyCardsModal open={loyaltyOpen} onClose={() => setLoyaltyOpen(false)} />

      {lastTripVariance && (
        <div className="modal-backdrop" role="presentation" onClick={() => clearTripVariance()}>
          <div className="modal stack" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Sažetak kupovine</h2>
            <p className="muted" style={{ margin: 0 }}>
              Procjena {formatKm(lastTripVariance.estimatedTotal)} · stvarno{' '}
              <strong>{formatKm(lastTripVariance.actualTotal)}</strong> · razlika{' '}
              <strong style={{ color: lastTripVariance.delta > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {lastTripVariance.delta > 0 ? '+' : ''}
                {formatKm(lastTripVariance.delta)}
              </strong>
            </p>
            {lastTripVariance.topDrivers.length > 0 && (
              <div className="stack" style={{ gap: '0.35rem' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  Najveći uticaj na odstupanje
                </div>
                {lastTripVariance.topDrivers.map((d) => (
                  <div key={d.name} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{d.name}</span>
                    <strong style={{ color: d.delta > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {d.delta > 0 ? '+' : ''}
                      {formatKm(d.delta)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-action" onClick={() => clearTripVariance()}>
              U redu
            </button>
          </div>
        </div>
      )}

      {pendingPantryOffer && !lastTripVariance && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal stack" role="dialog" aria-modal="true">
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Dodaj u špajz?</h2>
            <p className="muted" style={{ margin: 0 }}>
              Označi kupljene artikle koje želiš dodati u kućne zalihe.
            </p>
            <div className="stack" style={{ gap: '0.35rem', maxHeight: 240, overflow: 'auto' }}>
              {pendingPantryOffer.map((row) => (
                <label key={row.name} className="switch-row">
                  <input
                    type="checkbox"
                    checked={pantrySelected[row.name] !== false}
                    onChange={(e) =>
                      setPantrySelected((s) => ({ ...s, [row.name]: e.target.checked }))
                    }
                  />
                  <span>
                    {row.name} ({row.quantity} {row.unit})
                  </span>
                </label>
              ))}
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => dismissPendingPantryOffer()}
              >
                Preskoči
              </button>
              <button
                type="button"
                className="btn btn-action"
                style={{ flex: 1.2 }}
                onClick={() => {
                  const names = pendingPantryOffer
                    .filter((r) => pantrySelected[r.name] !== false)
                    .map((r) => r.name);
                  applyPendingPantryOffer(names);
                }}
              >
                Dodaj u špajz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
