import { useEffect, useState } from 'react';
import { gameAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuthStore, useGameStore } from '../store/gameStore';
import Scoreboard from '../components/Scoreboard';
import TechBadge from '../components/TechBadge';

export default function TeamPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { session, currentRound, scores, setSession, setCurrentRound, setScores } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [myScore, setMyScore] = useState(0);

  useEffect(() => {
    gameAPI.getSession().then((res) => {
      setSession(res.data.session);
      setScores(res.data.scores || []);
      if (res.data.rounds?.length) {
        setCurrentRound(res.data.rounds[res.data.rounds.length - 1]);
      }
      setLoading(false);
    });

    const socket = getSocket();
    socket.emit('join:room', { role: 'team', teamId: user?.id });

    socket.on('round:start', ({ round }) => setCurrentRound(round));
    socket.on('submission:mcq', ({ scores: s }) => { if (s) setScores(s); });
    socket.on('submission:code', ({ scores: s }) => { if (s) setScores(s); });

    return () => {
      socket.off('round:start');
      socket.off('submission:mcq');
      socket.off('submission:code');
    };
  }, []);

  useEffect(() => {
    const teamScore = scores.find((s) => s.id === user?.id);
    if (teamScore) setMyScore(teamScore.score);
  }, [scores, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header équipe */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: user?.color || '#6366f1' }}
              >
                {user?.name?.[0] || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
                <p className="text-gray-400 text-sm">Vue Équipe</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums" style={{ color: user?.color || '#6366f1' }}>
                {myScore.toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">points</div>
            </div>
          </div>
        </div>

        {/* Round actuel */}
        {currentRound && (
          <div className="card mb-6 border-indigo-500/30 bg-indigo-500/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Round en cours</div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">#{currentRound.round_number}</span>
                  <TechBadge technology={currentRound.technology} size="lg" />
                  <span className={`badge ${currentRound.question_type === 'mcq' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-violet-500/20 text-violet-400 border-violet-500/30'}`}>
                    {currentRound.question_type === 'mcq' ? '📝 QCM' : '💻 Code IDE'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Session</div>
                <div className="text-gray-300 font-medium">
                  {session?.current_round}/{session?.max_rounds} rounds
                </div>
              </div>
            </div>
          </div>
        )}

        {!session && (
          <div className="card mb-6 text-center py-12">
            <div className="text-5xl mb-3">⏳</div>
            <p className="text-gray-400">En attente du démarrage de la partie...</p>
          </div>
        )}

        {/* Classement */}
        <Scoreboard />
      </div>
    </div>
  );
}
