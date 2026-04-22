import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      setAuth: (token, role, user) => set({ token, role, user }),
      logout: () => set({ token: null, role: null, user: null }),
    }),
    { name: 'bha-auth' }
  )
);

export const useGameStore = create((set, get) => ({
  session: null,
  currentRound: null,
  scores: [],
  recentSubmission: null,

  setSession: (session) => set({ session }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setScores: (scores) => set({ scores }),
  setRecentSubmission: (sub) => set({ recentSubmission: sub }),

  updateScore: (teamId, delta) => {
    const scores = get().scores.map((s) =>
      s.id === teamId ? { ...s, score: s.score + delta } : s
    );
    set({ scores: [...scores].sort((a, b) => b.score - a.score) });
  },
}));
