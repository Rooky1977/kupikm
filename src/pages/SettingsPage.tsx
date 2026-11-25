import { useState, type FormEvent } from 'react';
import { PullUpdateButton } from '../components/layout/UpdateBanner';
import { exportArchiveCsv, exportArchiveJson } from '../lib/exportData';
import type { AiProvider, ThemeMode } from '../types';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const user = useAppStore((s) => s.user);
  const list = useAppStore((s) => s.list);
  const archive = useAppStore((s) => s.archive);
  const receipts = useAppStore((s) => s.receipts);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAiSettings = useAppStore((s) => s.setAiSettings);
  const logout = useAppStore((s) => s.logout);
  const createFamily = useAppStore((s) => s.createFamily);
  const joinFamily = useAppStore((s) => s.joinFamily);

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey);
  const [provider, setProvider] = useState<AiProvider>(settings.aiProvider);
  const [shareCode, setShareCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const hasFreeKey = Boolean(settings.geminiApiKey || settings.groqApiKey);
  const familyCode = user?.familyCode || list.shareCode;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Podešavanja</h1>
          <p>
            {settings.useMockData || user?.provider === 'demo'
              ? 'Lokalni / demo režim'
              : 'Firebase povezan'}{' '}
            · status: {syncStatus}
          </p>
        </div>
      </div>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Aplikacija</h2>
        <p className="muted" style={{ margin: 0 }}>
          Ako na telefonu i dalje vidiš staru verziju, povuci novu i osvježi keš.
        </p>
        <PullUpdateButton />
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Tema</h2>
        <div className="chip-row">
          {(
            [
              ['light', 'Svijetla'],
              ['dark', 'Tamna'],
              ['system', 'Sistem'],
            ] as [ThemeMode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip${settings.theme === id ? ' active' : ''}`}
              onClick={() => setTheme(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Nalog</h2>
        {user && (
          <>
            <div className="row" style={{ gap: '0.75rem' }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="user-avatar" style={{ width: 48, height: 48 }} />
              ) : (
                <span className="user-avatar initials" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                  {(user.displayName || 'K')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join('')}
                </span>
              )}
              <div>
                <strong>{user.displayName}</strong>
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {user.email} · {user.provider === 'demo' ? 'demo' : user.provider}
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
              Odjavi se
            </button>
          </>
        )}
        {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Porodični prostor</h2>
        <p className="muted" style={{ margin: 0 }}>
          Članovi dijele isti spisak, arhivu računa, arhivu cijena i mjesečni budžet uživo.
        </p>
        <p style={{ margin: 0 }}>
          Trenutni kod: <strong style={{ fontFamily: 'var(--font-brand)', letterSpacing: '0.04em' }}>{familyCode}</strong>
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void createFamily()
                .then((code) => setMsg(`Novi porodični prostor kreiran: ${code}`))
                .catch((e) => setMsg(e instanceof Error ? e.message : 'Greška'))
                .finally(() => setBusy(false));
            }}
          >
            Kreiraj novi prostor
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(familyCode);
              setMsg('Kod kopiran u međuspremnik.');
            }}
          >
            Kopiraj kod
          </button>
        </div>
        <form
          className="form-row-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!shareCode.trim()) return;
            setBusy(true);
            void joinFamily(shareCode.trim())
              .then(() => setMsg(`Pridružen porodičnom prostoru ${shareCode.trim().toUpperCase()}.`))
              .catch((err) => setMsg(err instanceof Error ? err.message : 'Kod nije validan.'))
              .finally(() => setBusy(false));
          }}
        >
          <input
            className="input"
            value={shareCode}
            onChange={(e) => setShareCode(e.target.value)}
            placeholder="npr. KUPI-7X2M"
          />
          <button type="submit" className="btn btn-action" disabled={busy}>
            Pridruži se
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Izvoz podataka (Backup)</h2>
        <p className="muted" style={{ margin: 0 }}>
          Preuzmi sve račune i cijene na uređaj (CSV ili JSON).
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-action"
            onClick={() => {
              exportArchiveJson(archive, receipts);
              setMsg('JSON arhiva preuzeta.');
            }}
          >
            Izvezi arhivu (JSON)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              exportArchiveCsv(archive, receipts);
              setMsg('CSV arhiva preuzeta.');
            }}
          >
            Izvezi arhivu (CSV)
          </button>
        </div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Skeniranje računa</h2>
          <span className="badge badge-best">100% BESPLATNO</span>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Radi i <strong>bez ikakvog ključa</strong> preko lokalnog OCR-a (Tesseract) u pregledniku.
          Opciono možeš dodati besplatni Gemini ili Groq ključ za još bolje čitanje slike.
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Status:{' '}
          <strong style={{ color: 'var(--success)' }}>
            {hasFreeKey
              ? 'Lokalni OCR + besplatni AI ključ aktivan'
              : 'Lokalni OCR aktivan (bez ključa)'}
          </strong>
        </p>

        <label className="label">
          Način čitanja
          <select
            className="select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
          >
            <option value="auto">Automatski (Gemini → Groq → lokalni OCR)</option>
            <option value="gemini">Samo Google Gemini (besplatno)</option>
            <option value="groq">Samo Groq (besplatno)</option>
            <option value="tesseract">Samo lokalni OCR (bez ključa)</option>
          </select>
        </label>

        <label className="label">
          Google Gemini API ključ (opciono, besplatno)
          <input
            className="input"
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
          Besplatni ključ:{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            aistudio.google.com/apikey
          </a>
        </p>

        <label className="label">
          Groq API ključ (opciono, besplatno)
          <input
            className="input"
            type="password"
            value={groqKey}
            onChange={(e) => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            autoComplete="off"
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
          Besplatni ključ:{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
            console.groq.com/keys
          </a>
        </p>

        <button
          type="button"
          className="btn btn-action"
          onClick={() => {
            setAiSettings({
              aiProvider: provider,
              geminiApiKey: geminiKey.trim(),
              groqApiKey: groqKey.trim(),
            });
            setMsg('Podešavanja skeniranja sačuvana. Sve opcije su besplatne.');
          }}
        >
          Sačuvaj podešavanja skeniranja
        </button>
      </section>
    </div>
  );
}
