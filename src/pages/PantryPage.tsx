import { useMemo, useState, type FormEvent } from 'react';
import { getExpiryStatus, pantryWarningText } from '../lib/pantry';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY_LABELS, UNIT_LABELS, type Category, type Unit } from '../types';

export function PantryPage() {
  const pantry = useAppStore((s) => s.pantry);
  const upsertPantryItem = useAppStore((s) => s.upsertPantryItem);
  const adjustPantryQuantity = useAppStore((s) => s.adjustPantryQuantity);
  const deletePantryItem = useAppStore((s) => s.deletePantryItem);

  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<Category>('ostava');
  const [expiresAt, setExpiresAt] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...pantry]
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'bs'));
  }, [pantry, query]);

  const resetForm = () => {
    setName('');
    setQty('1');
    setUnit('kom');
    setCategory('ostava');
    setExpiresAt('');
    setEditId(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const quantity = Number(qty.replace(',', '.'));
    if (!name.trim() || Number.isNaN(quantity) || quantity < 0) return;
    upsertPantryItem({
      id: editId ?? undefined,
      name: name.trim(),
      quantity,
      unit,
      category,
      expiresAt: expiresAt || undefined,
    });
    resetForm();
  };

  const startEdit = (id: string) => {
    const item = pantry.find((p) => p.id === id);
    if (!item) return;
    setEditId(item.id);
    setName(item.name);
    setQty(String(item.quantity));
    setUnit(item.unit);
    setCategory(item.category);
    setExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 10) : '');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Špajz (Zalihe)</h1>
          <p>Šta već imaš kod kuće — da ne kupuješ duplo</p>
        </div>
      </div>

      <form className="card form-grid" style={{ marginBottom: '0.85rem' }} onSubmit={onSubmit}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
          {editId ? 'Ažuriraj zalihu' : 'Dodaj u špajz'}
        </h2>
        <label className="label">
          Naziv artikla
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="npr. Ulje Floriol 1L"
            required
          />
        </label>
        <div className="form-row-2">
          <label className="label">
            Količina
            <input
              className="input"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </label>
          <label className="label">
            Jedinica
            <select className="select" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {UNIT_LABELS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row-2">
          <label className="label">
            Kategorija
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Rok trajanja (opciono)
            <input
              className="input"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
        </div>
        <div className="row">
          <button type="submit" className="btn btn-action">
            {editId ? 'Sačuvaj izmjene' : 'Dodaj zalihu'}
          </button>
          {editId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Otkaži
            </button>
          )}
        </div>
      </form>

      <input
        className="input"
        style={{ marginBottom: '0.75rem' }}
        placeholder="Pretraži špajz…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="stack">
        {!rows.length && <div className="card muted">Špajz je prazan. Dodaj namirnice koje već imaš.</div>}
        {rows.map((item) => {
          const status = getExpiryStatus(item.expiresAt);
          return (
            <article
              key={item.id}
              className={`store-card${status === 'expired' ? ' pantry-expired' : status === 'soon' ? ' pantry-soon' : ''}`}
            >
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {CATEGORY_LABELS[item.category]} · {pantryWarningText(item)}
                  </div>
                  {status === 'expired' && (
                    <span className="badge badge-warn">Rok istekao</span>
                  )}
                  {status === 'soon' && (
                    <span className="badge badge-action">Rok uskoro</span>
                  )}
                </div>
                <div className="qty-ctrl">
                  <button type="button" aria-label="Smanji" onClick={() => adjustPantryQuantity(item.id, -1)}>
                    −
                  </button>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <button type="button" aria-label="Povećaj" onClick={() => adjustPantryQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="row" style={{ marginTop: '0.45rem' }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => startEdit(item.id)}>
                  Uredi
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => {
                    if (window.confirm(`Obrisati „${item.name}“ iz špajza?`)) {
                      deletePantryItem(item.id);
                    }
                  }}
                >
                  Obriši
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
