import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';
import {
  fileToDataUrl,
  parseReceiptImage,
  parseReceiptText,
  toReceiptItems,
} from '../lib/aiParse';
import { formatDateTime, formatKm, normalizeItemKey } from '../lib/format';
import { itemStats } from '../lib/scoring';
import { useAppStore } from '../store/useAppStore';
import type { ReceiptItem, Unit } from '../types';

export function ArchivePage() {
  const archive = useAppStore((s) => s.archive);
  const receipts = useAppStore((s) => s.receipts);
  const stores = useAppStore((s) => s.stores);
  const settings = useAppStore((s) => s.settings);
  const historyItemKey = useAppStore((s) => s.historyItemKey);
  const setHistoryItemKey = useAppStore((s) => s.setHistoryItemKey);
  const saveReceipt = useAppStore((s) => s.saveReceipt);

  const [tab, setTab] = useState<'racuni' | 'artikli'>('racuni');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState(
    'Mlijeko 1L (tetrapak) ........ 1.99\nUlje Floriol 1L ........ 3.89\nVoda 1.5L ........ 0.79',
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [draftItems, setDraftItems] = useState<ReceiptItem[]>([]);
  const [total, setTotal] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; key: string; count: number; min: number; max: number; last: string }
    >();
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
  const stats = historyItemKey ? itemStats(archive, historyItemKey) : null;
  const receiptDetail = receipts.find((r) => r.id === selectedReceipt);

  const applyParsed = (items: ReceiptItem[], parsedTotal?: number, storeName?: string) => {
    setDraftItems(items);
    if (parsedTotal != null) setTotal(String(parsedTotal));
    else if (items.length) {
      setTotal(String(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)));
    }
    if (storeName) {
      const match = stores.find(
        (s) =>
          normalizeItemKey(s.name).includes(normalizeItemKey(storeName)) ||
          normalizeItemKey(s.brand).includes(normalizeItemKey(storeName)),
      );
      if (match) setStoreId(match.id);
    }
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMsg('Učitavam sliku…');
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      if (settings.openAiApiKey) {
        setMsg('AI parsira račun…');
        const parsed = await parseReceiptImage(dataUrl, settings.openAiApiKey);
        applyParsed(toReceiptItems(parsed.items), parsed.total, parsed.storeName);
        setMsg(
          parsed.items.length
            ? `AI je našao ${parsed.items.length} stavki. Provjeri i sačuvaj.`
            : 'AI nije našao stavke — unesi ručno ili nalijepi tekst.',
        );
      } else {
        setMsg('Slika dodana. Unesi API ključ u Podešavanjima za automatsko parsiranje, ili dopuni stavke ručno.');
      }
    } catch {
      setMsg('Greška pri učitavanju slike.');
    } finally {
      setBusy(false);
    }
  };

  const onParseText = async () => {
    setBusy(true);
    try {
      const parsed = await parseReceiptText(text, settings.openAiApiKey || undefined);
      applyParsed(toReceiptItems(parsed.items), parsed.total, parsed.storeName);
      setMsg(`Pronađeno ${parsed.items.length} stavki.`);
    } finally {
      setBusy(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    const items =
      draftItems.length > 0
        ? draftItems
        : toReceiptItems(
            (await parseReceiptText(text)).items,
          );
    const totalNum = Number(total.replace(',', '.')) || items.reduce((s, i) => s + i.lineTotal, 0);
    await saveReceipt({
      storeId: store.id,
      storeName: store.name,
      date: new Date(date).toISOString(),
      items,
      total: totalNum,
      imageDataUrl,
      source: imageDataUrl ? (settings.openAiApiKey ? 'ai' : 'camera') : 'manual',
    });
    setShowAdd(false);
    setDraftItems([]);
    setImageDataUrl(undefined);
    setMsg('Račun sačuvan u arhivu. Stavke su ažurirale historiju cijena.');
    setTab('racuni');
  };

  const addManualLine = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        name: 'Novi artikal',
        quantity: 1,
        unit: 'kom' as Unit,
        unitPrice: 0,
        lineTotal: 0,
        category: 'ostalo',
      },
    ]);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Arhiva</h1>
          <p>Računi i historija cijena artikala</p>
        </div>
        <button type="button" className="btn btn-action" onClick={() => setShowAdd(true)}>
          Uslikaj / dodaj račun
        </button>
      </div>

      <div className="chip-row" style={{ marginBottom: '0.85rem' }}>
        <button
          type="button"
          className={`chip${tab === 'racuni' ? ' active' : ''}`}
          onClick={() => setTab('racuni')}
        >
          Arhiva računa
        </button>
        <button
          type="button"
          className={`chip${tab === 'artikli' ? ' active' : ''}`}
          onClick={() => setTab('artikli')}
        >
          Arhiva artikala
        </button>
      </div>

      {msg && !showAdd && (
        <div className="card muted" style={{ marginBottom: '0.85rem' }}>
          {msg}
        </div>
      )}

      {showAdd && (
        <form className="card form-grid" style={{ marginBottom: '0.85rem' }} onSubmit={(e) => void onSave(e)}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Novi račun</h2>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowAdd(false)}>
              Zatvori
            </button>
          </div>

          <div className="form-row-2">
            <label className="label">
              Radnja
              <select className="select" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Datum
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="btn btn-action file-btn" style={{ margin: 0 }}>
              Uslikaj / izaberi sliku
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onParseText()}>
              Parsiraj tekst
            </button>
          </div>

          {imageDataUrl && (
            <img src={imageDataUrl} alt="Pregled računa" className="receipt-thumb" style={{ width: 120, height: 120 }} />
          )}

          <label className="label">
            Tekst sa računa (ili dopuna)
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </label>

          {draftItems.length > 0 && (
            <div className="stack">
              <div className="section-title">Stavke</div>
              {draftItems.map((it, idx) => (
                <div key={idx} className="form-row-2">
                  <input
                    className="input"
                    value={it.name}
                    onChange={(e) => {
                      const next = [...draftItems];
                      next[idx] = { ...it, name: e.target.value };
                      setDraftItems(next);
                    }}
                  />
                  <div className="row">
                    <input
                      className="input"
                      inputMode="decimal"
                      style={{ maxWidth: 90 }}
                      value={String(it.quantity)}
                      onChange={(e) => {
                        const q = Number(e.target.value.replace(',', '.')) || 1;
                        const next = [...draftItems];
                        next[idx] = {
                          ...it,
                          quantity: q,
                          lineTotal: Math.round(it.unitPrice * q * 100) / 100,
                        };
                        setDraftItems(next);
                      }}
                    />
                    <input
                      className="input"
                      inputMode="decimal"
                      value={String(it.unitPrice)}
                      onChange={(e) => {
                        const p = Number(e.target.value.replace(',', '.')) || 0;
                        const next = [...draftItems];
                        next[idx] = {
                          ...it,
                          unitPrice: p,
                          lineTotal: Math.round(p * it.quantity * 100) / 100,
                        };
                        setDraftItems(next);
                      }}
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" onClick={addManualLine}>
                + Stavka
              </button>
            </div>
          )}

          <label className="label">
            Ukupan iznos (KM)
            <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
          </label>

          {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}

          <button type="submit" className="btn btn-action" disabled={busy}>
            Sačuvaj račun
          </button>
        </form>
      )}

      {tab === 'racuni' && (
        <div className="desktop-layout">
          <section className="stack">
            {receipts.map((r) => (
              <button
                key={r.id}
                type="button"
                className="store-card"
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
                onClick={() => setSelectedReceipt(r.id)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row">
                    {r.imageDataUrl && (
                      <img src={r.imageDataUrl} alt="" className="receipt-thumb" />
                    )}
                    <div>
                      <strong>{r.storeName}</strong>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {format(new Date(r.date), 'd. MMMM yyyy.', { locale: bs })} · {r.items.length} stavki
                      </div>
                    </div>
                  </div>
                  <strong>{formatKm(r.total)}</strong>
                </div>
              </button>
            ))}
            {!receipts.length && <div className="card muted">Nema sačuvanih računa.</div>}
          </section>
          <aside className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
              {receiptDetail ? receiptDetail.storeName : 'Detalj računa'}
            </h2>
            {!receiptDetail && <p className="muted">Odaberi račun za pregled stavki.</p>}
            {receiptDetail && (
              <>
                <div className="muted">
                  {formatDateTime(receiptDetail.date)} · {formatKm(receiptDetail.total)}
                </div>
                {receiptDetail.imageDataUrl && (
                  <img
                    src={receiptDetail.imageDataUrl}
                    alt="Račun"
                    style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                )}
                {receiptDetail.items.map((it, i) => (
                  <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>
                      {it.name} ({it.quantity} {it.unit})
                    </span>
                    <strong>{formatKm(it.lineTotal)}</strong>
                  </div>
                ))}
              </>
            )}
          </aside>
        </div>
      )}

      {tab === 'artikli' && (
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
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
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
          </section>
          <aside className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
              {detail[0]?.itemName ?? 'Kretanje cijene'}
            </h2>
            {stats && (
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="stat">
                  <span className="muted">Najniža</span>
                  <strong style={{ fontSize: '1rem' }}>{formatKm(stats.min)}</strong>
                </div>
                <div className="stat">
                  <span className="muted">Prosjek</span>
                  <strong style={{ fontSize: '1rem' }}>{formatKm(stats.avg)}</strong>
                </div>
                <div className="stat">
                  <span className="muted">Najviša</span>
                  <strong style={{ fontSize: '1rem' }}>{formatKm(stats.max)}</strong>
                </div>
              </div>
            )}
            {!detail.length && <p className="muted">Odaberi artikal.</p>}
            {detail.map((a) => {
              const isLow = stats && a.unitPrice === stats.min;
              return (
                <div key={a.id} className={`store-card${isLow ? ' best' : ''}`}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{formatKm(a.unitPrice)}</strong>
                    {isLow && <span className="badge badge-action">Najjeftinije</span>}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {a.storeName} · {formatDateTime(a.recordedAt)}
                  </div>
                </div>
              );
            })}
          </aside>
        </div>
      )}
    </div>
  );
}
