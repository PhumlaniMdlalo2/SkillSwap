import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/store/AuthContext';
import { WalletProvider } from '../src/store/WalletContext';
import { COLORS } from '../src/utils/constants';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <WalletProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                headerTintColor: COLORS.text,
                headerStyle: { backgroundColor: COLORS.background },
                contentStyle: { backgroundColor: COLORS.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
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
              <Stack.Screen name="requests/[id]/schedule" options={{ headerShown: true, title: 'Book Appointment' }} />
              <Stack.Screen name="wallet/transactions" options={{ headerShown: true, title: 'Transactions' }} />
              <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
              <Stack.Screen name="sessions/[id]/index" options={{ headerShown: true, title: 'Session' }} />
              <Stack.Screen
                name="sessions/[id]/review"
                options={{ headerShown: true, title: 'Leave a Review', presentation: 'modal' }}
              />
              <Stack.Screen name="swap/[id]" />
              <Stack.Screen name="swap/results" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="swap/history" options={{ headerShown: true, title: 'Swap History' }} />
              <Stack.Screen name="swap/settings" options={{ headerShown: true, title: 'Skill Match Settings' }} />
            </Stack>
          </WalletProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
