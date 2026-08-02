import { create } from 'zustand';

export const useSwapStore = create((set, get) => ({
  candidates: [],
  currentIndex: 0,
  matches: [],
  swipeHistory: [],
  preferences: {
    skillCategory: null,
    maxDistance: 50,
    notificationsEnabled: true,
  },
  loading: false,
  error: null,

  setCandidates: (candidates) => set({ candidates }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  addMatch: (match) => set({ matches: [match, ...get().matches] }),
  addSwipe: (swipe) => set({ swipeHistory: [swipe, ...get().swipeHistory] }),
  setPreferences: (preferences) =>
    set({ preferences: { ...get().preferences, ...preferences } }),
  resetSwipeQueue: () => set({ candidates: [], currentIndex: 0 }),
}));
