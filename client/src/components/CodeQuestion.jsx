import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import Timer from './Timer';

const TECH_LANGUAGE_MAP = {
  javascript: 'javascript',
  php: 'php',
  cpp: 'cpp',
  csharp: 'csharp',
  mobile: 'javascript',
};

export default function CodeQuestion({ question, technology, onSubmit, submitted, result }) {
  const [code, setCode] = useState(question.starter_code);
  const [showHints, setShowHints] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const editorRef = useRef(null);

  const language = TECH_LANGUAGE_MAP[technology] || 'javascript';

  const handleSubmit = () => {
    if (submitted || timerExpired) return;
    onSubmit(code);
  };

  const handleTimerExpire = () => {
    setTimerExpired(true);
    if (!submitted) onSubmit(code);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="badge bg-violet-500/20 text-violet-400 border border-violet-500/30">
            💻 Code IDE — {question.points} pts
          </span>
          {!submitted && (
            <Timer
              seconds={question.time_limit_seconds}
              onExpire={handleTimerExpire}
              running={!submitted}
            />
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-3">{question.title}</h2>

        {/* Description (Markdown) */}
        <div className="prose prose-invert prose-sm max-w-none text-gray-300">
          <ReactMarkdown>{question.description}</ReactMarkdown>
        </div>

        {/* Indices */}
        {question.hints?.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowHints(!showHints)}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1"
            >
              💡 {showHints ? 'Masquer les indices' : `Voir les indices (${question.hints.length})`}
            </button>
            {showHints && (
              <ul className="mt-2 space-y-1">
                {question.hints.map((hint, i) => (
                  <li key={i} className="text-yellow-300/80 text-sm flex items-start gap-2">
                    <span className="text-yellow-500 flex-shrink-0">→</span>
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Éditeur Monaco */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">{language}</span>
          {!submitted && (
            <button
              onClick={() => setCode(question.starter_code)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <Editor
          height="380px"
          language={language}
          value={code}
          onChange={(val) => !submitted && setCode(val || '')}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            readOnly: submitted,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            suggestOnTriggerCharacters: true,
            tabSize: 2,
          }}
          onMount={(editor) => { editorRef.current = editor; }}
        />
      </div>

      {/* Bouton de soumission */}
      {!submitted && !timerExpired && (
        <button onClick={handleSubmit} className="btn-primary w-full py-3 text-lg">
          🚀 Soumettre le code
        </button>
      )}

      {timerExpired && !submitted && (
        <div className="card border-yellow-500/50 bg-yellow-500/10 text-center py-3">
          <p className="text-yellow-400 font-semibold">⏰ Temps écoulé — code soumis automatiquement</p>
        </div>
      )}

      {/* Résultats TDD */}
      {submitted && result && (
        <div className="card">
          <div className={`flex items-center justify-between mb-4 pb-4 border-b border-gray-700`}>
            <div>
              <h3 className={`text-lg font-bold ${result.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.isCorrect ? '✅ Tous les tests passent !' : `❌ ${result.testsPassed}/${result.testsTotal} tests passés`}
              </h3>
              {result.pointsEarned > 0 && (
                <p className="text-emerald-300 font-semibold">+{result.pointsEarned} points</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Temps d'exécution</div>
              <div className="text-gray-300 font-mono">{result.executionTimeMs}ms</div>
            </div>
          </div>

          {/* Détail des tests */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Détail des tests</h4>
            {result.results?.map((test, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${test.passed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}
              >
                <span className="flex-shrink-0 mt-0.5">{test.passed ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-200">{test.name}</div>
                  {!test.passed && test.error && (
                    <div className="text-rose-400 text-xs mt-1 font-mono break-all">{test.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {result.error && (
            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-rose-400 text-sm font-mono">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
