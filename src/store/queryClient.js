import { AppState } from 'react-native';
import { FocusManager, OnlineManager, QueryClient } from '@tanstack/react-query';

// React Native has no window focus / online events — wire both to AppState so
// react-query refetches when the app returns to the foreground and pauses
// retries while it's in the background.
OnlineManager.setEventListener((setOnline) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setOnline(state !== 'background');
  });
  return () => subscription.remove();
});

FocusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is refetched whenever a screen mounts or the app foregrounds —
      // the app has no meaningful client-side cache lifetime.
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = Number(error?.status);
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          return false; // client errors won't fix themselves
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
