import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { formatKm } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import { CirkaStrip } from './CirkaStrip';
import { IconBudget, IconHistory, IconList, IconSettings, IconStore } from './Icons';
import { PullUpdateButton, UpdateBanner } from './UpdateBanner';
import { CartConfirmModal } from '../list/CartConfirmModal';

const links = [
  { to: '/', label: 'Spisak', icon: <IconList />, end: true },
  { to: '/radnje', label: 'Radnje', icon: <IconStore /> },
  { to: '/arhiva', label: 'Arhiva', icon: <IconHistory /> },
  { to: '/budzet', label: 'Budžet', icon: <IconBudget /> },
];

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const syncLabel: Record<string, string> = {
  online: 'Sinhronizovano',
  offline: 'Offline',
  sync: 'Sinhronizacija…',
  local: 'Lokalno',
};

export function AppShell() {
  const theme = useAppStore((s) => s.settings.theme);
  const user = useAppStore((s) => s.user);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const logout = useAppStore((s) => s.logout);
  const setOnline = useAppStore((s) => s.setOnline);
  const getCirka = useAppStore((s) => s.getCirka);
  const budgetAmount = useAppStore((s) => s.budgetAmount);
  const navigate = useNavigate();
  const cirka = getCirka();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setOnline]);

  const pct = Math.min(100, cirka.budgetPct);
  const progressClass =
    pct >= 100 ? 'progress over' : pct >= 80 ? 'progress warn' : 'progress';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              Kupi<span>KM</span>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.45rem' }}>
              <PullUpdateButton compact />
              <span className={`sync-pill sync-${syncStatus}`} title={syncLabel[syncStatus]}>
                {syncLabel[syncStatus] ?? syncStatus}
              </span>
              <div className="user-chip" title={user?.email}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="user-avatar" />
                ) : (
                  <span className="user-avatar initials">{initials(user?.displayName || 'K')}</span>
                )}
                <span className="user-meta">
                  <strong>{user?.displayName ?? 'Gost'}</strong>
                  <small>{user?.email || user?.provider}</small>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => void logout()}
              >
                Odjava
              </button>
              <button
                type="button"
                className="settings-fab"
                aria-label="Podešavanja"
                onClick={() => navigate('/podesavanja')}
              >
                <IconSettings />
              </button>
            </div>
          </div>
          <UpdateBanner />
          <CirkaStrip />
        </div>
      </header>

      <nav className="side-nav" aria-label="Glavna navigacija">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.icon}
            {l.label}
          </NavLink>
        ))}
        <div className="budget-card-side">
          <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            MJESEČNI BUDŽET
          </div>
          <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 800, fontSize: '1.15rem' }}>
            {formatKm(cirka.budgetRemaining)} preostalo
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0 0.45rem' }}>
            od {formatKm(budgetAmount)} · {pct.toFixed(0)}%
          </div>
          <div className={progressClass}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Mobilna navigacija">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.icon}
            {l.label}
          </NavLink>
        ))}
      </nav>

      <CartConfirmModal />
    </div>
  );
}
