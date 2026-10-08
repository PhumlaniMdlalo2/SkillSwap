import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/store/AuthContext';
import { WalletProvider } from '../src/store/WalletContext';
import { useAuth } from '../src/store/useAppHooks';
import { queryClient } from '../src/store/queryClient';
import { COLORS } from '../src/utils/constants';
import { isSupabaseConfigured } from '../src/services/supabase';
import ConfigErrorScreen from '../src/screens/ConfigErrorScreen';

// Cached data belongs to one account — drop it whenever the signed-in user
// changes so a second login never sees the previous user's responses.
function QueryCacheReset() {
  const { user } = useAuth();
  const client = useQueryClient();
  const userId = user?.user_id ?? null;

  useEffect(() => {
    client.clear();
  }, [client, userId]);

  return null;
}

function RootStack() {
  const { isAuthenticated, initializing } = useAuth();
  // While the stored session is still restoring we treat the user as signed
  // in, so a cold-start deep link isn't bounced to the welcome screen before
  // auth has had a chance to resolve.
  const authed = initializing || isAuthenticated;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: COLORS.text,
        headerStyle: { backgroundColor: COLORS.background },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {/* Unguarded: acts as the redirect anchor for failed guards */}
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={authed}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="skills/[id]" options={{ headerShown: true, title: 'Skill' }} />
        <Stack.Screen
          name="skills/add"
          options={{ headerShown: true, title: 'Add a Skill', presentation: 'modal' }}
        />
        <Stack.Screen name="skills/my-skills" options={{ headerShown: true, title: 'My Skills' }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: true, title: 'Profile' }} />
        <Stack.Screen name="requests/index" options={{ headerShown: true, title: 'Requests' }} />
        <Stack.Screen
          name="requests/[id]/schedule"
          options={{ headerShown: true, title: 'Book Appointment' }}
        />
        <Stack.Screen
          name="wallet/transactions"
          options={{ headerShown: true, title: 'Transactions' }}
        />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen name="passport" options={{ headerShown: true, title: 'Skill Passport' }} />
        <Stack.Screen name="sessions/index" options={{ headerShown: true, title: 'My Sessions' }} />
        <Stack.Screen
          name="sessions/[id]/index"
          options={{ headerShown: true, title: 'Session' }}
        />
        <Stack.Screen
          name="sessions/[id]/review"
          options={{ headerShown: true, title: 'Leave a Review', presentation: 'modal' }}
        />
        <Stack.Screen name="swap/[id]" />
        <Stack.Screen name="swap/results" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="swap/history" options={{ headerShown: true, title: 'Swap History' }} />
        <Stack.Screen
          name="swap/settings"
          options={{ headerShown: true, title: 'Skill Match Settings' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <QueryCacheReset />
            <WalletProvider>
              <StatusBar style="dark" />
              <RootStack />
            </WalletProvider>
          </QueryClientProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
