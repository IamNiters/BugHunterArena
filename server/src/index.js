import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDatabase } from './models/database.js';
import { setupSocket } from './socket/gameSocket.js';

import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import gameRoutes from './routes/game.js';
import questionRoutes from './routes/questions.js';
import submissionRoutes from './routes/submissions.js';
import soloRoutes from './routes/solo.js';

const app = express();
const httpServer = createServer(app);

// Socket.io avec CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middlewares de sécurité
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/solo', soloRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur',
  });
});

// Initialisation de la base de données puis démarrage
const PORT = process.env.PORT || 3001;

initDatabase()
  .then(() => {
    setupSocket(io);
    httpServer.listen(PORT, () => {
      console.log(`🚀 Serveur Bug Hunter Arena démarré sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erreur lors de l\'initialisation de la base de données :', err);
    process.exit(1);
  });

// io est géré dans gameSocket.js via getIo()
