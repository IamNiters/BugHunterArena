import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { soloAPI } from '../services/api';
import MCQQuestion from '../components/MCQQuestion';
import CodeQuestion from '../components/CodeQuestion';

const TECH_LABELS = {
  javascript: { label: 'JavaScript', icon: '🟨', badge: 'badge-js' },
  php:        { label: 'PHP',        icon: '🐘', badge: 'badge-php' },
  cpp:        { label: 'C++',        icon: '⚙️',  badge: 'badge-cpp' },
  csharp:     { label: 'C#',         icon: '🔷', badge: 'badge-csharp' },
  mobile:     { label: 'Mobile',     icon: '📱', badge: 'badge-mobile' },
};

const DIFF_COLORS = {
  easy:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard:   'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

export default function SoloPlayPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession]           = useState(null);
  const [currentRound, setCurrentRound] = useState(null);  // { roundNumber, questionType, technology, question, totalRounds }
  const [submitted, setSubmitted]       = useState(false);
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [phase, setPhase]               = useState('loading'); // 'loading' | 'playing' | 'between' | 'finished'

  // Charger la session au montage
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await soloAPI.getSession(sessionId);
      setSession(res.data);
      if (res.data.status === 'finished') {
        navigate(`/solo/results/${sessionId}`, { replace: true });
      } else {
        setPhase('between');
        setLoading(false);
      }
    } catch {
      setError('Session introuvable');
      setLoading(false);
    }
  };

  const fetchNextRound = async () => {
    setLoading(true);
    setError('');
    setSubmitted(false);
    setResult(null);
    try {
      const res = await soloAPI.nextRound(sessionId);
      if (res.data.finished) {
        navigate(`/solo/results/${sessionId}`);
        return;
      }
      setCurrentRound(res.data);
      // Rafraîchir la session pour avoir le score à jour
      const sessionRes = await soloAPI.getSession(sessionId);
      setSession(sessionRes.data);
      setPhase('playing');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger la prochaine question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMCQ = async (answer) => {
    try {
      const res = await soloAPI.submitMCQ(sessionId, currentRound.roundNumber, answer);
      setResult(res.data);
      setSubmitted(true);
      // Mettre à jour le score dans la session locale
      setSession((prev) => prev ? { ...prev, total_score: res.data.totalScore } : prev);
      if (res.data.sessionFinished) {
        setTimeout(() => navigate(`/solo/results/${sessionId}`), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la soumission');
    }
  };

  const handleSubmitCode = async (code) => {
    try {
      const res = await soloAPI.submitCode(sessionId, currentRound.roundNumber, code);
      setResult(res.data);
      setSubmitted(true);
      setSession((prev) => prev ? { ...prev, total_score: res.data.totalScore } : prev);
      if (res.data.sessionFinished) {
        setTimeout(() => navigate(`/solo/results/${sessionId}`), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la soumission');
    }
  };

  const handleNextRound = () => {
    if (session && currentRound && currentRound.roundNumber >= session.config.maxRounds) {
      navigate(`/solo/results/${sessionId}`);
    } else {
      setPhase('between');
      fetchNextRound();
    }
  };

  const handleAbandon = async () => {
    if (!window.confirm('Abandonner la partie ? Votre score sera sauvegardé.')) return;
    try {
      await soloAPI.finish(sessionId);
      navigate(`/solo/results/${sessionId}`);
    } catch {
      navigate(`/solo/results/${sessionId}`);
    }
  };

  // ── Écran de chargement ──────────────────────────────────────────────────
  if (loading && phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🐛</div>
          <p className="text-gray-400">Chargement de la partie...</p>
        </div>
      </div>
    );
  }

  if (error && !currentRound) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-rose-400 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  // ── Écran "entre les manches" ────────────────────────────────────────────
  if (phase === 'between' || (phase === 'loading' && !currentRound)) {
    const roundsDone = session?.current_round || 0;
    const totalRounds = session?.config?.maxRounds || 0;
    const isFirst = roundsDone === 0;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">{isFirst ? '🎮' : '⏭️'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isFirst ? 'Prêt à jouer ?' : `Manche ${roundsDone} terminée !`}
          </h2>
          {!isFirst && (
            <p className="text-gray-400 mb-2">
              Score actuel : <span className="text-indigo-400 font-bold text-lg">{session?.total_score || 0} pts</span>
            </p>
          )}
          <p className="text-gray-500 text-sm mb-6">
            {isFirst
              ? `${totalRounds} manche${totalRounds > 1 ? 's' : ''} vous attendent`
              : `${totalRounds - roundsDone} manche${totalRounds - roundsDone > 1 ? 's' : ''} restante${totalRounds - roundsDone > 1 ? 's' : ''}`}
          </p>

          {/* Barre de progression */}
          {!isFirst && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span>
                <span>{roundsDone}/{totalRounds}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${(roundsDone / totalRounds) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={fetchNextRound}
              disabled={loading}
              className="btn-primary flex-1 py-3"
            >
              {loading ? 'Chargement...' : isFirst ? '🚀 Commencer' : '➡️ Manche suivante'}
            </button>
            <button onClick={handleAbandon} className="btn-ghost px-4">
              Abandonner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran de jeu ────────────────────────────────────────────────────────
  const tech = TECH_LABELS[currentRound?.technology] || { label: currentRound?.technology, icon: '❓', badge: '' };
  const diffColor = DIFF_COLORS[currentRound?.difficulty] || 'text-gray-400';
  const isLastRound = currentRound?.roundNumber >= currentRound?.totalRounds;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Infos joueur + score */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">Joueur</p>
              <p className="text-sm font-semibold text-white">{session?.player_name}</p>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <p className="text-xs text-gray-500">Score</p>
              <p className="text-lg font-bold text-indigo-400">{session?.total_score || 0} pts</p>
            </div>
          </div>

          {/* Progression */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Manche</p>
              <p className="text-sm font-bold text-white">
                {currentRound?.roundNumber} / {currentRound?.totalRounds}
              </p>
            </div>
            <div className="w-24 bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(currentRound?.roundNumber / currentRound?.totalRounds) * 100}%` }}
              />
            </div>
          </div>

          {/* Badges tech + difficulté */}
          <div className="flex items-center gap-2">
            <span className={`badge ${tech.badge}`}>
              {tech.icon} {tech.label}
            </span>
            {currentRound?.difficulty && (
              <span className={`badge border ${diffColor}`}>
                {currentRound.difficulty}
              </span>
            )}
            <span className="badge bg-gray-800 text-gray-400 border border-gray-700">
              {currentRound?.questionType === 'mcq' ? '📋 QCM' : '💻 Code'}
            </span>
          </div>

          {/* Abandon */}
          <button onClick={handleAbandon} className="btn-ghost text-xs px-3 py-1.5">
            Abandonner
          </button>
        </div>
      </div>

      {/* Contenu de la question */}
      <div className="max-w-5xl mx-auto p-4">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm mb-4">
            {error}
          </div>
        )}

        {currentRound?.questionType === 'mcq' ? (
          <MCQQuestion
            question={currentRound.question}
            onSubmit={handleSubmitMCQ}
            submitted={submitted}
            result={result}
          />
        ) : (
          <CodeQuestion
            question={currentRound.question}
            technology={currentRound.technology}
            onSubmit={handleSubmitCode}
            submitted={submitted}
            result={result}
          />
        )}

        {/* Bouton "Manche suivante" après soumission */}
        {submitted && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleNextRound}
              className="btn-primary px-8 py-3 text-base"
            >
              {isLastRound ? '🏁 Voir mes résultats' : '➡️ Manche suivante'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
