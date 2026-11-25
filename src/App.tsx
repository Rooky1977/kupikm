import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ArchivePage } from './pages/ArchivePage';
import { BudgetPage } from './pages/BudgetPage';
import { ListPage } from './pages/ListPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoresPage } from './pages/StoresPage';
import { useAppStore } from './store/useAppStore';

function AuthGate({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const bootstrapFirebase = useAppStore((s) => s.bootstrapFirebase);

  useEffect(() => {
    void bootstrapFirebase();
  }, [bootstrapFirebase]);

  if (!authReady) {
    return (
      <div className="login-screen">
        <div className="login-panel" style={{ textAlign: 'center' }}>
          <div className="login-brand">
            Kupi<span>KM</span>
          </div>
          <p className="muted" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Učitavam…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ListPage />} />
              <Route path="radnje" element={<StoresPage />} />
              <Route path="arhiva" element={<ArchivePage />} />
              <Route path="historija" element={<Navigate to="/arhiva" replace />} />
              <Route path="budzet" element={<BudgetPage />} />
              <Route path="podesavanja" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
