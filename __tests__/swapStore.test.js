import { useSwapStore } from '../src/store/swapStore';

describe('useSwapStore', () => {
  beforeEach(() => {
    useSwapStore.setState({
      candidates: [],
      currentIndex: 0,
      preferences: { skillCategory: null, notificationsEnabled: true },
    });
  });

  it('has sensible initial state', () => {
    const state = useSwapStore.getState();
    expect(state.candidates).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.preferences).toEqual({
      skillCategory: null,
      notificationsEnabled: true,
    });
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
});
