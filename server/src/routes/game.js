import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const TECHNOLOGIES = ['javascript', 'php', 'cpp', 'csharp', 'mobile'];

// Obtenir la session de jeu active
router.get('/session', (req, res) => {
  const session = dbHelpers.getLatestNonFinishedSession();
  if (!session) return res.json({ session: null, scores: [], rounds: [] });

  const rounds = dbHelpers.getRoundsBySession(session.id);
  const scores = dbHelpers.getSessionScores(session.id);

  res.json({ session, rounds, scores });
});

// Créer une nouvelle session (admin)
router.post('/session', authenticate, requireAdmin, async (req, res) => {
  const { maxRounds } = req.body;

  await dbHelpers.finishAllActiveSessions();

  const id = uuidv4();
  const session = {
    id,
    status: 'waiting',
    current_round: 0,
    max_rounds: maxRounds || 10,
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
  };
  await dbHelpers.insertSession(session);

  const teams = dbHelpers.getAllTeams();
  await dbHelpers.initSessionScores(id, teams.map((t) => t.id));

  res.status(201).json(session);
});

// Démarrer la session (admin)
router.post('/session/start', authenticate, requireAdmin, async (req, res) => {
  const session = dbHelpers.getWaitingSession();
  if (!session) return res.status(404).json({ error: 'Aucune session en attente' });

  await dbHelpers.updateSessionStatus(session.id, 'active', { started_at: new Date().toISOString() });
  res.json({ message: 'Session démarrée', sessionId: session.id });
});

// Lancer un nouveau round (admin)
router.post('/session/round', authenticate, requireAdmin, async (req, res) => {
  const { questionType } = req.body;

  const session = dbHelpers.getActiveSession();
  if (!session) return res.status(404).json({ error: 'Aucune session active' });

  if (session.current_round >= session.max_rounds) {
    return res.status(400).json({ error: 'Nombre maximum de rounds atteint' });
  }

  const technology = TECHNOLOGIES[Math.floor(Math.random() * TECHNOLOGIES.length)];
  const type = questionType || (session.current_round % 2 === 0 ? 'mcq' : 'code');

  const usedIds = dbHelpers.getUsedQuestionIds(session.id, type);

  let question;
  if (type === 'mcq') {
    question = dbHelpers.getRandomMCQ(technology, usedIds);
  } else {
    question = dbHelpers.getRandomCode(technology, usedIds);
  }

  if (!question) return res.status(404).json({ error: `Aucune question disponible pour ${technology}` });

  const roundNumber = session.current_round + 1;
  const roundId = uuidv4();
  const round = {
    id: roundId,
    session_id: session.id,
    round_number: roundNumber,
    technology,
    question_id: question.id,
    question_type: type,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  await dbHelpers.insertRound(round);
  await dbHelpers.updateSessionRound(session.id, roundNumber);

  res.status(201).json(round);
});

// Terminer la session (admin)
router.post('/session/finish', authenticate, requireAdmin, async (req, res) => {
  const session = dbHelpers.getActiveSession();
  if (!session) return res.status(404).json({ error: 'Aucune session active' });

  await dbHelpers.updateSessionStatus(session.id, 'finished', { finished_at: new Date().toISOString() });

  res.json({ message: 'Session terminée, scores mis à jour' });
});

// Obtenir le classement global
router.get('/leaderboard', (req, res) => {
  const teams = dbHelpers.getAllTeams().sort((a, b) => (b.score || 0) - (a.score || 0));
  res.json(teams);
});

export default router;
