import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';
import {
  describeScanMethod,
  fileToDataUrl,
  parseReceiptImage,
  parseReceiptText,
  toReceiptItems,
} from '../lib/aiParse';
import { suggestCatalogMatch, topCatalogSuggestions } from '../lib/aliases';
import { findDedupSuggestions } from '../lib/dedup';
import { formatDateTime, formatKm, normalizeItemKey } from '../lib/format';
import { isSuperPrice, itemStats } from '../lib/scoring';
import { analyzeReceiptVsEstimate } from '../lib/tripAnalysis';
import { useAppStore } from '../store/useAppStore';
import type { Category, ReceiptItem, Unit } from '../types';
import { UNIT_LABELS } from '../types';

interface DraftLine extends ReceiptItem {
  rawName: string;
  mapped: boolean;
}

export function ArchivePage() {
  const archive = useAppStore((s) => s.archive);
  const receipts = useAppStore((s) => s.receipts);
  const stores = useAppStore((s) => s.stores);
  const settings = useAppStore((s) => s.settings);
  const aliases = useAppStore((s) => s.aliases);
  const remembered = useAppStore((s) => s.remembered);
  const historyItemKey = useAppStore((s) => s.historyItemKey);
  const setHistoryItemKey = useAppStore((s) => s.setHistoryItemKey);
  const saveReceipt = useAppStore((s) => s.saveReceipt);
  const deleteReceipt = useAppStore((s) => s.deleteReceipt);
  const updateReceiptItem = useAppStore((s) => s.updateReceiptItem);
  const deleteReceiptItem = useAppStore((s) => s.deleteReceiptItem);
  const updateArchiveEntry = useAppStore((s) => s.updateArchiveEntry);
  const deleteArchiveEntryById = useAppStore((s) => s.deleteArchiveEntryById);
  const renameArchiveItem = useAppStore((s) => s.renameArchiveItem);
  const deleteArchiveItemGroup = useAppStore((s) => s.deleteArchiveItemGroup);
  const renameRememberedItem = useAppStore((s) => s.renameRememberedItem);
  const deleteRememberedItem = useAppStore((s) => s.deleteRememberedItem);
  const saveAlias = useAppStore((s) => s.saveAlias);
  const addAllFromReceipt = useAppStore((s) => s.addAllFromReceipt);
  const setReceiptExtraordinary = useAppStore((s) => s.setReceiptExtraordinary);
  const pantry = useAppStore((s) => s.pantry);

  const [tab, setTab] = useState<'racuni' | 'artikli' | 'katalog'>('racuni');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState(
    'Mlijeko 1L (tetrapak) ........ 1.99\nULJE FLORIOL 1L PET ........ 3.89\nVoda 1.5L ........ 0.79',
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [draftItems, setDraftItems] = useState<DraftLine[]>([]);
  const [total, setTotal] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [confirmDeleteReceipt, setConfirmDeleteReceipt] = useState(false);
  const [editArchiveId, setEditArchiveId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [renameName, setRenameName] = useState('');
  const [editReceiptIdx, setEditReceiptIdx] = useState<number | null>(null);
  const [editRcptPrice, setEditRcptPrice] = useState('');
  const [editRcptQty, setEditRcptQty] = useState('');
  const [receiptExtraordinary, setReceiptExtraordinaryDraft] = useState(false);
  const [receiptPage, setReceiptPage] = useState(0);
  const [articlePage, setArticlePage] = useState(0);
  const PAGE_SIZE = 20;

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; key: string; count: number; min: number; max: number; last: string; lastPrice: number }
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
          lastPrice: a.unitPrice,
        });
      } else {
        existing.count += 1;
        existing.min = Math.min(existing.min, a.unitPrice);
        existing.max = Math.max(existing.max, a.unitPrice);
        if (a.recordedAt > existing.last) {
          existing.last = a.recordedAt;
          existing.name = a.itemName;
          existing.lastPrice = a.unitPrice;
        }
      }
    }
    let rows = [...map.values()];
    const q = normalizeItemKey(query);
    if (q) rows = rows.filter((r) => normalizeItemKey(r.name).includes(q));
    return rows.sort((a, b) => b.last.localeCompare(a.last));
  }, [archive, query]);

  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => b.date.localeCompare(a.date)),
    [receipts],
  );
  const receiptPages = Math.max(1, Math.ceil(sortedReceipts.length / PAGE_SIZE));
  const pagedReceipts = sortedReceipts.slice(
    receiptPage * PAGE_SIZE,
    receiptPage * PAGE_SIZE + PAGE_SIZE,
  );
  const articlePages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pagedArticles = grouped.slice(articlePage * PAGE_SIZE, articlePage * PAGE_SIZE + PAGE_SIZE);

  const detail = historyItemKey
    ? archive
        .filter((a) => a.itemKey === historyItemKey)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    : [];
  const stats = historyItemKey ? itemStats(archive, historyItemKey) : null;
  const receiptDetail = receipts.find((r) => r.id === selectedReceipt);

  const mapParsedToDraft = (items: ReceiptItem[]): DraftLine[] =>
    items.map((it) => {
      const match = suggestCatalogMatch(it.name, aliases);
      const mapped = match.fromAlias || match.confidence >= 40;
      return {
        ...it,
        rawName: it.name,
        name: mapped ? match.suggestedName : it.name,
        category: mapped ? match.category : it.category,
        unit: mapped ? match.unit : it.unit,
        mapped,
      };
    });

  const applyParsed = (items: ReceiptItem[], parsedTotal?: number, storeName?: string) => {
    setDraftItems(mapParsedToDraft(items));
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
      const parsed = await parseReceiptImage(
        dataUrl,
        {
          aiProvider: settings.aiProvider,
          geminiApiKey: settings.geminiApiKey,
          groqApiKey: settings.groqApiKey,
        },
        (progressMsg) => setMsg(progressMsg),
      );
      applyParsed(toReceiptItems(parsed.items), parsed.total, parsed.storeName);
      if (parsed.date) {
        try {
          setDate(parsed.date.slice(0, 10));
        } catch {
          /* ignore */
        }
      }
      setMsg(
        parsed.items.length
          ? `Izvučeno ${parsed.items.length} stavki preko: ${describeScanMethod(parsed.method)}. Provjeri povezivanje sa katalogom.`
          : 'Nisu pronađene stavke — dodaj ih ručno ispod (i dalje je besplatno).',
      );
    } catch {
      setMsg('Greška pri čitanju slike. Dodaj stavke ručno.');
    } finally {
      setBusy(false);
    }
  };

  const onParseText = async () => {
    setBusy(true);
    try {
      const parsed = await parseReceiptText(text, {
        aiProvider: settings.aiProvider,
        geminiApiKey: settings.geminiApiKey,
        groqApiKey: settings.groqApiKey,
      });
      applyParsed(toReceiptItems(parsed.items), parsed.total, parsed.storeName);
      setMsg(
        `Pronađeno ${parsed.items.length} stavki (${describeScanMethod(parsed.method)}). Poveži sa katalogom po potrebi.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const applyCatalogChoice = (
    idx: number,
    choice: { label: string; unit: Unit; category: Category; id?: string } | 'new',
  ) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const line = next[idx];
      if (!line) return prev;
      if (choice === 'new') {
        next[idx] = { ...line, mapped: true, name: line.rawName };
        void saveAlias({
          rawName: line.rawName,
          catalogName: line.rawName,
          category: line.category,
          unit: line.unit,
        });
        return next;
      }
      next[idx] = {
        ...line,
        name: choice.label,
        unit: choice.unit,
        category: choice.category,
        mapped: true,
      };
      void saveAlias({
        rawName: line.rawName,
        catalogName: choice.label,
        catalogId: choice.id,
        category: choice.category,
        unit: choice.unit,
      });
      return next;
    });
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    let items: ReceiptItem[] = draftItems.map(({ rawName: _r, mapped: _m, ...rest }) => rest);
    if (!items.length && text.trim()) {
      items = mapParsedToDraft(
        toReceiptItems(
          (
            await parseReceiptText(text, {
              aiProvider: settings.aiProvider,
              geminiApiKey: settings.geminiApiKey,
              groqApiKey: settings.groqApiKey,
            })
          ).items,
        ),
      ).map(({ rawName: _r, mapped: _m, ...rest }) => rest);
    }
    if (!items.length) {
      setMsg('Dodaj barem jednu stavku prije spremanja.');
      return;
    }
    for (const d of draftItems) {
      if (d.rawName && d.name && normalizeItemKey(d.rawName) !== normalizeItemKey(d.name)) {
        await saveAlias({
          rawName: d.rawName,
          catalogName: d.name,
          category: d.category,
          unit: d.unit,
        });
      }
    }
    const totalNum =
      Number(total.replace(',', '.')) || items.reduce((s, i) => s + i.lineTotal, 0);
    const variance = analyzeReceiptVsEstimate(items, archive, store.id, totalNum);
    await saveReceipt({
      storeId: store.id,
      storeName: store.name,
      date: new Date(date).toISOString(),
      items,
      total: totalNum,
      imageDataUrl,
      source: imageDataUrl ? 'ai' : 'manual',
      isExtraordinary: receiptExtraordinary,
    });
    setShowAdd(false);
    setDraftItems([]);
    setImageDataUrl(undefined);
    setReceiptExtraordinaryDraft(false);
    const drivers =
      variance.topDrivers.length > 0
        ? ` Najveći uticaj: ${variance.topDrivers
            .map((d) => `${d.name} (${d.delta > 0 ? '+' : ''}${d.delta.toFixed(2)} KM)`)
            .join(', ')}.`
        : '';
    setMsg(
      `Račun sačuvan. Procjena ${variance.estimatedTotal.toFixed(2)} KM · stvarno ${variance.actualTotal.toFixed(2)} KM · razlika ${variance.delta > 0 ? '+' : ''}${variance.delta.toFixed(2)} KM.${drivers}`,
    );
    setTab('racuni');
  };

  const addManualLine = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        rawName: 'Novi artikal',
        name: 'Novi artikal',
        quantity: 1,
        unit: 'kom' as Unit,
        unitPrice: 0,
        lineTotal: 0,
        category: 'ostalo',
        mapped: true,
      },
    ]);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Arhiva</h1>
          <p>Računi, historija cijena i katalog · skeniranje je besplatno</p>
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
        <button
          type="button"
          className={`chip${tab === 'katalog' ? ' active' : ''}`}
          onClick={() => setTab('katalog')}
        >
          Moj katalog
        </button>
      </div>

      {msg && !showAdd && (
        <div className="card muted" style={{ marginBottom: '0.85rem' }}>
          {msg}
        </div>
      )}

      {showAdd && (
        <form className="card form-grid" style={{ marginBottom: '0.85rem' }} onSubmit={(e) => void onSave(e)}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Novi račun</h2>
              <span className="badge badge-best">100% BESPLATNO</span>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowAdd(false)}>
              Zatvori
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            Uslikaj račun — čita se lokalno (Tesseract) ili preko besplatnog Gemini/Groq ključa.
            Skraćeni nazivi sa fiskalnog računa se automatski povezuju s katalogom (alias mapper).
          </p>

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
              {busy ? 'Čitam račun…' : 'Uslikaj / izaberi sliku'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onParseText()}>
              Parsiraj tekst
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={addManualLine}>
              + Ručna stavka
            </button>
          </div>

          {imageDataUrl && (
            <img src={imageDataUrl} alt="Pregled računa" className="receipt-thumb" style={{ width: 120, height: 120 }} />
          )}

          <label className="label">
            Tekst sa računa (opciono)
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </label>

          <div className="stack">
            <div className="section-title">Stavke · povezivanje sa katalogom</div>
            {!draftItems.length && (
              <p className="muted" style={{ margin: 0 }}>
                Još nema izvučenih stavki. Uslikaj račun ili dodaj ručno.
              </p>
            )}
            {draftItems.map((it, idx) => {
              const suggestions = topCatalogSuggestions(it.rawName, 6);
              const nearDupes = findDedupSuggestions(it.name || it.rawName, {
                archive,
                remembered,
                pantry,
                limit: 3,
              });
              return (
                <div key={idx} className="store-card stack" style={{ gap: '0.45rem' }}>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Sa računa: <code>{it.rawName}</code>
                    {it.mapped && <span className="badge badge-best" style={{ marginLeft: 8 }}>Povezano</span>}
                  </div>
                  {nearDupes.length > 0 && !it.mapped && (
                    <div className="chip-row">
                      {nearDupes.map((d) => (
                        <button
                          key={d.name}
                          type="button"
                          className="chip active"
                          onClick={() =>
                            applyCatalogChoice(idx, {
                              label: d.name,
                              unit: d.unit,
                              category: d.category,
                              id: d.catalogId,
                            })
                          }
                        >
                          Veži: {d.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="form-row-2">
                    <input
                      className="input"
                      value={it.name}
                      aria-label="Naziv artikla"
                      onChange={(e) => {
                        const next = [...draftItems];
                        next[idx] = { ...it, name: e.target.value, mapped: true };
                        setDraftItems(next);
                      }}
                    />
                    <div className="row">
                      <input
                        className="input"
                        inputMode="decimal"
                        style={{ maxWidth: 90 }}
                        aria-label="Količina"
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
                        aria-label="Cijena KM"
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
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        aria-label="Ukloni stavku"
                        onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <label className="label" style={{ margin: 0 }}>
                    Predlozi iz kataloga
                    <select
                      className="select"
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (v === '__new') applyCatalogChoice(idx, 'new');
                        else {
                          const hit = suggestions.find((s) => s.id === v);
                          if (hit) {
                            applyCatalogChoice(idx, {
                              id: hit.id,
                              label: hit.label,
                              unit: hit.unit,
                              category: hit.category,
                            });
                          }
                        }
                      }}
                    >
                      <option value="">Izaberi artikal iz kataloga…</option>
                      {suggestions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({s.score}%)
                        </option>
                      ))}
                      <option value="__new">+ Kreiraj novi: {it.rawName}</option>
                    </select>
                  </label>
                </div>
              );
            })}
          </div>

          <label className="label">
            Ukupan iznos (KM)
            <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
          </label>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={receiptExtraordinary}
              onChange={(e) => setReceiptExtraordinaryDraft(e.target.checked)}
            />
            <span>Vanredni trošak (ne ulazi u mjesečni budžet)</span>
          </label>

          {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}

          <button type="submit" className="btn btn-action" disabled={busy}>
            Sačuvaj u arhivu računa i artikala
          </button>
        </form>
      )}

      {tab === 'racuni' && (
        <div className="desktop-layout">
          <section className="stack">
            {pagedReceipts.map((r) => (
              <button
                key={r.id}
                type="button"
                className="store-card"
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedReceipt(r.id);
                  setConfirmDeleteReceipt(false);
                  setEditReceiptIdx(null);
                }}
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
                        {r.isExtraordinary ? ' · vanredni' : ''}
                      </div>
                    </div>
                  </div>
                  <strong>{formatKm(r.total)}</strong>
                </div>
              </button>
            ))}
            {!receipts.length && <div className="card muted">Nema sačuvanih računa.</div>}
            {receipts.length > PAGE_SIZE && (
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={receiptPage <= 0}
                  onClick={() => setReceiptPage((p) => p - 1)}
                >
                  ← Prethodna
                </button>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {receiptPage + 1} / {receiptPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={receiptPage >= receiptPages - 1}
                  onClick={() => setReceiptPage((p) => p + 1)}
                >
                  Sljedeća →
                </button>
              </div>
            )}
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
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-action"
                    onClick={() => {
                      const n = addAllFromReceipt(receiptDetail.id);
                      setMsg(
                        n > 0
                          ? `Dodano ${n} artikala sa računa na spisak.`
                          : 'Svi artikli sa računa su već na spisku.',
                      );
                    }}
                  >
                    Dodaj sve na spisak
                  </button>
                  <label className="switch-row" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(receiptDetail.isExtraordinary)}
                      onChange={(e) => {
                        setReceiptExtraordinary(receiptDetail.id, e.target.checked);
                        setMsg(
                          e.target.checked
                            ? 'Račun označen kao vanredni trošak (isključen iz budžeta).'
                            : 'Račun ponovo ulazi u mjesečni budžet.',
                        );
                      }}
                    />
                    <span>Vanredni trošak</span>
                  </label>
                </div>
                {receiptDetail.imageDataUrl && (
                  <img
                    src={receiptDetail.imageDataUrl}
                    alt="Račun"
                    style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                )}
                {receiptDetail.items.map((it, i) => (
                  <div key={i} className="store-card">
                    {editReceiptIdx === i ? (
                      <div className="stack" style={{ gap: '0.4rem' }}>
                        <div className="row">
                          <input
                            className="input"
                            inputMode="decimal"
                            style={{ maxWidth: 100 }}
                            value={editRcptQty}
                            onChange={(e) => setEditRcptQty(e.target.value)}
                            aria-label="Količina"
                          />
                          <input
                            className="input"
                            inputMode="decimal"
                            style={{ maxWidth: 110 }}
                            value={editRcptPrice}
                            onChange={(e) => setEditRcptPrice(e.target.value)}
                            aria-label="Cijena KM"
                          />
                        </div>
                        <div className="row">
                          <button
                            type="button"
                            className="btn btn-sm btn-action"
                            onClick={() => {
                              void updateReceiptItem(receiptDetail.id, i, {
                                quantity: Number(editRcptQty.replace(',', '.')) || it.quantity,
                                unitPrice: Number(editRcptPrice.replace(',', '.')) || it.unitPrice,
                              });
                              setEditReceiptIdx(null);
                              setMsg('Stavka računa ažurirana. Budžet je preračunat.');
                            }}
                          >
                            Sačuvaj
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditReceiptIdx(null)}
                          >
                            Otkaži
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{it.name}</div>
                          <div className="muted" style={{ fontSize: '0.85rem' }}>
                            {it.quantity} {it.unit} × {formatKm(it.unitPrice)}
                          </div>
                        </div>
                        <div className="stack" style={{ alignItems: 'flex-end', gap: '0.25rem' }}>
                          <strong>{formatKm(it.lineTotal)}</strong>
                          <div className="row">
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              aria-label="Uredi stavku"
                              onClick={() => {
                                setEditReceiptIdx(i);
                                setEditRcptPrice(String(it.unitPrice));
                                setEditRcptQty(String(it.quantity));
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              aria-label="Obriši stavku"
                              onClick={() => {
                                if (window.confirm(`Obrisati stavku „${it.name}“ sa računa?`)) {
                                  void deleteReceiptItem(receiptDetail.id, i);
                                  setMsg('Stavka obrisana. Budžet je preračunat.');
                                }
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {!confirmDeleteReceipt ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--danger, #c0392b)' }}
                    onClick={() => setConfirmDeleteReceipt(true)}
                  >
                    Obriši cijeli račun
                  </button>
                ) : (
                  <div className="card stack" style={{ background: 'rgba(192,57,43,0.08)' }}>
                    <p style={{ margin: 0 }}>
                      Obrisati račun iz {receiptDetail.storeName} ({formatKm(receiptDetail.total)})?
                      Ovo uklanja i povezane cijene iz arhive i ažurira budžet.
                    </p>
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn-action"
                        onClick={() => {
                          void deleteReceipt(receiptDetail.id);
                          setSelectedReceipt(null);
                          setConfirmDeleteReceipt(false);
                          setMsg('Račun obrisan. Mjesečna potrošnja je ažurirana.');
                        }}
                      >
                        Da, obriši
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmDeleteReceipt(false)}
                      >
                        Otkaži
                      </button>
                    </div>
                  </div>
                )}
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
            {pagedArticles.map((g) => {
              const superDeal = isSuperPrice(archive, g.name, g.lastPrice);
              return (
                <button
                  key={g.key}
                  type="button"
                  className="store-card"
                  style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
                  onClick={() => {
                    setHistoryItemKey(g.key);
                    setRenameName(g.name);
                    setEditArchiveId(null);
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{g.name}</strong>
                    <div className="row">
                      {superDeal && <span className="badge badge-super">Super cijena</span>}
                      <span className="badge">{g.count}×</span>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {formatKm(g.min)} – {formatKm(g.max)} · zadnje {formatDateTime(g.last)}
                  </div>
                </button>
              );
            })}
            {grouped.length > PAGE_SIZE && (
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={articlePage <= 0}
                  onClick={() => setArticlePage((p) => p - 1)}
                >
                  ← Prethodna
                </button>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {articlePage + 1} / {articlePages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={articlePage >= articlePages - 1}
                  onClick={() => setArticlePage((p) => p + 1)}
                >
                  Sljedeća →
                </button>
              </div>
            )}
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
            {historyItemKey && (
              <div className="stack" style={{ gap: '0.4rem' }}>
                <label className="label">
                  Preimenuj artikal
                  <div className="row">
                    <input
                      className="input"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        void renameArchiveItem(historyItemKey, renameName);
                        setMsg('Artikal preimenovan.');
                      }}
                    >
                      Sačuvaj
                    </button>
                  </div>
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--danger, #c0392b)' }}
                  onClick={() => {
                    if (window.confirm('Obrisati sve zapise cijena za ovaj artikal?')) {
                      void deleteArchiveItemGroup(historyItemKey);
                      setMsg('Artikal i svi zapisi cijena su obrisani.');
                    }
                  }}
                >
                  Obriši artikal iz arhive
                </button>
              </div>
            )}
            {!detail.length && <p className="muted">Odaberi artikal.</p>}
            {detail.map((a) => {
              const isLow = stats && a.unitPrice === stats.min;
              const superDeal = isSuperPrice(archive, a.itemName, a.unitPrice);
              return (
                <div key={a.id} className={`store-card${isLow ? ' best' : ''}`}>
                  {editArchiveId === a.id ? (
                    <div className="stack" style={{ gap: '0.4rem' }}>
                      <div className="row">
                        <input
                          className="input"
                          inputMode="decimal"
                          style={{ maxWidth: 110 }}
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          aria-label="Cijena KM"
                        />
                        <input
                          className="input"
                          inputMode="decimal"
                          style={{ maxWidth: 90 }}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          aria-label="Količina"
                        />
                      </div>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-sm btn-action"
                          onClick={() => {
                            void updateArchiveEntry(a.id, {
                              unitPrice: Number(editPrice.replace(',', '.')) || a.unitPrice,
                              quantity: Number(editQty.replace(',', '.')) || a.quantity,
                            });
                            setEditArchiveId(null);
                            setMsg('Cijena ažurirana. Statistika je preračunata.');
                          }}
                        >
                          Sačuvaj
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditArchiveId(null)}
                        >
                          Otkaži
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>{formatKm(a.unitPrice)}</strong>
                        <div className="row">
                          {superDeal && <span className="badge badge-super">Super cijena</span>}
                          {isLow && <span className="badge badge-action">Najjeftinije</span>}
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            aria-label="Uredi cijenu"
                            onClick={() => {
                              setEditArchiveId(a.id);
                              setEditPrice(String(a.unitPrice));
                              setEditQty(String(a.quantity));
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            aria-label="Obriši unos"
                            onClick={() => {
                              if (window.confirm('Obrisati ovaj unos cijene?')) {
                                void deleteArchiveEntryById(a.id);
                                setMsg('Unos obrisan. Statistika je preračunata.');
                              }
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {a.storeName} · {a.quantity} {a.unit} · {formatDateTime(a.recordedAt)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </aside>
        </div>
      )}

      {tab === 'katalog' && (
        <section className="stack">
          <p className="muted" style={{ margin: 0 }}>
            Ručno dodani artikli koje možeš preimenovati ili obrisati.
          </p>
          {!remembered.length && <div className="card muted">Nema ručno dodanih artikala.</div>}
          {remembered.map((r) => (
            <div key={r.id} className="store-card">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <strong>{r.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {r.unit} · {UNIT_LABELS.includes(r.unit) ? r.unit : r.unit}
                  </div>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      const name = window.prompt('Novo ime artikla', r.name);
                      if (name?.trim()) renameRememberedItem(r.id, name.trim());
                    }}
                  >
                    Preimenuj
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--danger, #c0392b)' }}
                    onClick={() => {
                      if (window.confirm(`Obrisati „${r.name}“ iz kataloga?`)) {
                        deleteRememberedItem(r.id);
                      }
                    }}
                  >
                    Obriši
                  </button>
                </div>
              </div>
            </div>
          ))}
          {aliases.length > 0 && (
            <>
              <div className="section-title">Zapamćeni aliasi (fiskalni nazivi)</div>
              {aliases.map((a) => (
                <div key={a.id} className="card" style={{ fontSize: '0.9rem' }}>
                  <code>{a.rawName}</code> → <strong>{a.catalogName}</strong>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
