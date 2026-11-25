import { useState, type FormEvent } from 'react';
import { PullUpdateButton } from '../components/layout/UpdateBanner';
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
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>AI ključ za skeniranje računa</h2>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Status:{' '}
          <strong style={{ color: settings.openAiApiKey ? 'var(--success)' : 'var(--danger)' }}>
            {settings.openAiApiKey ? 'Ključ je aktivan — skeniranje radi u fullu' : 'Ključ nije unesen'}
          </strong>
        </p>
        <ol className="muted" style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <li>
            Otvori{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
              platform.openai.com/api-keys
            </a>{' '}
            i prijavi se
          </li>
          <li>Klikni <strong>Create new secret key</strong>, kopiraj ključ (počinje sa <code>sk-</code>)</li>
          <li>Nalijepi ga ispod i klikni <strong>Sačuvaj ključ</strong></li>
          <li>
            Idi u <strong>Arhiva → Uslikaj / dodaj račun</strong> — AI izvlači artikle, cijene i radnju
          </li>
        </ol>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            setOpenAiKey(apiKey.trim());
            setMsg(
              apiKey.trim()
                ? 'API ključ sačuvan. Sada možeš uslikati račun u Arhivi.'
                : 'Ključ je obrisan.',
            );
          }}
        >
          <label className="label">
            OpenAI API ključ
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-... ili sk-..."
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn btn-action">
            Sačuvaj ključ
          </button>
        </form>
      </section>
    </div>
  );
}
