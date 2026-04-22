import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import SpectatorPage from './pages/SpectatorPage';
import TeamPage from './pages/TeamPage';
import PlayPage from './pages/PlayPage';
import SoloSetupPage from './pages/SoloSetupPage';
import SoloPlayPage from './pages/SoloPlayPage';
import SoloResultsPage from './pages/SoloResultsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Accueil / connexion */}
        <Route path="/" element={<LoginPage />} />

        {/* Mode multijoueur */}
        <Route path="/admin"     element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/spectator" element={<ProtectedRoute allowedRoles={['spectator', 'admin']}><SpectatorPage /></ProtectedRoute>} />
        <Route path="/team"      element={<ProtectedRoute allowedRoles={['team', 'admin']}><TeamPage /></ProtectedRoute>} />
        <Route path="/play"      element={<ProtectedRoute allowedRoles={['player', 'admin']}><PlayPage /></ProtectedRoute>} />

        {/* Mode solo (pas de protection JWT — session gérée côté serveur par ID) */}
        <Route path="/solo/setup"            element={<SoloSetupPage />} />
        <Route path="/solo/play/:sessionId"  element={<SoloPlayPage />} />
        <Route path="/solo/results/:sessionId" element={<SoloResultsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
