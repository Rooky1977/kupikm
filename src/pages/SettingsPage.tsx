import { useState, type FormEvent } from 'react';
import { PullUpdateButton } from '../components/layout/UpdateBanner';
import type { AiProvider, ThemeMode } from '../types';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const user = useAppStore((s) => s.user);
  const list = useAppStore((s) => s.list);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAiSettings = useAppStore((s) => s.setAiSettings);
  const loginEmail = useAppStore((s) => s.loginEmail);
  const loginGoogle = useAppStore((s) => s.loginGoogle);
  const logout = useAppStore((s) => s.logout);
  const continueAsDemo = useAppStore((s) => s.continueAsDemo);
  const joinSharedList = useAppStore((s) => s.joinSharedList);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey);
  const [provider, setProvider] = useState<AiProvider>(settings.aiProvider);
  const [shareCode, setShareCode] = useState('');
  const [msg, setMsg] = useState('');

  const hasFreeKey = Boolean(settings.geminiApiKey || settings.groqApiKey);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Podešavanja</h1>
          <p>
            {settings.useMockData ? 'Lokalni / demo režim' : 'Firebase povezan'} · status: {syncStatus}
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
        {user ? (
          <>
            <p style={{ margin: 0 }}>
              {user.displayName} ({user.email}) · {user.provider}
            </p>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
                Odjavi se
              </button>
              <button type="button" className="btn btn-ghost" onClick={continueAsDemo}>
                Demo nalog
              </button>
            </div>
          </>
        ) : (
          <form
            className="form-grid"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void loginEmail(email, password).then(() => setMsg('Prijava uspješna / demo.'));
            }}
          >
            <label className="label">
              Email
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="label">
              Lozinka
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button type="submit" className="btn">
                Prijava
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void loginGoogle()}>
                Google
              </button>
            </div>
          </form>
        )}
        {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Dijeljeni spisak (uživo)</h2>
        <p className="muted" style={{ margin: 0 }}>
          Trenutni kod: <strong>{list.shareCode}</strong>
        </p>
        <form
          className="form-row-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (shareCode.trim()) void joinSharedList(shareCode.trim());
          }}
        >
          <input
            className="input"
            value={shareCode}
            onChange={(e) => setShareCode(e.target.value)}
            placeholder="npr. KUPI-7X2M"
          />
          <button type="submit" className="btn btn-action">
            Pridruži se
          </button>
        </form>
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
