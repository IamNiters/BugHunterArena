import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MCQQuestion({ question, onSubmit, submitted, result }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (index) => {
    if (submitted) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null || submitted) return;
    onSubmit(selected);
  };

  const getOptionClass = (index) => {
    if (!submitted) {
      return selected === index
        ? 'border-indigo-500 bg-indigo-500/20 text-white'
        : 'border-gray-700 hover:border-gray-500 text-gray-300 cursor-pointer';
    }
    if (result && result.correctAnswer !== undefined) {
      if (index === result.correctAnswer) return 'border-emerald-500 bg-emerald-500/20 text-emerald-300';
      if (index === selected && index !== result.correctAnswer) return 'border-rose-500 bg-rose-500/20 text-rose-300';
    }
    return 'border-gray-700 text-gray-500';
  };

  return (
    <div className="card">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          📝 QCM — {question.points} pts
        </span>
        <span className="text-xs text-gray-500">Technologie : {question.technology}</span>
      </div>

      {/* Titre */}
      <h2 className="text-xl font-bold text-white mb-3">{question.title}</h2>

      {/* Description (Markdown) */}
      <div className="prose prose-invert prose-sm max-w-none mb-6 text-gray-300">
        <ReactMarkdown>{question.description}</ReactMarkdown>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={submitted}
            className={`w-full text-left p-4 rounded-xl border transition-all ${getOptionClass(index)}`}
          >
            <span className="font-mono text-xs mr-3 opacity-60">
              {String.fromCharCode(65 + index)}.
            </span>
            {option}
          </button>
        ))}
      </div>

      {/* Bouton de soumission */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="btn-primary w-full"
        >
          Valider ma réponse
        </button>
      )}

      {/* Résultat */}
      {submitted && result && (
        <div className={`mt-4 p-4 rounded-xl border ${result.isCorrect ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10'}`}>
          <div className={`font-bold text-lg mb-1 ${result.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.isCorrect ? '✅ Bonne réponse !' : '❌ Mauvaise réponse'}
          </div>
          {result.isCorrect && (
            <div className="text-emerald-300 font-semibold">+{result.pointsEarned} points</div>
          )}
          {result.explanation && (
            <p className="text-gray-400 text-sm mt-2">{result.explanation}</p>
          )}
          {result.error && <p className="text-rose-400 text-sm">{result.error}</p>}
        </div>
      )}
    </div>
  );
}
