import { parseRecoveryUrl, completeRecoveryFromUrl } from '../../src/services/recovery';
import { supabase } from '../../src/services/supabase';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.setSession.mockResolvedValue({ error: null });
  supabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.warn.mockRestore();
});

describe('parseRecoveryUrl', () => {
  it('extracts implicit-flow tokens from the hash', () => {
    expect(
      parseRecoveryUrl('skillswap://reset-password#access_token=at&refresh_token=rt&type=recovery'),
    ).toEqual({ kind: 'session', accessToken: 'at', refreshToken: 'rt' });
  });

  it('extracts a PKCE code from the query string', () => {
    expect(parseRecoveryUrl('skillswap://reset-password?code=abc123')).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('detects error redirects', () => {
    expect(
      parseRecoveryUrl('skillswap://reset-password#error=access_denied&error_description=expired'),
    ).toEqual({ kind: 'error' });
  });

  it('ignores urls with no auth params', () => {
    expect(parseRecoveryUrl('skillswap://reset-password')).toBeNull();
    expect(parseRecoveryUrl('https://example.com/profile/42')).toBeNull();
  });
});

describe('completeRecoveryFromUrl', () => {
  it('sets a session from hash tokens', async () => {
    const result = await completeRecoveryFromUrl(
      'skillswap://reset-password#access_token=at&refresh_token=rt&type=recovery',
    );

    expect(result).toEqual({ handled: true, ok: true });
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('exchanges a PKCE code for a session', async () => {
    const result = await completeRecoveryFromUrl('skillswap://reset-password?code=abc123');

    expect(result).toEqual({ handled: true, ok: true });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('reports a friendly failure when the link is rejected', async () => {
    supabase.auth.setSession.mockResolvedValue({ error: { message: 'invalid claim' } });

    const result = await completeRecoveryFromUrl(
      'skillswap://reset-password#access_token=at&refresh_token=rt',
    );

    expect(result).toEqual({
      handled: true,
      ok: false,
      message: expect.stringContaining('no longer valid'),
    });
  });

  it('reports a friendly failure for expired-link redirects', async () => {
    const result = await completeRecoveryFromUrl('skillswap://reset-password#error=access_denied');

    expect(result).toEqual({
      handled: true,
      ok: false,
      message: expect.stringContaining('no longer valid'),
    });
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('ignores urls that are not recovery links', async () => {
    const result = await completeRecoveryFromUrl('skillswap://profile/42');

    expect(result).toEqual({ handled: false });
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
