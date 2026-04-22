import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Lister toutes les équipes avec leurs joueurs
router.get('/', (req, res) => {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY score DESC').all();
  const result = teams.map((team) => {
    const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(team.id);
    return { ...team, players };
  });
  res.json(result);
});

// Créer une équipe (admin uniquement)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom d\'équipe requis' });

  const db = getDb();
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO teams (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#6366f1');
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.status(201).json(team);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ce nom d\'équipe est déjà pris' });
    }
    throw err;
  }
});

// Ajouter un joueur à une équipe (admin uniquement)
router.post('/:teamId/players', authenticate, requireAdmin, (req, res) => {
  const { teamId } = req.params;
  const { name, technology } = req.body;

  const validTechs = ['javascript', 'php', 'cpp', 'csharp', 'mobile'];
  if (!name || !technology || !validTechs.includes(technology)) {
    return res.status(400).json({ error: 'Nom et technologie valide requis', validTechs });
  }

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });

  const id = uuidv4();
  db.prepare('INSERT INTO players (id, team_id, name, technology) VALUES (?, ?, ?, ?)').run(id, teamId, name, technology);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  res.status(201).json(player);
});

// Supprimer une équipe (admin uniquement)
router.delete('/:teamId', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.teamId);
  res.json({ message: 'Équipe supprimée' });
});

export default router;
