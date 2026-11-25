import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ArchivePage } from './pages/ArchivePage';
import { BudgetPage } from './pages/BudgetPage';
import { ListPage } from './pages/ListPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoresPage } from './pages/StoresPage';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
