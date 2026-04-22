import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const TECHNOLOGIES = ['javascript', 'php', 'cpp', 'csharp', 'mobile'];

// Obtenir la session de jeu active
router.get('/session', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM game_sessions WHERE status != ? ORDER BY created_at DESC LIMIT 1').get('finished');
  if (!session) return res.json({ session: null });

  const rounds = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number').all(session.id);
  const scores = db.prepare(`
    SELECT t.id, t.name, t.color, COALESCE(ss.score, 0) as session_score, t.score as total_score
    FROM teams t
    LEFT JOIN session_scores ss ON ss.team_id = t.id AND ss.session_id = ?
    ORDER BY session_score DESC
  `).all(session.id);

  res.json({ session, rounds, scores });
});

// Créer une nouvelle session (admin)
router.post('/session', authenticate, requireAdmin, (req, res) => {
  const { maxRounds } = req.body;
  const db = getDb();

  // Terminer les sessions actives
  db.prepare('UPDATE game_sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE status = ?').run('finished', 'active');
  db.prepare('UPDATE game_sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE status = ?').run('finished', 'waiting');

  const id = uuidv4();
  db.prepare('INSERT INTO game_sessions (id, max_rounds) VALUES (?, ?)').run(id, maxRounds || 10);
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id);

  // Initialiser les scores pour toutes les équipes
  const teams = db.prepare('SELECT id FROM teams').all();
  const insertScore = db.prepare('INSERT OR IGNORE INTO session_scores (id, session_id, team_id) VALUES (?, ?, ?)');
  teams.forEach((t) => insertScore.run(uuidv4(), id, t.id));

  res.status(201).json(session);
});

// Démarrer la session (admin)
router.post('/session/start', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM game_sessions WHERE status = ?').get('waiting');
  if (!session) return res.status(404).json({ error: 'Aucune session en attente' });

  db.prepare('UPDATE game_sessions SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?').run('active', session.id);
  res.json({ message: 'Session démarrée', sessionId: session.id });
});

// Lancer un nouveau round (admin)
router.post('/session/round', authenticate, requireAdmin, (req, res) => {
  const { questionType } = req.body; // 'mcq' ou 'code', optionnel
  const db = getDb();

  const session = db.prepare('SELECT * FROM game_sessions WHERE status = ?').get('active');
  if (!session) return res.status(404).json({ error: 'Aucune session active' });

  if (session.current_round >= session.max_rounds) {
    return res.status(400).json({ error: 'Nombre maximum de rounds atteint' });
  }

  // Tirage au sort de la technologie
  const technology = TECHNOLOGIES[Math.floor(Math.random() * TECHNOLOGIES.length)];

  // Déterminer le type de question (alterné ou forcé)
  const type = questionType || (session.current_round % 2 === 0 ? 'mcq' : 'code');

  // Sélectionner une question aléatoire non encore posée
  const table = type === 'mcq' ? 'mcq_questions' : 'code_questions';
  const usedIds = db.prepare(`
    SELECT question_id FROM rounds WHERE session_id = ? AND question_type = ?
  `).all(session.id, type).map((r) => r.question_id);

  let question;
  if (usedIds.length > 0) {
    const placeholders = usedIds.map(() => '?').join(',');
    question = db.prepare(`SELECT id FROM ${table} WHERE technology = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`).get(technology, ...usedIds);
  } else {
    question = db.prepare(`SELECT id FROM ${table} WHERE technology = ? ORDER BY RANDOM() LIMIT 1`).get(technology);
  }

  if (!question) {
    // Fallback : toute technologie
    question = db.prepare(`SELECT id FROM ${table} ORDER BY RANDOM() LIMIT 1`).get();
  }
  if (!question) return res.status(404).json({ error: `Aucune question disponible pour ${technology}` });

  const roundNumber = session.current_round + 1;
  const roundId = uuidv4();
  db.prepare('INSERT INTO rounds (id, session_id, round_number, technology, question_id, question_type) VALUES (?, ?, ?, ?, ?, ?)').run(roundId, session.id, roundNumber, technology, question.id, type);
  db.prepare('UPDATE game_sessions SET current_round = ? WHERE id = ?').run(roundNumber, session.id);

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
  res.status(201).json(round);
});

// Terminer la session (admin)
router.post('/session/finish', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE game_sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE status = ?').run('finished', 'active');

  // Mettre à jour les scores totaux des équipes
  const scores = db.prepare(`
    SELECT team_id, score FROM session_scores
    WHERE session_id = (SELECT id FROM game_sessions WHERE status = 'finished' ORDER BY finished_at DESC LIMIT 1)
  `).all();
  scores.forEach((s) => {
    db.prepare('UPDATE teams SET score = score + ? WHERE id = ?').run(s.score, s.team_id);
  });

  res.json({ message: 'Session terminée, scores mis à jour' });
});

// Obtenir le classement global
router.get('/leaderboard', (req, res) => {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY score DESC').all();
  res.json(teams);
});

export default router;
