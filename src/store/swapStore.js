import { create } from 'zustand';

export const useSwapStore = create((set, get) => ({
  candidates: [],
  currentIndex: 0,
  preferences: {
    skillCategory: null,
    notificationsEnabled: true,
  },

  setCandidates: (candidates) => set({ candidates }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setPreferences: (preferences) => set({ preferences: { ...get().preferences, ...preferences } }),
  resetSwipeQueue: () => set({ candidates: [], currentIndex: 0 }),
}));
