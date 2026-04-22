import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soloAPI } from '../services/api';

const TECHNOLOGIES = [
  { id: 'javascript', label: 'JavaScript', icon: '🟨', color: 'yellow' },
  { id: 'php',        label: 'PHP',        icon: '🐘', color: 'purple' },
  { id: 'cpp',        label: 'C++',        icon: '⚙️',  color: 'blue'   },
  { id: 'csharp',     label: 'C#',         icon: '🔷', color: 'green'  },
  { id: 'mobile',     label: 'Mobile',     icon: '📱', color: 'pink'   },
];

const DIFFICULTIES = [
  { id: 'all',    label: 'Tous niveaux', icon: '🎲', desc: 'Mélange de toutes les difficultés' },
  { id: 'easy',   label: 'Facile',       icon: '🟢', desc: 'Questions de base, idéal pour débuter' },
  { id: 'medium', label: 'Moyen',        icon: '🟡', desc: 'Niveau intermédiaire' },
  { id: 'hard',   label: 'Difficile',    icon: '🔴', desc: 'Challenges avancés' },
];

const QUESTION_TYPES = [
  { id: 'mcq',  label: 'QCM uniquement',      icon: '📋', desc: 'Questions à choix multiples' },
  { id: 'code', label: 'Code uniquement',      icon: '💻', desc: 'Challenges avec IDE et TDD' },
  { id: 'both', label: 'Mixte (QCM + Code)',   icon: '🔀', desc: 'Alternance QCM et code' },
];

export default function SoloSetupPage() {
  const navigate = useNavigate();

  const [playerName, setPlayerName]       = useState('');
  const [maxRounds, setMaxRounds]         = useState(5);
  const [selectedTechs, setSelectedTechs] = useState([]);   // [] = tous
  const [difficulty, setDifficulty]       = useState('all');
  const [questionType, setQuestionType]   = useState('both');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const toggleTech = (id) => {
    setSelectedTechs((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleStart = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre prénom');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const questionTypes =
        questionType === 'both' ? ['mcq', 'code'] : [questionType];

      const res = await soloAPI.createSession({
        playerName: playerName.trim(),
        maxRounds,
        technologies: selectedTechs,   // [] = tous les langages
        difficulty,
        questionTypes,
      });

      navigate(`/solo/play/${res.data.sessionId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-300 text-sm mb-4 inline-block"
          >
            ← Retour à l'accueil
          </button>
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-3xl font-bold text-white">Mode Solo</h1>
          <p className="text-gray-400 mt-1">Configure ta partie et chasse les bugs à ton rythme</p>
        </div>

        <div className="space-y-6">

          {/* Nom du joueur */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-200 mb-3">👤 Ton prénom</h2>
            <input
              type="text"
              placeholder="Ex : Alice"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              maxLength={30}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Nombre de manches */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-200 mb-3">
              🔢 Nombre de manches
              <span className="ml-2 text-indigo-400 font-bold text-lg">{maxRounds}</span>
            </h2>
            <input
              type="range"
              min={1}
              max={20}
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 manche</span>
              <span>10</span>
              <span>20 manches</span>
            </div>
          </div>

          {/* Type de questions */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-200 mb-3">📝 Type de questions</h2>
            <div className="grid grid-cols-1 gap-2">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.id}
                  onClick={() => setQuestionType(qt.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    questionType === qt.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 hover:border-gray-500 text-gray-300'
                  }`}
                >
                  <span className="text-xl">{qt.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{qt.label}</div>
                    <div className="text-xs text-gray-500">{qt.desc}</div>
                  </div>
                  {questionType === qt.id && (
                    <span className="ml-auto text-indigo-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Langages */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-200 mb-1">🛠️ Langages</h2>
            <p className="text-xs text-gray-500 mb-3">
              {selectedTechs.length === 0
                ? 'Tous les langages sélectionnés'
                : `${selectedTechs.length} langage(s) sélectionné(s)`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TECHNOLOGIES.map((tech) => {
                const active = selectedTechs.includes(tech.id);
                return (
                  <button
                    key={tech.id}
                    onClick={() => toggleTech(tech.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-gray-700 hover:border-gray-500 text-gray-400'
                    }`}
                  >
                    <span className="text-lg">{tech.icon}</span>
                    <span className="text-sm font-medium">{tech.label}</span>
                    {active && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
            {selectedTechs.length > 0 && (
              <button
                onClick={() => setSelectedTechs([])}
                className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Tout sélectionner (réinitialiser)
              </button>
            )}
          </div>

          {/* Difficulté */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-200 mb-3">⚡ Difficulté</h2>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`flex flex-col p-3 rounded-lg border transition-all text-left ${
                    difficulty === d.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 hover:border-gray-500 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{d.icon}</span>
                    <span className="font-medium text-sm">{d.label}</span>
                    {difficulty === d.id && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                  </div>
                  <span className="text-xs text-gray-500">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Joueur</div>
              <div className="text-white font-medium">{playerName || '—'}</div>
              <div className="text-gray-500">Manches</div>
              <div className="text-white font-medium">{maxRounds}</div>
              <div className="text-gray-500">Questions</div>
              <div className="text-white font-medium">
                {QUESTION_TYPES.find((q) => q.id === questionType)?.label}
              </div>
              <div className="text-gray-500">Langages</div>
              <div className="text-white font-medium">
                {selectedTechs.length === 0
                  ? 'Tous'
                  : selectedTechs.map((t) => TECHNOLOGIES.find((x) => x.id === t)?.label).join(', ')}
              </div>
              <div className="text-gray-500">Difficulté</div>
              <div className="text-white font-medium">
                {DIFFICULTIES.find((d) => d.id === difficulty)?.label}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Bouton démarrer */}
          <button
            onClick={handleStart}
            disabled={loading || !playerName.trim()}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'Création de la partie...' : '🚀 Lancer la partie'}
          </button>
        </div>
      </div>
    </div>
  );
}
