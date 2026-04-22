import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Connexion admin (mot de passe simple pour la démo)
router.post('/admin', (req, res) => {
  const { password } = req.body;
  if (password !== (process.env.ADMIN_PASSWORD || 'admin2025')) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  const token = jwt.sign({ role: 'admin', id: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'admin' });
});

// Connexion d'une équipe
router.post('/team', (req, res) => {
  const { teamName } = req.body;
  if (!teamName) return res.status(400).json({ error: 'Nom d\'équipe requis' });

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE name = ?').get(teamName);
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });

  const token = jwt.sign({ role: 'team', teamId: team.id, teamName: team.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'team', team });
});

// Connexion d'un joueur
router.post('/player', (req, res) => {
  const { playerName, teamId } = req.body;
  if (!playerName || !teamId) return res.status(400).json({ error: 'Nom du joueur et équipe requis' });

  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE name = ? AND team_id = ?').get(playerName, teamId);
  if (!player) return res.status(404).json({ error: 'Joueur introuvable' });

  const token = jwt.sign({ role: 'player', playerId: player.id, teamId: player.team_id, technology: player.technology }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'player', player });
});

// Connexion spectateur (accès libre)
router.post('/spectator', (req, res) => {
  const token = jwt.sign({ role: 'spectator', id: uuidv4() }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'spectator' });
});

export default router;
