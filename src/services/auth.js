import { supabase } from './supabase';

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return fetchProfile(data.user);
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return fetchProfile(data.user);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getStoredUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return fetchProfile(data.session?.user ?? null);
}

export function onAuthStateChange(callback) {
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
