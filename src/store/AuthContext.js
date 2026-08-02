import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    authService
      .getStoredUser()
      .then((storedUser) => {
        if (mounted) setUser(storedUser);
      })
      .catch((error) => {
        console.warn('[auth] Failed to restore session:', error.message);
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      if (mounted) setUser(nextUser);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const loggedInUser = await authService.signIn({ email, password });
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setAuthError(error.message ?? 'Unable to log in.');
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
      setAuthError(error.message ?? 'Unable to register.');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      authError,
      login,
      register,
      logout,
    }),
    [user, initializing, authError, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
