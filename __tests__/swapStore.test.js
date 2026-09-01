import { useSwapStore } from '../src/store/swapStore';

describe('useSwapStore', () => {
  beforeEach(() => {
    useSwapStore.setState({
      candidates: [],
      currentIndex: 0,
      matches: [],
      swipeHistory: [],
      preferences: { skillCategory: null, notificationsEnabled: true },
      loading: false,
      error: null,
    });
  });

  it('has sensible initial state', () => {
    const state = useSwapStore.getState();
    expect(state.candidates).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.matches).toEqual([]);
    expect(state.swipeHistory).toEqual([]);
    expect(state.preferences).toEqual({
      skillCategory: null,
      notificationsEnabled: true,
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('setCandidates replaces the candidate list', () => {
    const candidates = [{ id: 'a' }, { id: 'b' }];
    useSwapStore.getState().setCandidates(candidates);
    expect(useSwapStore.getState().candidates).toEqual(candidates);
  });

  it('setCurrentIndex updates the index', () => {
    useSwapStore.getState().setCurrentIndex(3);
    expect(useSwapStore.getState().currentIndex).toBe(3);
  });

  it('addMatch prepends a match', () => {
    useSwapStore.getState().addMatch({ id: 1 });
    useSwapStore.getState().addMatch({ id: 2 });
    expect(useSwapStore.getState().matches.map((m) => m.id)).toEqual([2, 1]);
  });

  it('addSwipe prepends to swipe history', () => {
    useSwapStore.getState().addSwipe({ targetId: 'x' });
    useSwapStore.getState().addSwipe({ targetId: 'y' });
    expect(useSwapStore.getState().swipeHistory.map((s) => s.targetId)).toEqual(['y', 'x']);
  });

  it('setPreferences merges partial preferences', () => {
    useSwapStore.getState().setPreferences({ skillCategory: 'Music' });
    expect(useSwapStore.getState().preferences).toEqual({
      skillCategory: 'Music',
      notificationsEnabled: true,
    });

    useSwapStore.getState().setPreferences({ notificationsEnabled: false });
    expect(useSwapStore.getState().preferences).toEqual({
      skillCategory: 'Music',
      notificationsEnabled: false,
    });
  });

  it('resetSwipeQueue clears candidates and index', () => {
    useSwapStore.getState().setCandidates([{ id: 1 }]);
    useSwapStore.getState().setCurrentIndex(1);
    useSwapStore.getState().resetSwipeQueue();
    expect(useSwapStore.getState().candidates).toEqual([]);
    expect(useSwapStore.getState().currentIndex).toBe(0);
  });

  it('resetSwipeQueue leaves matches and history intact', () => {
    useSwapStore.getState().addMatch({ id: 'm1' });
    useSwapStore.getState().addSwipe({ targetId: 's1' });
    useSwapStore.getState().resetSwipeQueue();
    expect(useSwapStore.getState().matches).toHaveLength(1);
    expect(useSwapStore.getState().swipeHistory).toHaveLength(1);
  });
});