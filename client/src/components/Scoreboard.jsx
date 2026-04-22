import { useGameStore } from '../store/gameStore';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ compact = false }) {
  const scores = useGameStore((s) => s.scores);

  if (!scores.length) {
    return (
      <div className="card text-center text-gray-500 py-8">
        Aucune équipe inscrite
      </div>
    );
  }

  return (
    <div className="card">
      {!compact && (
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏆 Classement
        </h2>
      )}
      <div className="space-y-2">
        {scores.map((team, index) => (
          <div
            key={team.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 transition-all"
          >
            <span className="text-xl w-8 text-center">
              {MEDALS[index] || `#${index + 1}`}
            </span>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            <span className="flex-1 font-medium text-gray-200">{team.name}</span>
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: team.color }}
            >
              {team.score.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
