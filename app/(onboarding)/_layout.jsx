import React from 'react';
import { Stack, Redirect } from 'expo-router';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { useAuth } from '../../src/store/useAppHooks';

export default function OnboardingLayout() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
