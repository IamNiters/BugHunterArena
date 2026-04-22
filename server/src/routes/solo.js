import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers, getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import { runTests } from '../services/codeRunner.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSoloSessions() {
  const db = getDb();
  if (!db.data.solo_sessions) db.data.solo_sessions = [];
  return db.data.solo_sessions;
}

function getSoloSession(id) {
  return getSoloSessions().find((s) => s.id === id);
}

async function saveSoloSession(session) {
  const db = getDb();
  if (!db.data.solo_sessions) db.data.solo_sessions = [];
  const idx = db.data.solo_sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) db.data.solo_sessions[idx] = session;
  else db.data.solo_sessions.push(session);
  await db.write();
}

// Correspondance difficulté label → valeur numérique stockée dans le seed
const DIFF_MAP = { easy: 1, medium: 2, hard: 3 };

function pickQuestion(type, technologies, difficulty, usedIds) {
  const allMCQ = dbHelpers.getAllMCQ();
  const allCode = dbHelpers.getAllCode();

  const diffValue = DIFF_MAP[difficulty]; // undefined si 'all'

  const pool = (type === 'mcq' ? allMCQ : allCode).filter((q) => {
    const techOk = technologies.length === 0 || technologies.includes(q.technology);
    const diffOk = difficulty === 'all' || q.difficulty === diffValue;
    return techOk && diffOk && !usedIds.includes(q.id);
  });

  // Fallback : ignorer la difficulté si aucune question disponible
  const fallback = (type === 'mcq' ? allMCQ : allCode).filter((q) => {
    const techOk = technologies.length === 0 || technologies.includes(q.technology);
    return techOk && !usedIds.includes(q.id);
  });

  // Dernier fallback : toutes les questions disponibles
  const source = pool.length ? pool : fallback.length ? fallback : (type === 'mcq' ? allMCQ : allCode).filter((q) => !usedIds.includes(q.id));
  return source.length ? source[Math.floor(Math.random() * source.length)] : null;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/solo/session
 * Créer une session solo avec configuration
 * Body: { playerName, maxRounds, technologies[], difficulty, questionTypes[] }
 */
router.post('/session', async (req, res) => {
  const {
    playerName = 'Joueur',
    maxRounds = 5,
    technologies = [],          // [] = tous les langages
    difficulty = 'all',         // 'easy' | 'medium' | 'hard' | 'all'
    questionTypes = ['mcq', 'code'], // types autorisés dans la session
  } = req.body;

  if (maxRounds < 1 || maxRounds > 20) {
    return res.status(400).json({ error: 'Le nombre de manches doit être entre 1 et 20' });
  }

  const id = uuidv4();
  const session = {
    id,
    player_name: playerName,
    status: 'active',
    config: { maxRounds, technologies, difficulty, questionTypes },
    current_round: 0,
    total_score: 0,
    rounds: [],           // { roundNumber, questionId, questionType, technology, ... }
    created_at: new Date().toISOString(),
    finished_at: null,
  };

  await saveSoloSession(session);
  res.status(201).json({ sessionId: id, session });
});

/**
 * GET /api/solo/session/:id
 * Récupérer l'état d'une session solo
 */
router.get('/session/:id', (req, res) => {
  const session = getSoloSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session solo introuvable' });
  res.json(session);
});

/**
 * POST /api/solo/session/:id/next
 * Passer au round suivant (récupère la prochaine question)
 */
router.post('/session/:id/next', async (req, res) => {
  const session = getSoloSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session solo introuvable' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Session terminée' });

  const { maxRounds, technologies, difficulty, questionTypes } = session.config;

  if (session.current_round >= maxRounds) {
    session.status = 'finished';
    session.finished_at = new Date().toISOString();
    await saveSoloSession(session);
    return res.json({ finished: true, session });
  }

  const usedMCQ = session.rounds.filter((r) => r.question_type === 'mcq').map((r) => r.question_id);
  const usedCode = session.rounds.filter((r) => r.question_type === 'code').map((r) => r.question_id);

  // Alterner MCQ / code selon les types autorisés, ou choisir aléatoirement
  let type;
  if (questionTypes.length === 1) {
    type = questionTypes[0];
  } else {
    // Alterner : manches impaires = mcq, paires = code (si les deux sont autorisés)
    type = session.current_round % 2 === 0 ? 'mcq' : 'code';
    if (!questionTypes.includes(type)) type = questionTypes[0];
  }

  const usedIds = type === 'mcq' ? usedMCQ : usedCode;
  const question = pickQuestion(type, technologies, difficulty, usedIds);

  if (!question) {
    return res.status(404).json({ error: 'Plus aucune question disponible avec ces paramètres' });
  }

  const roundNumber = session.current_round + 1;
  const roundEntry = {
    round_number: roundNumber,
    question_id: question.id,
    question_type: type,
    technology: question.technology,
    difficulty: question.difficulty,
    started_at: new Date().toISOString(),
    submitted: false,
    is_correct: null,
    points_earned: 0,
    answer: null,
  };

  session.rounds.push(roundEntry);
  session.current_round = roundNumber;
  await saveSoloSession(session);

  // Retourner la question sans la réponse
  let questionData;
  if (type === 'mcq') {
    const { correct_answer, explanation, ...safe } = question;
    // Parser options si c'est une chaîne JSON
    const options = typeof safe.options === 'string' ? JSON.parse(safe.options) : (safe.options || []);
    questionData = { ...safe, options };
  } else {
    const { solution_code, ...safe } = question;
    const testSuite = typeof safe.test_suite === 'string' ? JSON.parse(safe.test_suite) : safe.test_suite;
    questionData = { ...safe, test_suite: testSuite };
  }

  res.json({
    roundNumber,
    questionType: type,
    technology: question.technology,
    difficulty: question.difficulty,
    question: questionData,
    totalRounds: maxRounds,
  });
});

/**
 * POST /api/solo/session/:id/submit/mcq
 * Soumettre une réponse MCQ en mode solo
 * Body: { roundNumber, answer }
 */
router.post('/session/:id/submit/mcq', async (req, res) => {
  const { roundNumber, answer } = req.body;
  const session = getSoloSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session solo introuvable' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Session terminée' });

  const round = session.rounds.find((r) => r.round_number === roundNumber);
  if (!round) return res.status(404).json({ error: 'Round introuvable' });
  if (round.submitted) return res.status(409).json({ error: 'Déjà soumis pour ce round' });
  if (round.question_type !== 'mcq') return res.status(400).json({ error: 'Ce round n\'est pas un QCM' });

  const question = dbHelpers.getMCQById(round.question_id);
  const isCorrect = parseInt(answer) === question.correct_answer;
  const pointsEarned = isCorrect ? (question.points || 100) : 0;

  round.submitted = true;
  round.is_correct = isCorrect;
  round.points_earned = pointsEarned;
  round.answer = String(answer);
  round.finished_at = new Date().toISOString();
  session.total_score += pointsEarned;

  // Terminer automatiquement si c'était le dernier round
  if (session.current_round >= session.config.maxRounds) {
    session.status = 'finished';
    session.finished_at = new Date().toISOString();
  }

  await saveSoloSession(session);

  res.json({
    isCorrect,
    pointsEarned,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    totalScore: session.total_score,
    sessionFinished: session.status === 'finished',
  });
});

/**
 * POST /api/solo/session/:id/submit/code
 * Soumettre du code en mode solo (TDD)
 * Body: { roundNumber, code }
 */
router.post('/session/:id/submit/code', async (req, res) => {
  const { roundNumber, code } = req.body;
  const session = getSoloSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session solo introuvable' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Session terminée' });

  const round = session.rounds.find((r) => r.round_number === roundNumber);
  if (!round) return res.status(404).json({ error: 'Round introuvable' });
  if (round.submitted) return res.status(409).json({ error: 'Déjà soumis pour ce round' });
  if (round.question_type !== 'code') return res.status(400).json({ error: 'Ce round n\'est pas un challenge de code' });
  if (!code || code.length > 10000) return res.status(400).json({ error: 'Code invalide ou trop long' });

  const question = dbHelpers.getCodeById(round.question_id);
  const testSuite = typeof question.test_suite === 'string' ? JSON.parse(question.test_suite) : question.test_suite;

  const startTime = Date.now();
  const testResults = runTests(code, testSuite, round.technology);
  const executionTime = Date.now() - startTime;

  const isCorrect = testResults.passed === testResults.total;
  const basePoints = question.points || 400;
  const pointsEarned = Math.round(basePoints * (testResults.total > 0 ? testResults.passed / testResults.total : 0));

  round.submitted = true;
  round.is_correct = isCorrect;
  round.points_earned = pointsEarned;
  round.answer = code;
  round.tests_passed = testResults.passed;
  round.tests_total = testResults.total;
  round.execution_time_ms = executionTime;
  round.finished_at = new Date().toISOString();
  session.total_score += pointsEarned;

  if (session.current_round >= session.config.maxRounds) {
    session.status = 'finished';
    session.finished_at = new Date().toISOString();
  }

  await saveSoloSession(session);

  res.json({
    isCorrect,
    testsPassed: testResults.passed,
    testsTotal: testResults.total,
    results: testResults.results,
    pointsEarned,
    executionTimeMs: executionTime,
    totalScore: session.total_score,
    sessionFinished: session.status === 'finished',
  });
});

/**
 * POST /api/solo/session/:id/finish
 * Terminer manuellement une session solo (abandon ou fin)
 */
router.post('/session/:id/finish', async (req, res) => {
  const session = getSoloSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session solo introuvable' });

  session.status = 'finished';
  session.finished_at = new Date().toISOString();
  await saveSoloSession(session);

  res.json({ message: 'Session terminée', session });
});

export default router;
