import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import { runTests } from '../services/codeRunner.js';
import { getIo } from '../socket/gameSocket.js';

const router = Router();

function calculatePoints(basePoints, submissionOrder) {
  const multipliers = [1.0, 0.75, 0.5, 0.25];
  const multiplier = multipliers[Math.min(submissionOrder, multipliers.length - 1)] || 0.1;
  return Math.round(basePoints * multiplier);
}

// Soumettre une réponse MCQ
router.post('/mcq', authenticate, async (req, res) => {
  const { roundId, answer } = req.body;
  const { teamId, playerId } = req.user;

  if (roundId === undefined || answer === undefined) {
    return res.status(400).json({ error: 'roundId et answer requis' });
  }

  const round = dbHelpers.getRoundById(roundId);
  if (!round || round.question_type !== 'mcq') return res.status(404).json({ error: 'Round MCQ introuvable' });

  const existing = dbHelpers.getSubmissionByRoundAndTeam(roundId, teamId);
  if (existing) return res.status(409).json({ error: 'Votre équipe a déjà soumis pour ce round' });

  const question = dbHelpers.getMCQById(round.question_id);
  const isCorrect = parseInt(answer) === question.correct_answer;

  const submissionCount = dbHelpers.getCorrectSubmissionCount(roundId);
  const pointsEarned = isCorrect ? calculatePoints(question.points, submissionCount) : 0;

  await dbHelpers.insertSubmission({
    id: uuidv4(), round_id: roundId, team_id: teamId,
    player_id: playerId || req.user.id, question_type: 'mcq',
    answer: String(answer), is_correct: isCorrect, points_earned: pointsEarned,
    submitted_at: new Date().toISOString(),
  });

  if (pointsEarned > 0) {
    const session = dbHelpers.getActiveSession();
    if (session) await dbHelpers.addSessionScore(session.id, teamId, pointsEarned);
  }

  const session = dbHelpers.getActiveSession();
  const scores = session ? dbHelpers.getSessionScores(session.id) : [];

  try {
    const io = getIo();
    io.emit('submission:mcq', { roundId, teamId, isCorrect, pointsEarned, scores });
  } catch (e) { /* socket non disponible */ }

  res.json({
    isCorrect,
    pointsEarned,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
  });
});

// Soumettre du code (niveau IDE + TDD)
router.post('/code', authenticate, async (req, res) => {
  const { roundId, code } = req.body;
  const { teamId, playerId } = req.user;

  if (!roundId || !code) return res.status(400).json({ error: 'roundId et code requis' });
  if (code.length > 10000) return res.status(400).json({ error: 'Code trop long (max 10 000 caractères)' });

  const round = dbHelpers.getRoundById(roundId);
  if (!round || round.question_type !== 'code') return res.status(404).json({ error: 'Round de code introuvable' });

  const question = dbHelpers.getCodeById(round.question_id);
  const testSuite = typeof question.test_suite === 'string' ? JSON.parse(question.test_suite) : question.test_suite;

  const startTime = Date.now();
  const testResults = runTests(code, testSuite, round.technology);
  const executionTime = Date.now() - startTime;

  const isCorrect = testResults.passed === testResults.total;
  const submissionCount = dbHelpers.getCorrectSubmissionCount(roundId);
  const basePoints = Math.round(question.points * (testResults.total > 0 ? testResults.passed / testResults.total : 0));
  const pointsEarned = isCorrect
    ? calculatePoints(basePoints, submissionCount)
    : (basePoints > 0 ? Math.round(basePoints * 0.3) : 0);

  await dbHelpers.insertSubmission({
    id: uuidv4(), round_id: roundId, team_id: teamId,
    player_id: playerId || req.user.id, question_type: 'code',
    answer: code, is_correct: isCorrect,
    tests_passed: testResults.passed, tests_total: testResults.total,
    execution_time_ms: executionTime, points_earned: pointsEarned,
    submitted_at: new Date().toISOString(),
  });

  if (pointsEarned > 0) {
    const session = dbHelpers.getActiveSession();
    if (session) await dbHelpers.addSessionScore(session.id, teamId, pointsEarned);
  }

  const session = dbHelpers.getActiveSession();
  const scores = session ? dbHelpers.getSessionScores(session.id) : [];

  try {
    const io = getIo();
    io.emit('submission:code', {
      roundId, teamId, isCorrect,
      testsPassed: testResults.passed, testsTotal: testResults.total,
      pointsEarned, scores,
    });
  } catch (e) { /* socket non disponible */ }

  res.json({
    isCorrect,
    testsPassed: testResults.passed,
    testsTotal: testResults.total,
    results: testResults.results,
    pointsEarned,
    executionTimeMs: executionTime,
  });
});

export default router;
