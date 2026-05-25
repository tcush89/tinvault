import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import CellarPage from './pages/CellarPage';
import AddTinPage from './pages/AddTinPage';
import EditTinPage from './pages/EditTinPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="cellar" element={<CellarPage />} />
            <Route path="add" element={<AddTinPage />} />
            <Route path="edit/:id" element={<EditTinPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
