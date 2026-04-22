import { getDb } from '../models/database.js';

export function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    // Rejoindre une salle selon le rôle
    socket.on('join:room', ({ role, teamId }) => {
      socket.join(role);
      if (teamId) socket.join(`team:${teamId}`);
      console.log(`  → ${socket.id} rejoint la salle "${role}"${teamId ? ` et "team:${teamId}"` : ''}`);
    });

    // Demande de l'état actuel du jeu
    socket.on('game:state', () => {
      try {
        const db = getDb();
        const session = db.prepare('SELECT * FROM game_sessions WHERE status != ? ORDER BY created_at DESC LIMIT 1').get('finished');
        if (!session) return socket.emit('game:state', { session: null });

        const currentRound = session.current_round > 0
          ? db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number DESC LIMIT 1').get(session.id)
          : null;

        const scores = db.prepare(`
          SELECT t.id, t.name, t.color, COALESCE(ss.score, 0) as score
          FROM teams t
          LEFT JOIN session_scores ss ON ss.team_id = t.id AND ss.session_id = ?
          ORDER BY score DESC
        `).all(session.id);

        socket.emit('game:state', { session, currentRound, scores });
      } catch (err) {
        socket.emit('game:error', { message: err.message });
      }
    });

    // Ping/pong pour maintenir la connexion
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté : ${socket.id}`);
    });
  });

  // Méthodes utilitaires exportées pour les routes
  io.broadcastRoundStart = (round, question) => {
    io.emit('round:start', { round, question });
  };

  io.broadcastRoundEnd = (round, scores) => {
    io.emit('round:end', { round, scores });
  };

  io.broadcastGameEnd = (finalScores) => {
    io.emit('game:end', { finalScores });
  };
}
