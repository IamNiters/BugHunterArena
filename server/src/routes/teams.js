import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Lister toutes les équipes avec leurs joueurs
router.get('/', (req, res) => {
  const teams = dbHelpers.getAllTeams();
  const result = teams.map((team) => ({
    ...team,
    players: dbHelpers.getPlayersByTeam(team.id),
  }));
  res.json(result);
});

// Créer une équipe (admin uniquement)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Nom d'équipe requis" });

  const existing = dbHelpers.getTeamByName(name);
  if (existing) return res.status(409).json({ error: "Ce nom d'équipe est déjà pris" });

  const team = { id: uuidv4(), name, color: color || '#6366f1', score: 0, created_at: new Date().toISOString() };
  await dbHelpers.insertTeam(team);
  res.status(201).json(team);
});

// Ajouter un joueur à une équipe (admin uniquement)
router.post('/:teamId/players', authenticate, requireAdmin, async (req, res) => {
  const { teamId } = req.params;
  const { name, technology } = req.body;

  const validTechs = ['javascript', 'php', 'cpp', 'csharp', 'mobile'];
  if (!name || !technology || !validTechs.includes(technology)) {
    return res.status(400).json({ error: 'Nom et technologie valide requis', validTechs });
  }

  const team = dbHelpers.getTeamById(teamId);
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });

  const player = { id: uuidv4(), team_id: teamId, name, technology, created_at: new Date().toISOString() };
  await dbHelpers.insertPlayer(player);
  res.status(201).json(player);
});

// Supprimer une équipe (admin uniquement)
router.delete('/:teamId', authenticate, requireAdmin, async (req, res) => {
  await dbHelpers.deleteTeam(req.params.teamId);
  res.json({ message: 'Équipe supprimée' });
});

export default router;
