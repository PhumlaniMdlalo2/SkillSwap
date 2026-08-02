import React from 'react';
import { Redirect } from 'expo-router';
import LoadingSpinner from '../src/components/ui/LoadingSpinner';
import { useAuth } from '../src/store/useAppHooks';

export default function Index() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <LoadingSpinner />;

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/welcome'} />;
}
