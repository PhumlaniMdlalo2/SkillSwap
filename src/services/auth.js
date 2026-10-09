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

// Sends a 6-digit code via the Email OTP template. shouldCreateUser: false
// keeps "forgot password" from silently creating accounts. No emailRedirectTo:
// that would switch GoTrue to a Magic Link email carrying a long token that
// doesn't match the app's 6-digit code screen.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });
  if (error) throw error;
}

// Exchanges the emailed code for a session, so the reset screen can call
// updateUser straight away — no deep link involved.
//
// This must verify as type 'recovery', not 'email': because requestPasswordReset
// sends create_user=false, GoTrue treats it as a password-recovery OTP and stores
// the code against recovery_token. Type 'email' would hash-check against the
// wrong token column and reject even the correct code.
export async function verifyResetCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  if (error) throw error;
  return fetchProfile(data.user);
}

// Requires a live session — the app only lands here after the recovery
// deep link has been exchanged for one.
export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
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
