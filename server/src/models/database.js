import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/bughunter.json');

let db;

const DEFAULT_DATA = {
  teams: [],
  players: [],
  game_sessions: [],
  rounds: [],
  mcq_questions: [],
  code_questions: [],
  submissions: [],
  session_scores: [],
};

export async function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  const adapter = new JSONFile(DB_PATH);
  db = new Low(adapter, DEFAULT_DATA);
  await db.read();

  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!db.data[key]) db.data[key] = [];
  }
  await db.write();

  console.log('✅ Base de données initialisée avec succès');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Base de données non initialisée');
  return db;
}

export const dbHelpers = {
  getAllTeams: () => db.data.teams,
  getTeamById: (id) => db.data.teams.find((t) => t.id === id),
  getTeamByName: (name) => db.data.teams.find((t) => t.name === name),
  insertTeam: async (team) => { db.data.teams.push(team); await db.write(); },
  deleteTeam: async (id) => {
    db.data.teams = db.data.teams.filter((t) => t.id !== id);
    db.data.players = db.data.players.filter((p) => p.team_id !== id);
    await db.write();
  },

  getPlayersByTeam: (teamId) => db.data.players.filter((p) => p.team_id === teamId),
  getPlayerById: (id) => db.data.players.find((p) => p.id === id),
  getPlayerByNameAndTeam: (name, teamId) => db.data.players.find((p) => p.name === name && p.team_id === teamId),
  insertPlayer: async (player) => { db.data.players.push(player); await db.write(); },

  getActiveSession: () => db.data.game_sessions.find((s) => s.status === 'active'),
  getWaitingSession: () => db.data.game_sessions.find((s) => s.status === 'waiting'),
  getLatestNonFinishedSession: () => {
    const sessions = db.data.game_sessions.filter((s) => s.status !== 'finished');
    return sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  },
  insertSession: async (session) => { db.data.game_sessions.push(session); await db.write(); },
  updateSessionStatus: async (id, status, extra = {}) => {
    const s = db.data.game_sessions.find((s) => s.id === id);
    if (s) { Object.assign(s, { status, ...extra }); await db.write(); }
  },
  updateSessionRound: async (id, roundNumber) => {
    const s = db.data.game_sessions.find((s) => s.id === id);
    if (s) { s.current_round = roundNumber; await db.write(); }
  },
  finishAllActiveSessions: async () => {
    db.data.game_sessions.forEach((s) => {
      if (s.status === 'active' || s.status === 'waiting') {
        s.status = 'finished';
        s.finished_at = new Date().toISOString();
      }
    });
    await db.write();
  },

  getRoundsBySession: (sessionId) =>
    db.data.rounds.filter((r) => r.session_id === sessionId).sort((a, b) => a.round_number - b.round_number),
  getLastRoundOfSession: (sessionId) => {
    const rounds = db.data.rounds.filter((r) => r.session_id === sessionId);
    return rounds.sort((a, b) => b.round_number - a.round_number)[0] || null;
  },
  getRoundById: (id) => db.data.rounds.find((r) => r.id === id),
  getUsedQuestionIds: (sessionId, questionType) =>
    db.data.rounds.filter((r) => r.session_id === sessionId && r.question_type === questionType).map((r) => r.question_id),
  insertRound: async (round) => { db.data.rounds.push(round); await db.write(); },

  getAllMCQ: () => db.data.mcq_questions,
  getMCQById: (id) => db.data.mcq_questions.find((q) => q.id === id),
  getRandomMCQ: (technology, excludeIds = []) => {
    const pool = db.data.mcq_questions.filter((q) => q.technology === technology && !excludeIds.includes(q.id));
    const source = pool.length ? pool : db.data.mcq_questions.filter((q) => !excludeIds.includes(q.id));
    return source.length ? source[Math.floor(Math.random() * source.length)] : null;
  },
  insertMCQ: async (q) => { db.data.mcq_questions.push(q); await db.write(); },

  getAllCode: () => db.data.code_questions,
  getCodeById: (id) => db.data.code_questions.find((q) => q.id === id),
  getRandomCode: (technology, excludeIds = []) => {
    const pool = db.data.code_questions.filter((q) => q.technology === technology && !excludeIds.includes(q.id));
    const source = pool.length ? pool : db.data.code_questions.filter((q) => !excludeIds.includes(q.id));
    return source.length ? source[Math.floor(Math.random() * source.length)] : null;
  },
  insertCode: async (q) => { db.data.code_questions.push(q); await db.write(); },

  getSubmissionByRoundAndTeam: (roundId, teamId) =>
    db.data.submissions.find((s) => s.round_id === roundId && s.team_id === teamId),
  getCorrectSubmissionCount: (roundId) =>
    db.data.submissions.filter((s) => s.round_id === roundId && s.is_correct).length,
  insertSubmission: async (sub) => { db.data.submissions.push(sub); await db.write(); },

  getSessionScores: (sessionId) => {
    const teams = db.data.teams;
    return teams.map((t) => {
      const ss = db.data.session_scores.find((s) => s.session_id === sessionId && s.team_id === t.id);
      return { id: t.id, name: t.name, color: t.color, score: ss?.score || 0 };
    }).sort((a, b) => b.score - a.score);
  },
  initSessionScores: async (sessionId, teamIds) => {
    for (const teamId of teamIds) {
      const exists = db.data.session_scores.find((s) => s.session_id === sessionId && s.team_id === teamId);
      if (!exists) db.data.session_scores.push({ id: `${sessionId}_${teamId}`, session_id: sessionId, team_id: teamId, score: 0 });
    }
    await db.write();
  },
  addSessionScore: async (sessionId, teamId, points) => {
    const ss = db.data.session_scores.find((s) => s.session_id === sessionId && s.team_id === teamId);
    if (ss) { ss.score = (ss.score || 0) + points; await db.write(); }
    else {
      db.data.session_scores.push({ id: `${sessionId}_${teamId}`, session_id: sessionId, team_id: teamId, score: points });
      await db.write();
    }
  },
};
