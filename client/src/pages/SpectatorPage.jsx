import { useEffect, useState } from 'react';
import { gameAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import Scoreboard from '../components/Scoreboard';
import TechBadge from '../components/TechBadge';

export default function SpectatorPage() {
  const { session, currentRound, scores, setSession, setCurrentRound, setScores } = useGameStore();
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger l'état initial
    gameAPI.getSession().then((res) => {
      setSession(res.data.session);
      setScores(res.data.scores || []);
      if (res.data.rounds?.length) {
        setCurrentRound(res.data.rounds[res.data.rounds.length - 1]);
      }
      setLoading(false);
    });

    // Écouter les événements temps réel
    const socket = getSocket();
    socket.emit('join:room', { role: 'spectator' });

    socket.on('round:start', ({ round }) => {
      setCurrentRound(round);
      addEvent(`🎲 Nouveau round : technologie ${round.technology.toUpperCase()} — type ${round.question_type === 'mcq' ? 'QCM' : 'Code'}`);
    });

    socket.on('submission:mcq', ({ teamId, isCorrect, pointsEarned, scores: newScores }) => {
      if (newScores) setScores(newScores);
      if (isCorrect) addEvent(`✅ Une équipe a répondu correctement (+${pointsEarned} pts)`);
    });

    socket.on('submission:code', ({ isCorrect, testsPassed, testsTotal, pointsEarned, scores: newScores }) => {
      if (newScores) setScores(newScores);
      addEvent(`💻 Soumission de code : ${testsPassed}/${testsTotal} tests passés${isCorrect ? ` ✅ (+${pointsEarned} pts)` : ' ❌'}`);
    });

    socket.on('game:end', ({ finalScores }) => {
      setScores(finalScores);
      addEvent('🏁 La partie est terminée !');
    });

    return () => {
      socket.off('round:start');
      socket.off('submission:mcq');
      socket.off('submission:code');
      socket.off('game:end');
    };
  }, []);

  const addEvent = (msg) => {
    setRecentEvents((prev) => [{ msg, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐛</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Bug Hunter Arena</h1>
              <p className="text-gray-400 text-sm">Vue Spectateur — Temps réel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">En direct</span>
          </div>
        </div>

        {/* Session info */}
        {session && (
          <div className="card mb-6 flex flex-wrap gap-6 items-center">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Statut</div>
              <div className={`font-semibold mt-0.5 ${session.status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {session.status === 'active' ? '▶ En cours' : session.status === 'waiting' ? '⏳ En attente' : '🏁 Terminée'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Round</div>
              <div className="font-semibold text-white mt-0.5">{session.current_round} / {session.max_rounds}</div>
            </div>
            {currentRound && (
              <>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Technologie</div>
                  <div className="mt-0.5"><TechBadge technology={currentRound.technology} size="lg" /></div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Type</div>
                  <div className="font-semibold text-white mt-0.5">
                    {currentRound.question_type === 'mcq' ? '📝 QCM' : '💻 Code IDE'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!session && (
          <div className="card mb-6 text-center py-12">
            <div className="text-5xl mb-3">⏳</div>
            <p className="text-gray-400">Aucune session active. En attente du démarrage...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classement */}
          <div className="lg:col-span-2">
            <Scoreboard />
          </div>

          {/* Flux d'événements */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📡 Événements récents
            </h2>
            {recentEvents.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">En attente d'événements...</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((ev, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-gray-600 flex-shrink-0 tabular-nums">{ev.time}</span>
                    <span className="text-gray-300">{ev.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
