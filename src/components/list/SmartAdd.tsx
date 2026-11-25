import { useMemo, useState, type FormEvent } from 'react';
import { searchSuggestions } from '../../lib/catalogSearch';
import { useAppStore } from '../../store/useAppStore';
import { CATEGORY_LABELS, UNIT_LABELS, type Category, type Unit } from '../../types';

export function SmartAdd() {
  const remembered = useAppStore((s) => s.remembered);
  const addFromSuggestion = useAppStore((s) => s.addFromSuggestion);
  const rememberCustomItem = useAppStore((s) => s.rememberCustomItem);

  const [query, setQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<Category>('ostalo');

  const suggestions = useMemo(
    () => searchSuggestions(query, remembered, 8),
    [query, remembered],
  );

  const addSuggestion = (label: string, u: Unit, cat: Category, qty: number, id?: string) => {
    addFromSuggestion({
      name: label,
      unit: u,
      category: cat,
      quantity: qty,
      catalogId: id,
    });
    setQuery('');
    setShowCustom(false);
  };

  const onCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    rememberCustomItem({ name: query.trim(), unit, category });
    setQuery('');
    setShowCustom(false);
  };

  return (
    <div className="card stack">
      <label className="label">
        Brzi unos namirnice
        <input
          className="input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowCustom(false);
          }}
          placeholder="npr. mlijeko, jaja, ulje…"
          autoComplete="off"
        />
      </label>

      {query.trim().length > 0 && (
        <div className="suggest-panel">
          {suggestions.map((s) => (
            <button
              key={`${s.source}-${s.id}`}
              type="button"
              className="chip"
              onClick={() => addSuggestion(s.label, s.unit, s.category, s.defaultQty, s.id)}
            >
              {s.label}
            </button>
          ))}
          <button type="button" className="chip active" onClick={() => setShowCustom(true)}>
            + Novi artikal „{query.trim()}”
          </button>
        </div>
      )}

      {showCustom && (
        <form className="form-grid" onSubmit={onCustom}>
          <div className="form-row-2">
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
          </div>
          <button type="submit" className="btn btn-action">
            Sačuvaj i dodaj na spisak
          </button>
        </form>
      )}
    </div>
  );
}
