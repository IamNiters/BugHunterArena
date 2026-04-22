import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import SpectatorPage from './pages/SpectatorPage';
import TeamPage from './pages/TeamPage';
import PlayPage from './pages/PlayPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/spectator" element={<ProtectedRoute allowedRoles={['spectator', 'admin']}><SpectatorPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute allowedRoles={['team', 'admin']}><TeamPage /></ProtectedRoute>} />
        <Route path="/play" element={<ProtectedRoute allowedRoles={['player', 'admin']}><PlayPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
