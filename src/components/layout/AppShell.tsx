import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  IconBudget,
  IconHistory,
  IconList,
  IconPantry,
  IconSettings,
  IconStore,
} from './Icons';
import { PullUpdateButton, UpdateBanner } from './UpdateBanner';
import { CartConfirmModal } from '../list/CartConfirmModal';
import { UndoToast } from './UndoToast';
import { CirkaStrip } from './CirkaStrip';

const MOSTAR_HERO =
  'https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1600&q=80';

const links = [
  { to: '/', label: 'Početna', icon: <IconList />, end: true },
  { to: '/radnje', label: 'Radnje', icon: <IconStore /> },
  { to: '/arhiva', label: 'Moje kupovine', icon: <IconHistory /> },
  { to: '/spajz', label: 'Špajz', icon: <IconPantry /> },
  { to: '/budzet', label: 'Budžet', icon: <IconBudget />, badge: true },
  { to: '/podesavanja', label: 'Postavke', icon: <IconSettings /> },
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

export function AppShell() {
  const theme = useAppStore((s) => s.settings.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const user = useAppStore((s) => s.user);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setOnline = useAppStore((s) => s.setOnline);
  const getCirka = useAppStore((s) => s.getCirka);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [promoOpen, setPromoOpen] = useState(true);
  const [query, setQuery] = useState('');
  const cirka = getCirka();
  const warnCount = cirka.budgetPct >= 80 ? 3 : 0;
  const isHome = location.pathname === '/';
  const darkOn = theme === 'dark' || theme === 'system';

  useEffect(() => {
    applyTheme(theme === 'light' ? 'light' : 'dark');
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate('/', { state: { focusAdd: query.trim() } });
    setQuery('');
  };

  return (
    <div className="cyber-shell">
      <aside className="cyber-sidebar" aria-label="Glavna navigacija">
        <div className="cyber-logo">
          <div className="cyber-logo-mark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 7h15l-1.5 9h-12z" strokeLinejoin="round" />
              <circle cx="9" cy="19" r="1.2" fill="currentColor" />
              <circle cx="17" cy="19" r="1.2" fill="currentColor" />
              <path d="M6 7 5 3H2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <strong>
              Kupi<span style={{ color: 'var(--cyber-green)' }}>KM</span>
            </strong>
            <span>Pametno kupuj. Brzo plaćaj.</span>
          </div>
        </div>

        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `cyber-nav-link${isActive ? ' active' : ''}`}
          >
            {l.icon}
            {l.label}
            {l.badge && warnCount > 0 ? <span className="cyber-badge-count">{warnCount}</span> : null}
          </NavLink>
        ))}

        <div className="cyber-theme-row">
          <div className="row" style={{ gap: '0.45rem' }}>
            <span aria-hidden>{darkOn ? '🌙' : '☀️'}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {theme === 'light' ? 'Svijetla' : 'Tamna'}
            </span>
          </div>
          <button
            type="button"
            className={`cyber-toggle${theme === 'light' ? '' : ' on'}`}
            aria-label="Prekidač teme"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <span />
          </button>
        </div>
      </aside>

      <div className="cyber-main-wrap">
        <header className="cyber-topbar">
          <form className="cyber-search" onSubmit={onSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraži proizvode, usluge…"
              aria-label="Pretraga"
            />
            <kbd>Ctrl + K</kbd>
          </form>

          <div className="cyber-top-actions">
            <PullUpdateButton compact />
            <span className={`sync-pill sync-${syncStatus}`}>{syncStatus}</span>
            <div className="user-chip" title={user?.email}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="user-avatar" />
              ) : (
                <span className="user-avatar initials">{initials(user?.displayName || 'K')}</span>
              )}
              <span className="user-meta">
                <strong>{user?.displayName ?? 'Korisnik'}</strong>
                <small>
                  {user?.provider === 'demo' ? 'Demo korisnik' : 'Premium korisnik'}
                </small>
              </span>
            </div>
            <button
              type="button"
              className="settings-fab"
              aria-label="Obavještenja"
              onClick={() => navigate('/budzet')}
            >
              <span style={{ position: 'relative' }}>
                🔔
                {warnCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: '#ff5c7a',
                    }}
                  />
                )}
              </span>
            </button>
          </div>
        </header>

        <div className="cyber-content">
          <UpdateBanner />

          {isHome && (
            <section className="cyber-hero">
              <img
                src={MOSTAR_HERO}
                alt="Stari most u Mostaru noću"
                loading="eager"
              />
              <div className="cyber-hero-overlay">
                <div>
                  <h2>KupiKM — Sve što vam treba, na jednom mjestu!</h2>
                  <button
                    type="button"
                    className="btn btn-action"
                    onClick={() => searchRef.current?.focus()}
                  >
                    Počni kupovinu &gt;
                  </button>
                </div>
                <div className="cyber-hero-stats">
                  <div className="cyber-hero-stat">
                    <i>🛡</i>
                    Sigurna kupovina
                  </div>
                  <div className="cyber-hero-stat">
                    <i>⚡</i>
                    Brza isporuka
                  </div>
                  <div className="cyber-hero-stat">
                    <i>🎧</i>
                    Podrška 24/7
                  </div>
                </div>
              </div>
            </section>
          )}

          {!isHome && (
            <div style={{ marginBottom: '0.85rem' }}>
              <CirkaStrip />
            </div>
          )}

          <Outlet />

          <div className="cyber-footer-trust">
            <div className="cyber-trust-card">
              <span aria-hidden>⚡</span>
              Brza i pouzdana kupovina
            </div>
            <div className="cyber-trust-card">
              <span aria-hidden>🔒</span>
              Vaši podaci su sigurni
            </div>
            <div className="cyber-trust-card">
              <span aria-hidden>🎧</span>
              Podrška 24/7
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Mobilna navigacija">
        {links.slice(0, 5).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.icon}
            {l.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      {promoOpen && (
        <a
          className="cyber-promo"
          href="#spisak"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
            setPromoOpen(false);
          }}
        >
          <span aria-hidden>🎁</span>
          <span>Pametniji način kupovine! Uštedi vrijeme i kupuj jednostavno.</span>
          <button
            type="button"
            className="cyber-promo-btn"
            aria-label="Zatvori"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPromoOpen(false);
            }}
          >
            →
          </button>
        </a>
      )}

      <CartConfirmModal />
      <UndoToast />
    </div>
  );
}
