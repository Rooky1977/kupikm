import { useMemo, useState, type FormEvent } from 'react';
import { IconStar } from '../components/layout/Icons';
import { BIH_CITIES } from '../types';
import { formatDistance, formatKm } from '../lib/format';
import { haversineKm } from '../lib/geolocation';
import { computeSplitCart } from '../lib/splitCart';
import { useAppStore } from '../store/useAppStore';

export function StoresPage() {
  const stores = useAppStore((s) => s.stores);
  const list = useAppStore((s) => s.list);
  const archive = useAppStore((s) => s.archive);
  const userLocation = useAppStore((s) => s.userLocation);
  const locationMode = useAppStore((s) => s.locationMode);
  const locationError = useAppStore((s) => s.locationError);
  const settings = useAppStore((s) => s.settings);
  const toggleSelectedStore = useAppStore((s) => s.toggleSelectedStore);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const addStore = useAppStore((s) => s.addStore);
  const detectLocation = useAppStore((s) => s.detectLocation);
  const useCityLocation = useAppStore((s) => s.useCityLocation);
  const getEstimates = useAppStore((s) => s.getEstimates);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [address, setAddress] = useState('');

  const nearby = useMemo(
    () =>
      [...stores]
        .map((s) => ({
          ...s,
          distanceKm: userLocation ? haversineKm(userLocation, s.location) : undefined,
        }))
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)),
    [stores, userLocation],
  );

  const estimates = getEstimates(true);
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

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) return;
    addStore({
      name: name.trim(),
      brand: brand.trim(),
      city: settings.cityFallback,
      address: address.trim() || 'Adresa nije unesena',
      location: userLocation ?? { lat: 43.8563, lng: 18.4131 },
    });
    setName('');
    setBrand('');
    setAddress('');
    setShowAdd(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Radnje</h1>
          <p>
            Lokacija: {locationMode === 'gps' ? 'GPS' : settings.cityFallback} · izaberi do 3 za poređenje
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Zatvori' : '+ Nova radnja'}
        </button>
      </div>

      <div className="card stack" style={{ marginBottom: '0.85rem' }}>
        <div className="form-row-2">
          <button type="button" className="btn" onClick={() => void detectLocation()}>
            Koristi moju lokaciju
          </button>
          <label className="label">
            Grad (fallback)
            <select
              className="select"
              value={settings.cityFallback}
              onChange={(e) => useCityLocation(e.target.value)}
            >
              {BIH_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {locationError && <p className="muted" style={{ margin: 0 }}>{locationError}</p>}
      </div>

      {showAdd && (
        <form className="card form-grid" style={{ marginBottom: '0.85rem' }} onSubmit={onAdd}>
          <label className="label">
            Naziv
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="label">
            Marka
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} required />
          </label>
          <label className="label">
            Adresa
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-action">
            Sačuvaj radnju
          </button>
        </form>
      )}

      <div className="desktop-layout">
        <section className="stack">
          {nearby.map((store) => {
            const selected = list.selectedStoreIds.includes(store.id);
            const est = estimates.find((e) => e.storeId === store.id);
            return (
              <article
                key={store.id}
                className={`store-card${selected ? ' selected' : ''}${est?.isCheapest ? ' best' : ''}`}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{store.name}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {store.address}
                      {store.distanceKm != null ? ` · ${formatDistance(store.distanceKm)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    style={{ color: store.isFavorite ? 'var(--action)' : undefined }}
                    onClick={() => toggleFavorite(store.id)}
                    aria-label="Omiljena"
                  >
                    <IconStar filled={store.isFavorite} />
                  </button>
                </div>
                <div className="chip-row">
                  {est?.isCheapest && <span className="badge badge-action">NAJJEFTINIJE</span>}
                  {est?.isClosest && <span className="badge badge-best">Najbliže</span>}
                  {est?.isBestChoice && <span className="badge">Najbolji omjer</span>}
                  {selected && <span className="badge">Za poređenje</span>}
                </div>
                {est && est.pricedCount > 0 && (
                  <div className="price-big" style={{ fontSize: '1.2rem' }}>
                    {formatKm(est.total)}
                  </div>
                )}
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm${selected ? '' : ' btn-ghost'}`}
                    onClick={() => toggleSelectedStore(store.id)}
                  >
                    {selected ? 'Ukloni iz poređenja' : 'Uporedi (max 3)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setActiveStore(store.id)}
                  >
                    Kupuj ovdje
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="stack">
          <div className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Sažetak poređenja</h2>
            {estimates.map((est) => {
              const store = stores.find((s) => s.id === est.storeId);
              return (
                <div key={est.storeId} className={`store-card${est.isCheapest ? ' best' : ''}`}>
                  <strong>{store?.name}</strong>
                  <div className="price-big">{est.pricedCount ? formatKm(est.total) : 'Nema cijena'}</div>
                  <div className="chip-row">
                    {est.isCheapest && <span className="badge badge-action">NAJJEFTINIJE</span>}
                    {est.isClosest && <span className="badge badge-best">Najbliže</span>}
                    {est.isBestChoice && <span className="badge">Najbolji omjer</span>}
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
                Najjeftinije artikle uzmi u <strong>{split.storeAName}</strong>, ostatak u{' '}
                <strong>{split.storeBName}</strong> — ukupno {formatKm(split.combinedTotal)} umjesto{' '}
                {formatKm(split.bestSingleTotal)}.
              </p>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {split.storeAName}: {split.storeAItems.length} stavki · {split.storeBName}:{' '}
                {split.storeBItems.length} stavki
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
