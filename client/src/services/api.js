import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Injecter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('bha-auth') || '{}');
  const token = auth?.state?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestion globale des erreurs
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('bha-auth');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  loginAdmin: (password) => api.post('/auth/admin', { password }),
  loginTeam: (teamName) => api.post('/auth/team', { teamName }),
  loginPlayer: (playerName, teamId) => api.post('/auth/player', { playerName, teamId }),
  loginSpectator: () => api.post('/auth/spectator'),
};

// Teams
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  addPlayer: (teamId, data) => api.post(`/teams/${teamId}/players`, data),
  delete: (teamId) => api.delete(`/teams/${teamId}`),
};

// Game
export const gameAPI = {
  getSession: () => api.get('/game/session'),
  createSession: (maxRounds) => api.post('/game/session', { maxRounds }),
  startSession: () => api.post('/game/session/start'),
  nextRound: (questionType) => api.post('/game/session/round', { questionType }),
  finishSession: () => api.post('/game/session/finish'),
  getLeaderboard: () => api.get('/game/leaderboard'),
};

// Questions
export const questionsAPI = {
  getMCQ: (id) => api.get(`/questions/mcq/${id}`),
  getCode: (id) => api.get(`/questions/code/${id}`),
  listMCQ: () => api.get('/questions/mcq'),
  listCode: () => api.get('/questions/code'),
};

// Submissions
export const submissionsAPI = {
  submitMCQ: (roundId, answer) => api.post('/submissions/mcq', { roundId, answer }),
  submitCode: (roundId, code) => api.post('/submissions/code', { roundId, code }),
};

export default api;
