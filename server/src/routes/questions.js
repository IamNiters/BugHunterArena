import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Récupérer une question MCQ par ID (sans la réponse correcte)
router.get('/mcq/:id', authenticate, (req, res) => {
  const q = dbHelpers.getMCQById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question introuvable' });
  const { correct_answer, explanation, ...safe } = q;
  res.json({ ...safe, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options });
});

// Récupérer une question de code par ID (sans la solution)
router.get('/code/:id', authenticate, (req, res) => {
  const q = dbHelpers.getCodeById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question introuvable' });
  const { solution_code, ...safe } = q;
  res.json({
    ...safe,
    test_suite: typeof q.test_suite === 'string' ? JSON.parse(q.test_suite) : q.test_suite,
    hints: q.hints ? (typeof q.hints === 'string' ? JSON.parse(q.hints) : q.hints) : [],
  });
});

// Lister toutes les questions MCQ (admin)
router.get('/mcq', authenticate, requireAdmin, (req, res) => {
  const questions = dbHelpers.getAllMCQ().map(({ id, technology, difficulty, title, points }) => ({ id, technology, difficulty, title, points }));
  res.json(questions);
});

// Lister toutes les questions de code (admin)
router.get('/code', authenticate, requireAdmin, (req, res) => {
  const questions = dbHelpers.getAllCode().map(({ id, technology, difficulty, title, points, time_limit_seconds }) => ({ id, technology, difficulty, title, points, time_limit_seconds }));
  res.json(questions);
});

// Créer une question MCQ (admin)
router.post('/mcq', authenticate, requireAdmin, async (req, res) => {
  const { technology, difficulty, title, description, options, correct_answer, explanation, points } = req.body;
  if (!technology || !title || !description || !options || correct_answer === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  const q = {
    id: uuidv4(), technology, difficulty: difficulty || 1, title, description,
    options: JSON.stringify(options), correct_answer, explanation: explanation || null,
    points: points || 100, created_at: new Date().toISOString(),
  };
  await dbHelpers.insertMCQ(q);
  res.status(201).json({ id: q.id });
});

// Créer une question de code (admin)
router.post('/code', authenticate, requireAdmin, async (req, res) => {
  const { technology, difficulty, title, description, starter_code, solution_code, test_suite, hints, points, time_limit_seconds } = req.body;
  if (!technology || !title || !description || !starter_code || !solution_code || !test_suite) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  const q = {
    id: uuidv4(), technology, difficulty: difficulty || 2, title, description,
    starter_code, solution_code, test_suite: JSON.stringify(test_suite),
    hints: hints ? JSON.stringify(hints) : null, points: points || 300,
    time_limit_seconds: time_limit_seconds || 300, created_at: new Date().toISOString(),
  };
  await dbHelpers.insertCode(q);
  res.status(201).json({ id: q.id });
});

export default router;
