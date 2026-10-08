// Maps backend errors to copy that is safe to show in the UI.
//
// Raw Supabase/PostgREST errors can leak schema or SQL detail, so anything
// that isn't a known-good message falls through to a generic fallback.

const GENERIC = 'Something went wrong. Please try again.';

const NETWORK_MESSAGE = 'You appear to be offline. Check your connection and try again.';

// Postgres `raise exception` (code P0001) only ever comes from our own RPCs,
// where the message is written for end users ("Not enough tokens to book
// this session", "Only the teacher can respond to this request"…).
const INTENTIONAL_RPC_MESSAGES = new Set(['P0001']);

const CODE_MESSAGES = {
  42501: "You don't have permission to do that.",
  40001: 'Please try again — someone else was updating this at the same time.',
  23505: 'That already exists.',
  23503: "That can't be completed — some related data is missing.",
  23514: 'One of the values you entered is not allowed.',
  22001: 'One of the values you entered is too long.',
  22003: 'One of the numbers you entered is out of range.',
  '22P02': 'One of the values you entered has the wrong format.',
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST204: 'Nothing to update.',
  PGRST116: 'The requested record was not found.',
};

const AUTH_CODE_MESSAGES = {
  invalid_credentials: 'Email or password is incorrect.',
  user_already_exists: 'An account with that email already exists.',
  email_not_confirmed: 'Please confirm your email address before signing in.',
  weak_password: 'Choose a password with at least 6 characters.',
  signup_disabled: 'Sign-ups are currently disabled.',
  over_email_send_rate_limit:
    'Too many sign-up attempts — please wait a few minutes and try again.',
  user_not_found: 'No account matches those details.',
  same_password: 'Your new password must be different from the old one.',
  network_error: NETWORK_MESSAGE,
};

const MESSAGE_PATTERNS = [
  [/network request failed|failed to fetch|fetch failed|networkerror/i, NETWORK_MESSAGE],
  [/timeout|timed out/i, 'The request took too long. Please try again.'],
];

export function toUserMessage(error, fallback = GENERIC) {
  if (!error) return fallback;

  const code = error.code ?? error.error_code ?? error.status;
  const rawMessage = typeof error.message === 'string' ? error.message : '';

  if (typeof code === 'string' && AUTH_CODE_MESSAGES[code]) {
    return AUTH_CODE_MESSAGES[code];
  }

  if (INTENTIONAL_RPC_MESSAGES.has(code) && rawMessage) {
    return rawMessage;
  }

  if (typeof code === 'string' && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  // Supabase auth errors carry HTTP statuses instead of our codes above.
  const status = Number(error.status ?? error.statusCode);
  if (status === 400 && /password/i.test(rawMessage)) return AUTH_CODE_MESSAGES.weak_password;
  if (status === 401 || status === 403) return CODE_MESSAGES['42501'];
  if (status === 404) return CODE_MESSAGES.PGRST116;
  if (status === 429) return AUTH_CODE_MESSAGES.over_email_send_rate_limit;

  for (const [pattern, message] of MESSAGE_PATTERNS) {
    if (pattern.test(rawMessage)) return message;
  }

  // An unknown error is almost certainly an internal one — never surface it.
  return fallback;
}
