import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/bughunter.db');

let db;

export function getDb() {
  if (!db) throw new Error('Base de données non initialisée');
  return db;
}

export async function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Table des équipes
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1',
      score INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des joueurs (experts par technologie)
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      technology TEXT NOT NULL CHECK(technology IN ('javascript','php','cpp','csharp','mobile')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    -- Table des sessions de jeu
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','active','finished')),
      current_round INTEGER NOT NULL DEFAULT 0,
      max_rounds INTEGER NOT NULL DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME
    );

    -- Table des manches (rounds)
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      technology TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('mcq','code')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
    );

    -- Table des questions QCM
    CREATE TABLE IF NOT EXISTS mcq_questions (
      id TEXT PRIMARY KEY,
      technology TEXT NOT NULL,
      difficulty INTEGER NOT NULL DEFAULT 1 CHECK(difficulty IN (1,2,3)),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON array de 4 options
      correct_answer INTEGER NOT NULL CHECK(correct_answer BETWEEN 0 AND 3),
      explanation TEXT,
      points INTEGER NOT NULL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des questions de code (IDE + TDD)
    CREATE TABLE IF NOT EXISTS code_questions (
      id TEXT PRIMARY KEY,
      technology TEXT NOT NULL,
      difficulty INTEGER NOT NULL DEFAULT 2 CHECK(difficulty IN (1,2,3)),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      starter_code TEXT NOT NULL,   -- Code de départ fourni au joueur
      solution_code TEXT NOT NULL,  -- Solution de référence (non exposée)
      test_suite TEXT NOT NULL,     -- Suite de tests TDD (JSON)
      hints TEXT,                   -- Indices optionnels (JSON array)
      points INTEGER NOT NULL DEFAULT 300,
      time_limit_seconds INTEGER NOT NULL DEFAULT 300,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des soumissions
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('mcq','code')),
      answer TEXT NOT NULL,          -- Index (MCQ) ou code source (code)
      is_correct INTEGER NOT NULL DEFAULT 0,
      tests_passed INTEGER DEFAULT 0,
      tests_total INTEGER DEFAULT 0,
      execution_time_ms INTEGER DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (round_id) REFERENCES rounds(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    -- Table des scores par session
    CREATE TABLE IF NOT EXISTS session_scores (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE(session_id, team_id)
    );
  `);

  console.log('✅ Base de données initialisée avec succès');
  return db;
}
