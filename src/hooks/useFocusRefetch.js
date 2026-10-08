import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

// Refetches a react-query query while the screen is in focus, matching the
// refetch-on-every-focus behaviour the app had before react-query.
export default function useFocusRefetch(refetch, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (enabled) refetch();
    }, [refetch, enabled]),
  );
}
