import { useState, type FormEvent } from 'react';
import { barcodeBars } from '../../lib/barcode';
import { fileToDataUrl } from '../../lib/aiParse';
import { useAppStore } from '../../store/useAppStore';

function BarcodeDisplay({ value }: { value: string }) {
  const bars = barcodeBars(value);
  return (
    <div className="loyalty-barcode" aria-label={`Barkod ${value}`}>
      <div className="loyalty-bars">
        {bars.map((w, i) => (
          <span
            key={i}
            style={{
              width: w * 2,
              background: i % 2 === 0 ? '#0f172a' : 'transparent',
            }}
          />
        ))}
      </div>
      <div className="loyalty-code-text">{value}</div>
    </div>
  );
}

export function LoyaltyCardsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = useAppStore((s) => s.loyaltyCards);
  const addLoyaltyCard = useAppStore((s) => s.addLoyaltyCard);
  const deleteLoyaltyCard = useAppStore((s) => s.deleteLoyaltyCard);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [number, setNumber] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!open) return null;

  const active = cards.find((c) => c.id === activeId);

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;
    addLoyaltyCard({
      name: name.trim(),
      storeBrand: brand.trim() || undefined,
      cardNumber: number.trim(),
      imageDataUrl: image,
    });
    setName('');
    setBrand('');
    setNumber('');
    setImage(undefined);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal loyalty-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loyalty-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="loyalty-title" style={{ margin: 0, fontSize: '1.15rem' }}>
            Kartice lojalnosti
          </h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Zatvori
          </button>
        </div>

        {active ? (
          <div className="stack loyalty-fullscreen">
            <strong style={{ fontSize: '1.2rem' }}>{active.name}</strong>
            {active.imageDataUrl ? (
              <img src={active.imageDataUrl} alt="Kartica" className="loyalty-img" />
            ) : (
              <BarcodeDisplay value={active.cardNumber} />
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setActiveId(null)}>
              Nazad na listu
            </button>
          </div>
        ) : (
          <>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Sačuvaj broj ili sliku kartice i prikaži barkod preko cijelog ekrana na kasi.
            </p>
            <div className="stack">
              {cards.map((c) => (
                <div key={c.id} className="store-card">
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{c.name}</strong>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {c.storeBrand ? `${c.storeBrand} · ` : ''}
                        {c.cardNumber}
                      </div>
                    </div>
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn-sm btn-action"
                        onClick={() => setActiveId(c.id)}
                      >
                        Prikaži
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          if (window.confirm(`Obrisati karticu „${c.name}“?`)) {
                            deleteLoyaltyCard(c.id);
                          }
                        }}
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!cards.length && <div className="muted">Još nema sačuvanih kartica.</div>}
            </div>

            <form className="form-grid" onSubmit={onAdd}>
              <div className="section-title">Nova kartica</div>
              <label className="label">
                Naziv
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="npr. Bingo klub"
                  required
                />
              </label>
              <label className="label">
                Lanac (opciono)
                <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <label className="label">
                Broj kartice / barkod
                <input
                  className="input"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                />
              </label>
              <label className="btn btn-sm btn-ghost file-btn" style={{ justifySelf: 'start' }}>
                Slika kartice (opciono)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void fileToDataUrl(f).then(setImage);
                  }}
                />
              </label>
              {image && <img src={image} alt="" className="receipt-thumb" />}
              <button type="submit" className="btn btn-action">
                Sačuvaj karticu
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
