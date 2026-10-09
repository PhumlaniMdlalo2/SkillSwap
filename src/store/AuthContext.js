import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as authService from '../services/auth';
import { completeRecoveryFromUrl } from '../services/recovery';
import { toUserMessage } from '../utils/errors';
import { notify } from '../utils/alert';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      let resumeRecovery = false;
      try {
        // A password-reset email can be what launched the app. Resolve that
        // deep link BEFORE finishing init, so the router guards never observe
        // a logged-out frame while the recovery session is being created.
        const initialUrl = await Linking.getInitialURL().catch(() => null);
        if (initialUrl) {
          const recovery = await completeRecoveryFromUrl(initialUrl);
          if (recovery.handled) {
            if (recovery.ok) resumeRecovery = true;
            else notify('Link problem', recovery.message);
          }
        }

        const storedUser = await authService.getStoredUser();
        if (!mounted) return;
        setUser(storedUser);
        // The email's redirect can fall back to a bare URL (path `/`), where
        // expo-router would never route to the reset screen on its own.
        if (resumeRecovery) router.replace('/reset-password');
      } catch (error) {
        console.warn('[auth] Failed to restore session:', error.message);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    restore();

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      if (mounted) setUser(nextUser);
    });

    // Recovery link tapped while the app is already open.
    const linkSubscription = Linking.addEventListener('url', async ({ url }) => {
      const recovery = await completeRecoveryFromUrl(url);
      if (!recovery.handled) return;
      if (!recovery.ok) {
        notify('Link problem', recovery.message);
        return;
      }
      // Load the profile before navigating so the reset screen sees the
      // signed-in state straight away.
      const profile = await authService.getStoredUser().catch(() => null);
      if (mounted && profile) setUser(profile);
      router.replace('/reset-password');
    });

    return () => {
      mounted = false;
      unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const loggedInUser = await authService.signIn({ email, password });
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setAuthError(toUserMessage(error, 'Unable to log in.'));
      throw error;
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setAuthError(null);
    try {
      const newUser = await authService.signUp({ name, email, password });
      setUser(newUser);
      return newUser;
    } catch (error) {
      setAuthError(toUserMessage(error, 'Unable to register.'));
      throw error;
    }
  }, []);

  const verifyResetCode = useCallback(async (email, token) => {
    setAuthError(null);
    try {
      const nextUser = await authService.verifyResetCode(email, token);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      setAuthError(toUserMessage(error, 'Invalid or expired code.'));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  // For screens that mutate the profile row themselves (e.g. avatar upload)
  // and already have the fresh row back from Supabase — pushes it into
  // context without a redundant re-fetch.
  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      authError,
      login,
      register,
      verifyResetCode,
      logout,
      updateUser,
    }),
    [user, initializing, authError, login, register, verifyResetCode, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
