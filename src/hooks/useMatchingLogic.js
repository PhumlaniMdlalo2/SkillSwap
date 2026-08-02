import { useMemo } from 'react';

export function useMatchingLogic({ allCandidates, preferences }) {
  const filteredCandidates = useMemo(() => {
    if (!allCandidates) return [];
    return allCandidates.filter((candidate) => {
      if (preferences?.skillCategory && candidate.category !== preferences.skillCategory) {
        return false;
      }
      if (preferences?.maxDistance && candidate.distanceKm > preferences.maxDistance) {
        return false;
      }
      return true;
    });
  }, [allCandidates, preferences]);

  return { filteredCandidates };
}
