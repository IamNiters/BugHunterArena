import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { soloAPI } from '../services/api';

const TECH_LABELS = {
  javascript: { label: 'JavaScript', icon: '🟨', badge: 'badge-js' },
  php:        { label: 'PHP',        icon: '🐘', badge: 'badge-php' },
  cpp:        { label: 'C++',        icon: '⚙️',  badge: 'badge-cpp' },
  csharp:     { label: 'C#',         icon: '🔷', badge: 'badge-csharp' },
  mobile:     { label: 'Mobile',     icon: '📱', badge: 'badge-mobile' },
};

function getRank(score, maxScore) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 90) return { label: 'Bug Slayer', icon: '🏆', color: 'text-yellow-400' };
  if (pct >= 70) return { label: 'Bug Hunter', icon: '🥈', color: 'text-gray-300' };
  if (pct >= 50) return { label: 'Bug Finder', icon: '🥉', color: 'text-amber-600' };
  if (pct >= 30) return { label: 'Apprenti',   icon: '🎓', color: 'text-indigo-400' };
  return { label: 'Débutant', icon: '🐛', color: 'text-gray-500' };
}

export default function SoloResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    soloAPI.getSession(sessionId)
      .then((res) => { setSession(res.data); setLoading(false); })
      .catch(() => { setError('Session introuvable'); setLoading(false); });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐛</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <p className="text-rose-400 mb-4">{error || 'Session introuvable'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">Retour</button>
        </div>
      </div>
    );
  }

  const rounds = session.rounds || [];
  const submittedRounds = rounds.filter((r) => r.submitted);
  const correctCount = submittedRounds.filter((r) => r.is_correct).length;
  const totalRounds = session.config?.maxRounds || rounds.length;

  // Score max théorique (100 pts par MCQ, 400 pts par code)
  const maxScore = rounds.reduce((acc, r) => acc + (r.question_type === 'mcq' ? 100 : 400), 0) || totalRounds * 200;
  const rank = getRank(session.total_score, maxScore);

  const accuracy = submittedRounds.length > 0
    ? Math.round((correctCount / submittedRounds.length) * 100)
    : 0;

  const totalTime = rounds
    .filter((r) => r.started_at && r.finished_at)
    .reduce((acc, r) => acc + (new Date(r.finished_at) - new Date(r.started_at)), 0);
  const totalTimeSec = Math.round(totalTime / 1000);

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header résultats */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">{rank.icon}</div>
          <h1 className={`text-3xl font-bold mb-1 ${rank.color}`}>{rank.label}</h1>
          <p className="text-gray-400">
            Bien joué, <span className="text-white font-semibold">{session.player_name}</span> !
          </p>
        </div>

        {/* Score principal */}
        <div className="card text-center mb-6">
          <p className="text-gray-400 text-sm mb-1">Score final</p>
          <p className="text-5xl font-bold text-indigo-400 mb-1">{session.total_score}</p>
          <p className="text-gray-500 text-sm">points</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{correctCount}/{submittedRounds.length}</p>
            <p className="text-xs text-gray-500 mt-1">Bonnes réponses</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-emerald-400">{accuracy}%</p>
            <p className="text-xs text-gray-500 mt-1">Précision</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {totalTimeSec > 0
                ? totalTimeSec < 60
                  ? `${totalTimeSec}s`
                  : `${Math.floor(totalTimeSec / 60)}m${totalTimeSec % 60}s`
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Temps total</p>
          </div>
        </div>

        {/* Configuration utilisée */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Configuration de la partie</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Manches jouées</span>
            <span className="text-white">{submittedRounds.length} / {totalRounds}</span>
            <span className="text-gray-500">Langages</span>
            <span className="text-white">
              {session.config?.technologies?.length
                ? session.config.technologies.map((t) => TECH_LABELS[t]?.label || t).join(', ')
                : 'Tous'}
            </span>
            <span className="text-gray-500">Difficulté</span>
            <span className="text-white capitalize">{session.config?.difficulty || '—'}</span>
            <span className="text-gray-500">Types</span>
            <span className="text-white">
              {session.config?.questionTypes?.join(' + ').toUpperCase() || '—'}
            </span>
          </div>
        </div>

        {/* Détail des manches */}
        {rounds.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Détail des manches</h3>
            <div className="space-y-2">
              {rounds.map((round) => {
                const tech = TECH_LABELS[round.technology] || { icon: '❓', label: round.technology, badge: '' };
                const isCode = round.question_type === 'code';
                return (
                  <div
                    key={round.round_number}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      !round.submitted
                        ? 'border-gray-700 bg-gray-800/30 opacity-60'
                        : round.is_correct
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm font-mono w-6">#{round.round_number}</span>
                      <span className={`badge ${tech.badge}`}>{tech.icon} {tech.label}</span>
                      <span className="badge bg-gray-800 text-gray-400 border border-gray-700 text-xs">
                        {isCode ? '💻 Code' : '📋 QCM'}
                      </span>
                      {round.difficulty && (
                        <span className="text-xs text-gray-500 capitalize">{round.difficulty}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {isCode && round.submitted && (
                        <span className="text-gray-500 text-xs">
                          {round.tests_passed}/{round.tests_total} tests
                        </span>
                      )}
                      <span className={`font-semibold ${round.points_earned > 0 ? 'text-indigo-400' : 'text-gray-600'}`}>
                        +{round.points_earned || 0} pts
                      </span>
                      <span className="text-lg">
                        {!round.submitted ? '⏭️' : round.is_correct ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/solo/setup')}
            className="btn-primary flex-1 py-3"
          >
            🔄 Rejouer en solo
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-ghost flex-1 py-3"
          >
            🏠 Accueil
          </button>
        </div>
      </div>
    </div>
  );
}
