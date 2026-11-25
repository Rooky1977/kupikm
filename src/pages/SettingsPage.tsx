import { useState, type FormEvent } from 'react';
import type { ThemeMode } from '../types';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const user = useAppStore((s) => s.user);
  const list = useAppStore((s) => s.list);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setTheme = useAppStore((s) => s.setTheme);
  const setOpenAiKey = useAppStore((s) => s.setOpenAiKey);
  const loginEmail = useAppStore((s) => s.loginEmail);
  const loginGoogle = useAppStore((s) => s.loginGoogle);
  const logout = useAppStore((s) => s.logout);
  const continueAsDemo = useAppStore((s) => s.continueAsDemo);
  const joinSharedList = useAppStore((s) => s.joinSharedList);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState(settings.openAiApiKey);
  const [shareCode, setShareCode] = useState('');
  const [msg, setMsg] = useState('');

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
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>AI ključ za parsiranje računa</h2>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          OpenAI-kompatibilan ključ omogućava automatsko čitanje slike ili teksta računa u Arhivi.
        </p>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            setOpenAiKey(apiKey.trim());
            setMsg('API ključ sačuvan lokalno.');
          }}
        >
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
          <button type="submit" className="btn btn-ghost">
            Sačuvaj ključ
          </button>
        </form>
      </section>
    </div>
  );
}
