import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { CURRENT_USER } from '../utils/mockData';

const MOCK_SESSION_KEY = 'skillswap.mockSession';

function buildMockUser({ name, email }) {
  return {
    ...CURRENT_USER,
    name: name || CURRENT_USER.name,
    email: email || CURRENT_USER.email,
  };
}

// The rest of the app reads user_id/name/avatar/rating — fields that live on
// the public.users profile row, not on Supabase Auth's own user object.
async function fetchProfile(authUser) {
  if (!authUser) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    // Auth session with no matching profile row (e.g. a stale cached session
    // from before the on_auth_user_created trigger existed, or a signup that
    // got interrupted). There's nothing to recover — clear it so the app
    // falls back to logged-out instead of crashing on every load.
    await supabase.auth.signOut().catch(() => {});
    return null;
  }

  return data;
}

export async function signUp({ name, email, password }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return fetchProfile(data.user);
  }

  const user = buildMockUser({ name, email });
  await AsyncStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signIn({ email, password }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return fetchProfile(data.user);
  }

  const user = buildMockUser({ email });
  await AsyncStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }
  await AsyncStorage.removeItem(MOCK_SESSION_KEY);
}

export async function getStoredUser() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return fetchProfile(data.session?.user ?? null);
  }

  const raw = await AsyncStorage.getItem(MOCK_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function onAuthStateChange(callback) {
  if (isSupabaseConfigured) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null)
        .then(callback)
        .catch((err) => {
          console.warn('[auth] Failed to load profile after auth state change:', err.message);
          callback(null);
        });
    });
    return () => data.subscription.unsubscribe();
  }
  return () => {};
}
