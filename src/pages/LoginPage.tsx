import { useState, type FormEvent } from 'react';
import { isFirebaseConfigured } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

type Mode = 'login' | 'register' | 'reset';

export function LoginPage() {
  const loginEmail = useAppStore((s) => s.loginEmail);
  const registerEmail = useAppStore((s) => s.registerEmail);
  const loginGoogle = useAppStore((s) => s.loginGoogle);
  const sendPasswordReset = useAppStore((s) => s.sendPasswordReset);
  const continueAsDemo = useAppStore((s) => s.continueAsDemo);
  const authError = useAppStore((s) => s.authError);
  const clearAuthError = useAppStore((s) => s.clearAuthError);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const configured = isFirebaseConfigured();

  const switchMode = (m: Mode) => {
    clearAuthError();
    setInfo('');
    setMode(m);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setInfo('');
    clearAuthError();
    try {
      if (mode === 'login') {
        await loginEmail(email.trim(), password);
      } else if (mode === 'register') {
        await registerEmail(email.trim(), password, displayName.trim() || email.split('@')[0]);
      } else {
        await sendPasswordReset(email.trim());
        setInfo('Poslan je email za reset lozinke. Provjeri sanduče.');
      }
    } catch {
      /* authError set in store */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          Kupi<span>KM</span>
        </div>
        <p className="login-lead">
          Pametna šoping lista za BiH — poredi cijene po radnjama, arhiviraj račune i dijeli spisak
          s porodicom u realnom vremenu. Valuta: KM.
        </p>

        {!configured && (
          <div className="card" style={{ background: 'rgba(255,255,255,0.12)', border: 'none' }}>
            <p className="muted" style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>
              Firebase nije konfigurisan u ovom okruženju. Možeš nastaviti lokalno u demo režimu.
            </p>
          </div>
        )}

        <div className="chip-row" style={{ marginBottom: '0.25rem' }}>
          <button
            type="button"
            className={`chip${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Prijava
          </button>
          <button
            type="button"
            className={`chip${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Registracija
          </button>
          <button
            type="button"
            className={`chip${mode === 'reset' ? ' active' : ''}`}
            onClick={() => switchMode('reset')}
          >
            Reset lozinke
          </button>
        </div>

        <form className="form-grid" onSubmit={(e) => void onSubmit(e)}>
          {mode === 'register' && (
            <label className="label">
              Ime
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="npr. Ana"
                autoComplete="name"
              />
            </label>
          )}
          <label className="label">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {mode !== 'reset' && (
            <label className="label">
              Lozinka
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
          )}

          {authError && (
            <p style={{ margin: 0, color: 'var(--danger, #c0392b)', fontSize: '0.9rem' }}>
              {authError}
            </p>
          )}
          {info && <p className="muted" style={{ margin: 0 }}>{info}</p>}

          <button type="submit" className="btn btn-action" disabled={busy || (!configured && mode !== 'login')}>
            {busy
              ? 'Pričekaj…'
              : mode === 'login'
                ? 'Prijavi se'
                : mode === 'register'
                  ? 'Kreiraj nalog'
                  : 'Pošalji reset'}
          </button>
        </form>

        {configured && mode === 'login' && (
          <button
            type="button"
            className="btn"
            style={{ width: '100%' }}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void loginGoogle().finally(() => setBusy(false));
            }}
          >
            Nastavi s Google nalogom
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', color: 'inherit' }}
          onClick={continueAsDemo}
        >
          Isprobaj lokalno bez naloga
        </button>
      </div>
    </div>
  );
}
