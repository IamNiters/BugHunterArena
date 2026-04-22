import { useEffect, useState } from 'react';
import { gameAPI, teamsAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import Scoreboard from '../components/Scoreboard';
import TechBadge from '../components/TechBadge';

export default function AdminPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { session, currentRound, scores, setSession, setCurrentRound, setScores } = useGameStore();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [maxRounds, setMaxRounds] = useState(10);
  const [questionType, setQuestionType] = useState('auto');

  // Formulaire ajout équipe
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#6366f1');
  const [showAddTeam, setShowAddTeam] = useState(false);

  useEffect(() => {
    loadData();
    const socket = getSocket();
    socket.emit('join:room', { role: 'admin' });
    socket.on('submission:mcq', ({ scores: s }) => s && setScores(s));
    socket.on('submission:code', ({ scores: s }) => s && setScores(s));
    return () => { socket.off('submission:mcq'); socket.off('submission:code'); };
  }, []);

  const loadData = async () => {
    const [sessionRes, teamsRes] = await Promise.all([gameAPI.getSession(), teamsAPI.getAll()]);
    setSession(sessionRes.data.session);
    setScores(sessionRes.data.scores || []);
    if (sessionRes.data.rounds?.length) {
      setCurrentRound(sessionRes.data.rounds[sessionRes.data.rounds.length - 1]);
    }
    setTeams(teamsRes.data);
  };

  const notify = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateSession = async () => {
    setLoading(true);
    try {
      await gameAPI.createSession(maxRounds);
      await loadData();
      notify('✅ Session créée avec succès');
    } catch (err) {
      notify('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleStartSession = async () => {
    setLoading(true);
    try {
      await gameAPI.startSession();
      await loadData();
      notify('▶ Session démarrée !');
    } catch (err) {
      notify('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleNextRound = async () => {
    setLoading(true);
    try {
      const type = questionType === 'auto' ? undefined : questionType;
      const res = await gameAPI.nextRound(type);
      setCurrentRound(res.data);
      await loadData();
      notify(`🎲 Round ${res.data.round_number} lancé — ${res.data.technology} (${res.data.question_type === 'mcq' ? 'QCM' : 'Code'})`);
      // Broadcast via socket
      const socket = getSocket();
      socket.emit('round:start', { round: res.data });
    } catch (err) {
      notify('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleFinishSession = async () => {
    if (!confirm('Terminer la session et mettre à jour les scores ?')) return;
    setLoading(true);
    try {
      await gameAPI.finishSession();
      await loadData();
      notify('🏁 Session terminée, scores mis à jour !');
    } catch (err) {
      notify('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleAddTeam = async () => {
    if (!newTeamName) return;
    try {
      await teamsAPI.create({ name: newTeamName, color: newTeamColor });
      setNewTeamName('');
      setShowAddTeam(false);
      await loadData();
      notify('✅ Équipe créée');
    } catch (err) {
      notify('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Supprimer cette équipe ?')) return;
    await teamsAPI.delete(teamId);
    await loadData();
    notify('🗑️ Équipe supprimée');
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl font-bold text-white">Panneau Administrateur</h1>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm">
            Déconnexion
          </button>
        </div>

        {/* Notification */}
        {message && (
          <div className="card border-indigo-500/50 bg-indigo-500/10 mb-4 text-center">
            <p className="text-indigo-300 font-medium">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contrôles de session */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">🎮 Contrôle de la session</h2>

              {/* Statut */}
              <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">Statut</div>
                  <div className={`font-semibold ${!session ? 'text-gray-400' : session.status === 'active' ? 'text-emerald-400' : session.status === 'waiting' ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {!session ? 'Aucune session' : session.status === 'active' ? '▶ En cours' : session.status === 'waiting' ? '⏳ En attente' : '🏁 Terminée'}
                  </div>
                </div>
                {session && (
                  <div>
                    <div className="text-xs text-gray-500">Rounds</div>
                    <div className="font-semibold text-white">{session.current_round} / {session.max_rounds}</div>
                  </div>
                )}
                {currentRound && (
                  <div>
                    <div className="text-xs text-gray-500">Round actuel</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TechBadge technology={currentRound.technology} />
                      <span className="text-xs text-gray-400">{currentRound.question_type === 'mcq' ? 'QCM' : 'Code'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* Créer session */}
                {(!session || session.status === 'finished') && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Nombre de rounds</label>
                      <input
                        type="number"
                        min={1} max={50}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleCreateSession} disabled={loading} className="btn-primary">
                        Créer session
                      </button>
                    </div>
                  </div>
                )}

                {/* Démarrer */}
                {session?.status === 'waiting' && (
                  <button onClick={handleStartSession} disabled={loading} className="btn-success w-full">
                    ▶ Démarrer la session
                  </button>
                )}

                {/* Prochain round */}
                {session?.status === 'active' && session.current_round < session.max_rounds && (
                  <div className="flex gap-3">
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="auto">Auto (alterné)</option>
                      <option value="mcq">Forcer QCM</option>
                      <option value="code">Forcer Code</option>
                    </select>
                    <button onClick={handleNextRound} disabled={loading} className="btn-primary flex-1">
                      🎲 Lancer le round suivant
                    </button>
                  </div>
                )}

                {/* Terminer */}
                {session?.status === 'active' && (
                  <button onClick={handleFinishSession} disabled={loading} className="btn-danger w-full">
                    🏁 Terminer la session
                  </button>
                )}
              </div>
            </div>

            {/* Gestion des équipes */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">👥 Équipes ({teams.length})</h2>
                <button onClick={() => setShowAddTeam(!showAddTeam)} className="btn-ghost text-sm">
                  + Ajouter
                </button>
              </div>

              {showAddTeam && (
                <div className="flex gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Nom de l'équipe"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="color"
                    value={newTeamColor}
                    onChange={(e) => setNewTeamColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <button onClick={handleAddTeam} className="btn-primary">Créer</button>
                </div>
              )}

              <div className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="flex-1 font-medium text-gray-200">{team.name}</span>
                    <span className="text-xs text-gray-500">{team.players?.length || 0} joueurs</span>
                    <button onClick={() => handleDeleteTeam(team.id)} className="text-rose-500 hover:text-rose-400 text-xs">
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Classement */}
          <div>
            <Scoreboard />
          </div>
        </div>
      </div>
    </div>
  );
}
