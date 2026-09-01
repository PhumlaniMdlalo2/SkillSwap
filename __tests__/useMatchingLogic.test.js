import { renderHook } from '@testing-library/react-native';
import { useMatchingLogic } from '../src/hooks/useMatchingLogic';

const candidates = [
  { id: 1, category: 'Music' },
  { id: 2, category: 'Cooking' },
  { id: 3, category: 'Music' },
  { id: 4, category: 'Languages' },
];

describe('useMatchingLogic', () => {
  it('returns an empty list when allCandidates is undefined', async () => {
    const { result } = await renderHook(() => useMatchingLogic({ allCandidates: undefined, preferences: {} }));
    expect(result.current.filteredCandidates).toEqual([]);
  });

  it('returns an empty list when allCandidates is null', async () => {
    const { result } = await renderHook(() => useMatchingLogic({ allCandidates: null, preferences: {} }));
    expect(result.current.filteredCandidates).toEqual([]);
  });

  it('returns all candidates when no category preference is set', async () => {
    const { result } = await renderHook(() =>
      useMatchingLogic({ allCandidates: candidates, preferences: { skillCategory: null } })
    );
    expect(result.current.filteredCandidates).toEqual(candidates);
  });

  it('filters candidates by the preferred category', async () => {
    const { result } = await renderHook(() =>
      useMatchingLogic({ allCandidates: candidates, preferences: { skillCategory: 'Music' } })
    );
    expect(result.current.filteredCandidates.map((c) => c.id)).toEqual([1, 3]);
  });

  it('returns an empty list when no candidate matches the preference', async () => {
    const { result } = await renderHook(() =>
      useMatchingLogic({ allCandidates: candidates, preferences: { skillCategory: 'Wellness' } })
    );
    expect(result.current.filteredCandidates).toEqual([]);
  });

  it('refilters when switching categories', async () => {
    const { result, rerender } = await renderHook(
      ({ prefs }) => useMatchingLogic({ allCandidates: candidates, preferences: prefs }),
      { initialProps: { prefs: { skillCategory: 'Music' } } }
    );
    expect(result.current.filteredCandidates).toHaveLength(2);

    await rerender({ prefs: { skillCategory: 'Cooking' } });
    expect(result.current.filteredCandidates.map((c) => c.id)).toEqual([2]);
  });
});