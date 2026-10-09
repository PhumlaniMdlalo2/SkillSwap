import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// Where the recovery email sends the user. `createURL` resolves to
// `skillswap://reset-password` in a dev build / production, to the Expo Go
// `exp://…` URL while developing on a device, and to the web origin on web —
// all of which must be allow-listed under Auth → URL Configuration.
export function recoveryRedirectUrl() {
  return Linking.createURL('reset-password');
}

const LINK_INVALID_MESSAGE =
  'Your reset link has expired or is no longer valid. Please request a new one.';

function parseParams(str) {
  const out = {};
  for (const [key, value] of new URLSearchParams(str)) out[key] = value;
  return out;
}

// Pulls auth params out of a recovery deep link. The implicit flow puts them
// in the hash (`#access_token=…&refresh_token=…&type=recovery`), but
// query-string variants (PKCE `?code=…`, error redirects) are handled too.
export function parseRecoveryUrl(url) {
  const [base, hash = ''] = String(url).split('#');
  const queryIndex = base.indexOf('?');
  const params = {
    ...parseParams(queryIndex === -1 ? '' : base.slice(queryIndex + 1)),
    ...parseParams(hash),
  };

  if (params.error) return { kind: 'error' };
  if (params.access_token && params.refresh_token) {
    return {
      kind: 'session',
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
    };
  }
  if (params.code) return { kind: 'code', code: params.code };
  return null;
}

// Completes a recovery deep link by exchanging the tokens it carries for a
// live session, so the reset screen can call `updateUser({ password })`.
// Returns { handled, ok, message } — handled=false means the URL was not an
// auth/recovery link and the caller should ignore it.
export async function completeRecoveryFromUrl(url) {
  if (!supabase) return { handled: false };

  const parsed = parseRecoveryUrl(url);
  if (!parsed) return { handled: false };

  if (parsed.kind === 'error') {
    console.warn('[recovery] Link redirected with an error:', url);
    return { handled: true, ok: false, message: LINK_INVALID_MESSAGE };
  }

  const { error } =
    parsed.kind === 'session'
      ? await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        })
      : await supabase.auth.exchangeCodeForSession(parsed.code);

  if (error) {
    console.warn('[recovery] Could not complete recovery:', error.message);
    return { handled: true, ok: false, message: LINK_INVALID_MESSAGE };
  }

  // On web the tokens sit in the address bar — strip them so a refresh
  // doesn't replay an already-consumed link and they stay out of history.
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { handled: true, ok: true };
}
