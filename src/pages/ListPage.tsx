import { useEffect, useMemo, useState } from 'react';
import { SmartAdd } from '../components/list/SmartAdd';
import { PriceDeltaBadge } from '../components/list/PriceDeltaBadge';
import { LoyaltyCardsModal } from '../components/loyalty/LoyaltyCards';
import { getFrequentItems } from '../lib/frequentItems';
import { formatDistance, formatKm } from '../lib/format';
import { haversineKm } from '../lib/geolocation';
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
  const templates = useAppStore((s) => s.templates);
  const settings = useAppStore((s) => s.settings);
  const lastUiError = useAppStore((s) => s.lastUiError);
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

  const renderItem = (item: ListItem) => {
    const last = getLastPrice(item.name);
    const superDeal = last ? isSuperPrice(archive, item.name, last.unitPrice) : false;
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
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setLoyaltyOpen(true)}>
              Kartice
            </button>
            <button
              type="button"
              className="btn btn-action"
              onClick={finishShopping}
              disabled={!cart.length}
            >
              Završi kupovinu
            </button>
          </div>
        </div>

        {lastUiError && (
          <div className="alert-warn" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span>{lastUiError}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setUiError(null)}>
              ✕
            </button>
          </div>
        )}

        <div className="card stack">
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.keepScreenOn}
              onChange={(e) => setKeepScreenOn(e.target.checked)}
            />
            <span>Ekran upaljen (Wake Lock) dok kupuješ</span>
          </label>
          {wakeMsg && <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{wakeMsg}</p>}
        </div>

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
          <div className="card muted" style={{ textAlign: 'center' }}>
            Spisak je prazan. Ukucaj, izgovori ili skeniraj namirnicu.
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

      <LoyaltyCardsModal open={loyaltyOpen} onClose={() => setLoyaltyOpen(false)} />
    </div>
  );
}
