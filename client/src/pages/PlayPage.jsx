import { useEffect, useState } from 'react';
import { gameAPI, questionsAPI, submissionsAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuthStore, useGameStore } from '../store/gameStore';
import MCQQuestion from '../components/MCQQuestion';
import CodeQuestion from '../components/CodeQuestion';
import Scoreboard from '../components/Scoreboard';
import TechBadge from '../components/TechBadge';

export default function PlayPage() {
  const user = useAuthStore((s) => s.user);
  const { session, currentRound, scores, setSession, setCurrentRound, setScores } = useGameStore();

  const [question, setQuestion] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waitingMessage, setWaitingMessage] = useState('En attente du prochain round...');

  const isMyTurn = currentRound && user?.technology === currentRound.technology;

  useEffect(() => {
    gameAPI.getSession().then(async (res) => {
      setSession(res.data.session);
      setScores(res.data.scores || []);
      if (res.data.rounds?.length) {
        const round = res.data.rounds[res.data.rounds.length - 1];
        setCurrentRound(round);
        await loadQuestion(round);
      }
      setLoading(false);
    });

    const socket = getSocket();
    socket.emit('join:room', { role: 'player', teamId: user?.team_id });

    socket.on('round:start', async ({ round }) => {
      setCurrentRound(round);
      setSubmitted(false);
      setResult(null);
      await loadQuestion(round);
    });

    socket.on('submission:mcq', ({ scores: newScores }) => {
      if (newScores) setScores(newScores);
    });
    socket.on('submission:code', ({ scores: newScores }) => {
      if (newScores) setScores(newScores);
    });

    return () => {
      socket.off('round:start');
      socket.off('submission:mcq');
      socket.off('submission:code');
    };
  }, []);

  const loadQuestion = async (round) => {
    try {
      if (round.question_type === 'mcq') {
        const res = await questionsAPI.getMCQ(round.question_id);
        setQuestion(res.data);
      } else {
        const res = await questionsAPI.getCode(round.question_id);
        setQuestion(res.data);
      }
    } catch (err) {
      console.error('Erreur chargement question:', err);
    }
  };

  const handleMCQSubmit = async (answerIndex) => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const res = await submissionsAPI.submitMCQ(currentRound.id, answerIndex);
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Erreur de soumission' });
    }
  };

  const handleCodeSubmit = async (code) => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const res = await submissionsAPI.submitCode(currentRound.id, code);
      setResult(res.data);
    } catch (err) {
      setSubmitted(false);
      setResult({ error: err.response?.data?.error || 'Erreur de soumission' });
    }
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💻</span>
            <div>
              <h1 className="text-xl font-bold text-white">{user?.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <TechBadge technology={user?.technology} />
                <span className="text-gray-500 text-xs">Expert</span>
              </div>
            </div>
          </div>
          {currentRound && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Round actuel</div>
              <div className="font-semibold text-white">#{currentRound.round_number}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Zone principale */}
          <div className="lg:col-span-3">
            {!session && (
              <div className="card text-center py-16">
                <div className="text-5xl mb-4">⏳</div>
                <p className="text-gray-400 text-lg">En attente du démarrage de la partie...</p>
              </div>
            )}

            {session && !currentRound && (
              <div className="card text-center py-16">
                <div className="text-5xl mb-4">🎲</div>
                <p className="text-gray-400 text-lg">En attente du prochain round...</p>
              </div>
            )}

            {session && currentRound && !isMyTurn && (
              <div className="card text-center py-16">
                <div className="text-5xl mb-4">👀</div>
                <p className="text-gray-400 text-lg mb-2">Ce round est pour les experts</p>
                <TechBadge technology={currentRound.technology} size="lg" />
                <p className="text-gray-500 text-sm mt-3">Votre technologie : <strong className="text-gray-300">{user?.technology}</strong></p>
              </div>
            )}

            {session && currentRound && isMyTurn && question && (
              <>
                {currentRound.question_type === 'mcq' ? (
                  <MCQQuestion
                    question={question}
                    onSubmit={handleMCQSubmit}
                    submitted={submitted}
                    result={result}
                  />
                ) : (
                  <CodeQuestion
                    question={question}
                    technology={currentRound.technology}
                    onSubmit={handleCodeSubmit}
                    submitted={submitted}
                    result={result}
                  />
                )}
              </>
            )}
          </div>

          {/* Sidebar scores */}
          <div className="lg:col-span-1">
            <Scoreboard compact />
          </div>
        </div>
      </div>
    </div>
  );
}
