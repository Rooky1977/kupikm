import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';
import { CATEGORY_LABELS, type Category } from '../types';
import { formatKm, formatMonthLabel, monthKey } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

export function BudgetPage() {
  const budgetAmount = useAppStore((s) => s.budgetAmount);
  const setBudget = useAppStore((s) => s.setBudget);
  const trips = useAppStore((s) => s.trips);
  const getMonthSpend = useAppStore((s) => s.getMonthSpend);
  const archive = useAppStore((s) => s.archive);

  const [draft, setDraft] = useState(String(budgetAmount));
  const spent = getMonthSpend();
  const remaining = budgetAmount - spent;
  const pct = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;
  const over = spent > budgetAmount;
  const key = monthKey();
  const monthTrips = trips.filter((t) => t.date.startsWith(key));

  const categoryStats: Partial<Record<Category, number>> = {};
  for (const a of archive.filter((e) => e.recordedAt.startsWith(key) && e.source === 'cart')) {
    categoryStats[a.category] = (categoryStats[a.category] ?? 0) + a.lineTotal;
  }
  const catRows = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  const storeStats: Record<string, number> = {};
  for (const t of monthTrips) {
    storeStats[t.storeName] = (storeStats[t.storeName] ?? 0) + t.total;
  }
  const storeRows = Object.entries(storeStats).sort((a, b) => b[1] - a[1]);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(draft.replace(',', '.'));
    if (Number.isNaN(value) || value < 0) return;
    setBudget(value);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Budžet</h1>
          <p>{formatMonthLabel(key)}</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '0.85rem' }}>
        <div className="stat">
          <span className="muted">Budžet</span>
          <strong>{formatKm(budgetAmount)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Potrošeno</span>
          <strong>{formatKm(spent)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Preostalo</span>
          <strong style={{ color: over ? 'var(--danger)' : undefined }}>{formatKm(remaining)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Iskorištenost</span>
          <strong>{pct.toFixed(0)}%</strong>
        </div>
      </div>

      <div className="card stack">
        <div className={`progress${over ? ' over' : ''}`}>
          <span style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <form className="form-row-2" onSubmit={onSave}>
          <label className="label">
            Mjesečni budžet (KM)
            <input
              className="input"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn" style={{ width: '100%' }}>
              Sačuvaj
            </button>
          </div>
        </form>
      </div>

      <div className="desktop-layout" style={{ marginTop: '0.85rem' }}>
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Po kategorijama</h2>
          {catRows.length === 0 && <p className="muted">Nema podataka ovaj mjesec.</p>}
          {catRows.map(([cat, value]) => (
            <div key={cat} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{CATEGORY_LABELS[cat as Category] ?? cat}</span>
              <strong>{formatKm(value)}</strong>
            </div>
          ))}
        </section>
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Po radnjama</h2>
          {storeRows.length === 0 && <p className="muted">Nema podataka.</p>}
          {storeRows.map(([name, value]) => (
            <div key={name} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{name}</span>
              <strong>{formatKm(value)}</strong>
            </div>
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Obavljene kupovine</h2>
        <div className="stack">
          {monthTrips.map((t) => (
            <div key={t.id} style={{ padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{t.storeName}</strong>
                <strong>{formatKm(t.total)}</strong>
              </div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {format(new Date(t.date), 'd. MMMM yyyy.', { locale: bs })} · {t.itemCount} artikala
              </div>
            </div>
          ))}
          {!monthTrips.length && <p className="muted">Nema kupovina ovaj mjesec.</p>}
        </div>
      </section>
    </div>
  );
}
