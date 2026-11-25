import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';
import { formatDateTime, formatKm, normalizeItemKey } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

export function HistoryPage() {
  const archive = useAppStore((s) => s.archive);
  const trips = useAppStore((s) => s.trips);
  const historyItemKey = useAppStore((s) => s.historyItemKey);
  const setHistoryItemKey = useAppStore((s) => s.setHistoryItemKey);
  const [tab, setTab] = useState<'cijene' | 'kupovine'>('cijene');
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; key: string; count: number; min: number; max: number; last: string }>();
    for (const a of archive) {
      const existing = map.get(a.itemKey);
      if (!existing) {
        map.set(a.itemKey, {
          name: a.itemName,
          key: a.itemKey,
          count: 1,
          min: a.unitPrice,
          max: a.unitPrice,
          last: a.recordedAt,
        });
      } else {
        existing.count += 1;
        existing.min = Math.min(existing.min, a.unitPrice);
        existing.max = Math.max(existing.max, a.unitPrice);
        if (a.recordedAt > existing.last) {
          existing.last = a.recordedAt;
          existing.name = a.itemName;
        }
      }
    }
    let rows = [...map.values()];
    const q = normalizeItemKey(query);
    if (q) rows = rows.filter((r) => normalizeItemKey(r.name).includes(q));
    return rows.sort((a, b) => b.last.localeCompare(a.last));
  }, [archive, query]);

  const detail = historyItemKey
    ? archive
        .filter((a) => a.itemKey === historyItemKey)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    : [];

  const detailName = detail[0]?.itemName;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Historija / Arhiva</h1>
          <p>Sve snimljene cijene i obavljene kupovine</p>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: '0.85rem' }}>
        <button
          type="button"
          className={`chip${tab === 'cijene' ? ' active' : ''}`}
          onClick={() => setTab('cijene')}
        >
          Historija cijena
        </button>
        <button
          type="button"
          className={`chip${tab === 'kupovine' ? ' active' : ''}`}
          onClick={() => setTab('kupovine')}
        >
          Obavljene kupovine
        </button>
      </div>

      {tab === 'cijene' && (
        <div className="desktop-layout">
          <section className="stack">
            <input
              className="input"
              placeholder="Pretraži artikal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {grouped.map((g) => (
              <button
                key={g.key}
                type="button"
                className="store-card"
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                onClick={() => setHistoryItemKey(g.key)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{g.name}</strong>
                  <span className="badge">{g.count}×</span>
                </div>
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {formatKm(g.min)} – {formatKm(g.max)} · zadnje {formatDateTime(g.last)}
                </div>
              </button>
            ))}
            {!grouped.length && <div className="card muted">Nema zapisa u arhivi.</div>}
          </section>

          <aside className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              {detailName ? `Kretanje: ${detailName}` : 'Odaberi artikal'}
            </h2>
            {!detail.length && (
              <p className="muted" style={{ margin: 0 }}>
                Klikni artikal da vidiš sve cijene po datumima i radnjama.
              </p>
            )}
            {detail.map((a) => {
              const lowest = Math.min(...detail.map((d) => d.unitPrice));
              const isLow = a.unitPrice === lowest;
              return (
                <div key={a.id} className={`store-card${isLow ? ' best' : ''}`}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{formatKm(a.unitPrice)}</strong>
                    {isLow && <span className="badge badge-best">Najjeftinije</span>}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {a.storeName} · {formatDateTime(a.recordedAt)}
                  </div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {a.quantity} {a.unit} · ukupno {formatKm(a.lineTotal)}
                  </div>
                </div>
              );
            })}
          </aside>
        </div>
      )}

      {tab === 'kupovine' && (
        <section className="stack">
          {trips.map((t) => (
            <article key={t.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{t.storeName}</strong>
                <strong>{formatKm(t.total)}</strong>
              </div>
              <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {format(new Date(t.date), 'd. MMMM yyyy. HH:mm', { locale: bs })} · {t.itemCount} artikala
              </div>
              <div className="stack" style={{ marginTop: '0.65rem' }}>
                {t.items.map((it, idx) => (
                  <div key={`${t.id}-${idx}`} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>
                      {it.name} ({it.quantity} {it.unit})
                    </span>
                    <span>{formatKm(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!trips.length && <div className="card muted">Još nema završenih kupovina.</div>}
        </section>
      )}
    </div>
  );
}
