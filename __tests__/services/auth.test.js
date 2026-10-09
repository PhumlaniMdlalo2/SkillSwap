import { requestPasswordReset, verifyResetCode } from '../../src/services/auth';
import { supabase } from '../../src/services/supabase';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
    from: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestPasswordReset', () => {
  it('sends a 6-digit email OTP without creating accounts', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });

    await requestPasswordReset('reader@example.com');

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'reader@example.com',
      options: {
        shouldCreateUser: false,
      },
    });
  });

  it('throws when the code cannot be sent', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: new Error('rate limit exceeded') });

    await expect(requestPasswordReset('reader@example.com')).rejects.toThrow(
      'rate limit exceeded',
    );
  });
});

describe('verifyResetCode', () => {
  it('verifies the recovery code and returns the profile row', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { user_id: 'user-1', name: 'Sam' },
      error: null,
    });
    supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    const profile = await verifyResetCode('reader@example.com', '482913');

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'reader@example.com',
      token: '482913',
      type: 'recovery',
    });
    expect(maybeSingle).toHaveBeenCalled();
    expect(profile).toEqual({ user_id: 'user-1', name: 'Sam' });
  });

  it('throws when the code is rejected', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: new Error('OTP has expired') });

    await expect(verifyResetCode('reader@example.com', '000000')).rejects.toThrow(
      'OTP has expired',
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
