import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import { runTests } from '../services/codeRunner.js';
import { io } from '../index.js';

const router = Router();

// Calcul des points selon la rapidité (système dégressif)
function calculatePoints(basePoints, submissionOrder, totalTeams) {
  const multipliers = [1.0, 0.75, 0.5, 0.25];
  const multiplier = multipliers[Math.min(submissionOrder, multipliers.length - 1)] || 0.1;
  return Math.round(basePoints * multiplier);
}

// Soumettre une réponse MCQ
router.post('/mcq', authenticate, (req, res) => {
  const { roundId, answer } = req.body;
  const { teamId, playerId } = req.user;

  if (roundId === undefined || answer === undefined) {
    return res.status(400).json({ error: 'roundId et answer requis' });
  }

  const db = getDb();
  const round = db.prepare('SELECT * FROM rounds WHERE id = ? AND question_type = ?').get(roundId, 'mcq');
  if (!round) return res.status(404).json({ error: 'Round MCQ introuvable' });

  // Vérifier si l'équipe a déjà soumis pour ce round
  const existing = db.prepare('SELECT * FROM submissions WHERE round_id = ? AND team_id = ?').get(roundId, teamId);
  if (existing) return res.status(409).json({ error: 'Votre équipe a déjà soumis pour ce round' });

  const question = db.prepare('SELECT * FROM mcq_questions WHERE id = ?').get(round.question_id);
  const isCorrect = parseInt(answer) === question.correct_answer;

  // Calculer l'ordre de soumission pour les points dégressifs
  const submissionCount = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE round_id = ? AND is_correct = 1').get(roundId).count;
  const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  const pointsEarned = isCorrect ? calculatePoints(question.points, submissionCount, totalTeams) : 0;

  const submissionId = uuidv4();
  db.prepare('INSERT INTO submissions (id, round_id, team_id, player_id, question_type, answer, is_correct, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    submissionId, roundId, teamId, playerId || req.user.id, 'mcq', String(answer), isCorrect ? 1 : 0, pointsEarned
  );

  // Mettre à jour le score de session
  if (pointsEarned > 0) {
    const session = db.prepare('SELECT id FROM game_sessions WHERE status = ?').get('active');
    if (session) {
      db.prepare('UPDATE session_scores SET score = score + ? WHERE session_id = ? AND team_id = ?').run(pointsEarned, session.id, teamId);
    }
  }

  // Émettre l'événement temps réel
  const sessionData = getSessionScores(db);
  io.emit('submission:mcq', {
    roundId,
    teamId,
    isCorrect,
    pointsEarned,
    explanation: isCorrect ? question.explanation : null,
    scores: sessionData,
  });

  res.json({
    isCorrect,
    pointsEarned,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
  });
});

// Soumettre du code (niveau IDE + TDD)
router.post('/code', authenticate, (req, res) => {
  const { roundId, code } = req.body;
  const { teamId, playerId } = req.user;

  if (!roundId || !code) return res.status(400).json({ error: 'roundId et code requis' });
  if (code.length > 10000) return res.status(400).json({ error: 'Code trop long (max 10 000 caractères)' });

  const db = getDb();
  const round = db.prepare('SELECT * FROM rounds WHERE id = ? AND question_type = ?').get(roundId, 'code');
  if (!round) return res.status(404).json({ error: 'Round de code introuvable' });

  const question = db.prepare('SELECT * FROM code_questions WHERE id = ?').get(round.question_id);
  const testSuite = JSON.parse(question.test_suite);

  const startTime = Date.now();
  const testResults = runTests(code, testSuite, round.technology);
  const executionTime = Date.now() - startTime;

  const isCorrect = testResults.passed === testResults.total;

  // Calcul des points dégressifs
  const submissionCount = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE round_id = ? AND is_correct = 1').get(roundId).count;
  const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  const basePoints = Math.round(question.points * (testResults.passed / testResults.total));
  const pointsEarned = isCorrect ? calculatePoints(basePoints, submissionCount, totalTeams) : Math.round(basePoints * 0.3);

  const submissionId = uuidv4();
  db.prepare('INSERT INTO submissions (id, round_id, team_id, player_id, question_type, answer, is_correct, tests_passed, tests_total, execution_time_ms, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    submissionId, roundId, teamId, playerId || req.user.id, 'code', code, isCorrect ? 1 : 0,
    testResults.passed, testResults.total, executionTime, pointsEarned
  );

  // Mettre à jour le score de session
  if (pointsEarned > 0) {
    const session = db.prepare('SELECT id FROM game_sessions WHERE status = ?').get('active');
    if (session) {
      db.prepare('UPDATE session_scores SET score = score + ? WHERE session_id = ? AND team_id = ?').run(pointsEarned, session.id, teamId);
    }
  }

  // Émettre l'événement temps réel
  const sessionData = getSessionScores(db);
  io.emit('submission:code', {
    roundId,
    teamId,
    isCorrect,
    testsPassed: testResults.passed,
    testsTotal: testResults.total,
    pointsEarned,
    scores: sessionData,
  });

  res.json({
    isCorrect,
    testsPassed: testResults.passed,
    testsTotal: testResults.total,
    results: testResults.results,
    pointsEarned,
    executionTimeMs: executionTime,
  });
});

function getSessionScores(db) {
  const session = db.prepare('SELECT id FROM game_sessions WHERE status = ?').get('active');
  if (!session) return [];
  return db.prepare(`
    SELECT t.id, t.name, t.color, COALESCE(ss.score, 0) as score
    FROM teams t
    LEFT JOIN session_scores ss ON ss.team_id = t.id AND ss.session_id = ?
    ORDER BY score DESC
  `).all(session.id);
}

export default router;
