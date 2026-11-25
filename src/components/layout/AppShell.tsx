import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { CartHeader } from './CartHeader';
import { IconBudget, IconHistory, IconList, IconSettings, IconStore } from './Icons';
import { CartConfirmModal } from '../list/CartConfirmModal';

const links = [
  { to: '/', label: 'Spisak', icon: <IconList />, end: true },
  { to: '/radnje', label: 'Radnje', icon: <IconStore /> },
  { to: '/historija', label: 'Historija', icon: <IconHistory /> },
  { to: '/budzet', label: 'Budžet', icon: <IconBudget /> },
];

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function AppShell() {
  const theme = useAppStore((s) => s.settings.theme);
  const user = useAppStore((s) => s.user);
  const bootstrapFirebase = useAppStore((s) => s.bootstrapFirebase);
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    void bootstrapFirebase();
  }, [bootstrapFirebase]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              Kupi<span>KM</span>
            </div>
            <div className="row">
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {user?.displayName ?? 'Gost'}
              </span>
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
          <CartHeader />
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
