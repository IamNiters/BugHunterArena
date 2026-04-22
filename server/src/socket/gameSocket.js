import { dbHelpers } from '../models/database.js';

let _io = null;

export function getIo() {
  if (!_io) throw new Error('Socket.io non initialisé');
  return _io;
}

export function setupSocket(io) {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    // Rejoindre une salle selon le rôle
    socket.on('join:room', ({ role, teamId }) => {
      socket.join(role);
      if (teamId) socket.join(`team:${teamId}`);
      console.log(`  → ${socket.id} rejoint "${role}"${teamId ? ` + "team:${teamId}"` : ''}`);
    });

    // Demande de l'état actuel du jeu
    socket.on('game:state', () => {
      try {
        const session = dbHelpers.getLatestNonFinishedSession();
        if (!session) return socket.emit('game:state', { session: null });

        const currentRound = dbHelpers.getLastRoundOfSession(session.id);
        const scores = dbHelpers.getSessionScores(session.id);

        socket.emit('game:state', { session, currentRound, scores });
      } catch (err) {
        socket.emit('game:error', { message: err.message });
      }
    });

    // Broadcast du démarrage d'un round (depuis l'admin)
    socket.on('round:start', (data) => {
      io.emit('round:start', data);
    });

    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté : ${socket.id}`);
    });
  });
}
