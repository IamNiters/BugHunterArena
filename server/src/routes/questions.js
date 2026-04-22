import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Récupérer une question MCQ par ID (sans la réponse correcte)
router.get('/mcq/:id', authenticate, (req, res) => {
  const db = getDb();
  const q = db.prepare('SELECT id, technology, difficulty, title, description, options, points FROM mcq_questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question introuvable' });
  res.json({ ...q, options: JSON.parse(q.options) });
});

// Récupérer une question de code par ID (sans la solution)
router.get('/code/:id', authenticate, (req, res) => {
  const db = getDb();
  const q = db.prepare('SELECT id, technology, difficulty, title, description, starter_code, test_suite, hints, points, time_limit_seconds FROM code_questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question introuvable' });
  res.json({
    ...q,
    test_suite: JSON.parse(q.test_suite),
    hints: q.hints ? JSON.parse(q.hints) : [],
  });
});

// Lister toutes les questions MCQ (admin)
router.get('/mcq', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const questions = db.prepare('SELECT id, technology, difficulty, title, points FROM mcq_questions ORDER BY technology, difficulty').all();
  res.json(questions);
});

// Lister toutes les questions de code (admin)
router.get('/code', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const questions = db.prepare('SELECT id, technology, difficulty, title, points, time_limit_seconds FROM code_questions ORDER BY technology, difficulty').all();
  res.json(questions);
});

// Créer une question MCQ (admin)
router.post('/mcq', authenticate, requireAdmin, (req, res) => {
  const { technology, difficulty, title, description, options, correct_answer, explanation, points } = req.body;
  if (!technology || !title || !description || !options || correct_answer === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO mcq_questions (id, technology, difficulty, title, description, options, correct_answer, explanation, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, technology, difficulty || 1, title, description, JSON.stringify(options), correct_answer, explanation || null, points || 100
  );
  res.status(201).json({ id });
});

// Créer une question de code (admin)
router.post('/code', authenticate, requireAdmin, (req, res) => {
  const { technology, difficulty, title, description, starter_code, solution_code, test_suite, hints, points, time_limit_seconds } = req.body;
  if (!technology || !title || !description || !starter_code || !solution_code || !test_suite) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO code_questions (id, technology, difficulty, title, description, starter_code, solution_code, test_suite, hints, points, time_limit_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, technology, difficulty || 2, title, description, starter_code, solution_code, JSON.stringify(test_suite), hints ? JSON.stringify(hints) : null, points || 300, time_limit_seconds || 300
  );
  res.status(201).json({ id });
});

export default router;
