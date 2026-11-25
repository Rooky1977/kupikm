import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { isBarcodeDetectorSupported, openBarcodeCamera, scanBarcodeFromVideo } from '../../lib/barcode';
import { searchSuggestions } from '../../lib/catalogSearch';
import { findDedupSuggestions } from '../../lib/dedup';
import { parseVoiceItems } from '../../lib/frequentItems';
import { formatKm } from '../../lib/format';
import { findPantryMatch, pantryWarningText } from '../../lib/pantry';
import { isVoiceSupported, startVoiceCapture } from '../../lib/voiceInput';
import { useAppStore } from '../../store/useAppStore';
import { CATEGORY_LABELS, UNIT_LABELS, type Category, type Unit } from '../../types';

export function SmartAdd() {
  const remembered = useAppStore((s) => s.remembered);
  const archive = useAppStore((s) => s.archive);
  const pantry = useAppStore((s) => s.pantry);
  const addFromSuggestion = useAppStore((s) => s.addFromSuggestion);
  const addManyByNames = useAppStore((s) => s.addManyByNames);
  const rememberCustomItem = useAppStore((s) => s.rememberCustomItem);
  const findByBarcode = useAppStore((s) => s.findByBarcode);
  const getLastPrice = useAppStore((s) => s.getLastPrice);
  const setUiError = useAppStore((s) => s.setUiError);

  const [query, setQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<Category>('ostalo');
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [voiceMsg, setVoiceMsg] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const stopRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggestions = useMemo(
    () => searchSuggestions(query, remembered, 12),
    [query, remembered],
  );

  const dedup = useMemo(
    () =>
      query.trim().length >= 2
        ? findDedupSuggestions(query.trim(), { archive, remembered, pantry, limit: 4 })
        : [],
    [query, archive, remembered, pantry],
  );

  const pantryHit = useMemo(
    () => (query.trim() ? findPantryMatch(pantry, query.trim()) : undefined),
    [query, pantry],
  );

  useEffect(() => {
    return () => {
      stopRef.current?.();
      abortRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const addSuggestion = (
    label: string,
    u: Unit,
    cat: Category,
    qty: number,
    id?: string,
    barcode?: string,
  ) => {
    addFromSuggestion({
      name: label,
      unit: u,
      category: cat,
      quantity: qty,
      catalogId: id,
      barcode,
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

  const toggleVoice = () => {
    if (listening) {
      stopRef.current?.();
      stopRef.current = null;
      setListening(false);
      setPartial('');
      return;
    }
    if (!isVoiceSupported()) {
      setUiError('Glasovni unos nije podržan. Koristi Chrome/Edge na Androidu ili desktopu.');
      return;
    }
    setVoiceMsg('');
    const handle = startVoiceCapture({
      onPartial: setPartial,
      onFinal: (text) => {
        const names = parseVoiceItems(text);
        const n = addManyByNames(names);
        setVoiceMsg(
          n > 0
            ? `Dodano ${n} namirnica: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '…' : ''}`
            : `Prepoznato, ali već na spisku: ${text}`,
        );
      },
      onError: (message) => {
        setUiError(message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (handle) {
      stopRef.current = handle.stop;
      setListening(true);
    }
  };

  const closeScan = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanOpen(false);
  };

  const handleBarcodeValue = (code: string) => {
    const hit = findByBarcode(code);
    if (hit.listItem) {
      setScanMsg(`Već na spisku: ${hit.listItem.name}`);
      closeScan();
      return;
    }
    if (hit.remembered) {
      addFromSuggestion({
        name: hit.remembered.name,
        unit: hit.remembered.unit,
        category: hit.remembered.category,
        barcode: code,
      });
      setScanMsg(`Dodano: ${hit.remembered.name}`);
      closeScan();
      return;
    }
    if (hit.archiveName) {
      addFromSuggestion({
        name: hit.archiveName,
        unit: 'kom',
        category: 'ostalo',
        barcode: code,
      });
      setScanMsg(`Dodano iz arhive: ${hit.archiveName}`);
      closeScan();
      return;
    }
    const name = window.prompt(`Novi artikal za barkod ${code}. Unesi naziv:`, query || '');
    if (!name?.trim()) {
      setScanMsg('Barkod nije povezan — otkazano.');
      return;
    }
    rememberCustomItem({ name: name.trim(), unit: 'kom', category: 'ostalo', barcode: code });
    setScanMsg(`Sačuvan barkod za „${name.trim()}”.`);
    closeScan();
  };

  const startScan = async () => {
    setScanOpen(true);
    setScanMsg('');
    setManualBarcode('');
    if (!isBarcodeDetectorSupported()) {
      setScanMsg('Automatsko skeniranje nije dostupno — unesi barkod ručno.');
      return;
    }
    const stream = await openBarcodeCamera();
    if (!stream) {
      setScanMsg('Kamera nije dostupna — unesi barkod ručno.');
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play();
    abortRef.current = new AbortController();
    const code = await scanBarcodeFromVideo(video, abortRef.current.signal);
    if (code) handleBarcodeValue(code);
  };

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
        <label className="label" style={{ flex: 1, minWidth: 180, margin: 0 }}>
          Brzi unos namirnice
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowCustom(false);
            }}
            placeholder="npr. floriol, marlboro, mlijeko…"
            autoComplete="off"
          />
        </label>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <button
            type="button"
            className={`btn btn-sm${listening ? ' btn-action' : ' btn-ghost'}`}
            onClick={toggleVoice}
            title="Glasovni unos"
          >
            {listening ? '⏹ Stop' : '🎤 Glas'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => void startScan()}
            title="Skeniraj barkod"
          >
            📷 Barkod
          </button>
        </div>
      </div>

      {pantryHit && (
        <div className="pantry-note">
          Već imaš u špajzu: <strong>{pantryWarningText(pantryHit)}</strong>
        </div>
      )}

      {dedup.length > 0 && (
        <div className="stack" style={{ gap: '0.35rem' }}>
          <div className="muted" style={{ fontSize: '0.82rem' }}>
            Sličan artikal već postoji — poveži umjesto duplikata:
          </div>
          <div className="chip-row">
            {dedup.map((d) => (
              <button
                key={`${d.source}-${d.name}`}
                type="button"
                className="chip active"
                onClick={() => addSuggestion(d.name, d.unit, d.category, 1, d.catalogId)}
              >
                {d.name}
                <small>
                  {d.source} · {d.score}%
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {listening && (
        <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
          Slušam… reci više namirnica (npr. „mlijeko, hljeb i ulje”). {partial && <em>{partial}</em>}
        </p>
      )}
      {voiceMsg && <p className="muted" style={{ margin: 0 }}>{voiceMsg}</p>}
      {scanMsg && <p className="muted" style={{ margin: 0 }}>{scanMsg}</p>}

      {scanOpen && (
        <div className="stack" style={{ gap: '0.5rem' }}>
          {isBarcodeDetectorSupported() && (
            <video ref={videoRef} className="barcode-video" muted playsInline />
          )}
          <form
            className="form-row-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualBarcode.trim()) handleBarcodeValue(manualBarcode.trim());
            }}
          >
            <input
              className="input"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Ručni unos barkoda"
              inputMode="numeric"
            />
            <div className="row">
              <button type="submit" className="btn btn-sm btn-action">
                Dodaj
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={closeScan}>
                Zatvori
              </button>
            </div>
          </form>
        </div>
      )}

      {query.trim().length > 0 && (
        <div className="suggest-panel">
          {suggestions.map((s) => {
            const last = getLastPrice(s.label);
            const stock = findPantryMatch(pantry, s.label);
            return (
              <button
                key={`${s.source}-${s.id}`}
                type="button"
                className="chip"
                onClick={() => addSuggestion(s.label, s.unit, s.category, s.defaultQty, s.id)}
              >
                {s.label}
                {last && (
                  <small>
                    {formatKm(last.unitPrice)} · {last.storeName}
                  </small>
                )}
                {stock && <small>špajz: {stock.quantity} {stock.unit}</small>}
              </button>
            );
          })}
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
