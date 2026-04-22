import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, teamsAPI } from '../services/api';
import { useAuthStore } from '../store/gameStore';

const ROLES = [
  { id: 'admin',     label: 'Administrateur', icon: '🛡️', desc: 'Gérer la session de jeu' },
  { id: 'team',      label: 'Équipe',          icon: '👥', desc: 'Vue équipe et scores' },
  { id: 'player',    label: 'Joueur',           icon: '💻', desc: 'Répondre aux questions' },
  { id: 'spectator', label: 'Spectateur',       icon: '👁️', desc: 'Suivre en direct' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [role, setRole]               = useState(null);
  const [password, setPassword]       = useState('');
  const [teamName, setTeamName]       = useState('');
  const [playerName, setPlayerName]   = useState('');
  const [teams, setTeams]             = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleRoleSelect = async (r) => {
    setRole(r);
    setError('');
    if (r === 'player') {
      const res = await teamsAPI.getAll();
      setTeams(res.data);
    }
    if (r === 'spectator') {
      handleLogin(r);
    }
  };

  const handleLogin = async (r = role) => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (r === 'admin') {
        res = await authAPI.loginAdmin(password);
        setAuth(res.data.token, 'admin', { id: 'admin' });
        navigate('/admin');
      } else if (r === 'team') {
        res = await authAPI.loginTeam(teamName);
        setAuth(res.data.token, 'team', res.data.team);
        navigate('/team');
      } else if (r === 'player') {
        res = await authAPI.loginPlayer(playerName, selectedTeam);
        setAuth(res.data.token, 'player', res.data.player);
        navigate('/play');
      } else if (r === 'spectator') {
        res = await authAPI.loginSpectator();
        setAuth(res.data.token, 'spectator', {});
        navigate('/spectator');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🐛</div>
          <h1 className="text-3xl font-bold text-white">Bug Hunter Arena</h1>
          <p className="text-gray-400 mt-1">Chasse les bugs, domine le classement</p>
        </div>

        {/* Sélection du mode / rôle */}
        {!role && (
          <div className="space-y-4">

            {/* Mode Solo — mis en avant */}
            <div className="card border-indigo-500/40 bg-indigo-500/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎮</span>
                  <div>
                    <h2 className="text-base font-bold text-white">Mode Solo</h2>
                    <p className="text-xs text-gray-400">Joue seul à ton rythme, configure tes manches</p>
                  </div>
                </div>
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">
                  Nouveau
                </span>
              </div>
              <button
                onClick={() => navigate('/solo/setup')}
                className="btn-primary w-full py-2.5"
              >
                🚀 Jouer en solo
              </button>
            </div>

            {/* Séparateur */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">ou rejoindre une session multijoueur</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Rôles multijoueur */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Mode Multijoueur</h2>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className="p-4 rounded-xl border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all text-left group"
                  >
                    <div className="text-2xl mb-1">{r.icon}</div>
                    <div className="font-semibold text-gray-200 group-hover:text-white text-sm">{r.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Formulaire Admin */}
        {role === 'admin' && (
          <div className="card">
            <button onClick={() => setRole(null)} className="text-gray-500 hover:text-gray-300 text-sm mb-4">← Retour</button>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">🛡️ Connexion Admin</h2>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-3"
            />
            {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
            <button onClick={() => handleLogin()} disabled={loading} className="btn-primary w-full">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        )}

        {/* Formulaire Équipe */}
        {role === 'team' && (
          <div className="card">
            <button onClick={() => setRole(null)} className="text-gray-500 hover:text-gray-300 text-sm mb-4">← Retour</button>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">👥 Connexion Équipe</h2>
            <input
              type="text"
              placeholder="Nom de l'équipe (ex: Team Alpha)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-3"
            />
            {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
            <button onClick={() => handleLogin()} disabled={loading || !teamName} className="btn-primary w-full">
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
          </div>
        )}

        {/* Formulaire Joueur */}
        {role === 'player' && (
          <div className="card">
            <button onClick={() => setRole(null)} className="text-gray-500 hover:text-gray-300 text-sm mb-4">← Retour</button>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">💻 Connexion Joueur</h2>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 mb-3"
            >
              <option value="">Sélectionnez votre équipe</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Votre prénom (ex: Alice)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-3"
            />
            {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
            <button onClick={() => handleLogin()} disabled={loading || !playerName || !selectedTeam} className="btn-primary w-full">
              {loading ? 'Connexion...' : 'Jouer'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
