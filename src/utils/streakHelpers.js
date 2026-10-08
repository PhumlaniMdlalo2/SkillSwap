/**
 * Streak helper utilities.
 *
 * ISO weeks run Mon → Sun.  The server stores `last_active_week` as
 * "IYYY-WIW" (e.g. "2026-W41").  These helpers mirror that format so the
 * client can show countdowns, detect lapses, and award perfect-week bonuses
 * without extra API calls.
 */

// ─── ISO Week Helpers ────────────────────────────────────────────────

/** Return the ISO week string for a given date, e.g. "2026-W41". */
export function isoWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Return the ISO week string for the previous week. */
export function previousWeekString(date = new Date()) {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 7);
  return isoWeekString(prev);
}

// ─── Countdown to Week End ───────────────────────────────────────────

/**
 * Returns { days, hours, minutes } until next Monday 00:00 UTC.
 * This is the "keep your streak alive" countdown.
 */
export function countdownToWeekEnd(now = new Date()) {
  const dayOfWeek = now.getUTCDay() || 7; // Mon=1 … Sun=7
  const daysLeft = 7 - dayOfWeek; // days remaining until next Monday
  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysLeft + 1,
  ));
  const diff = nextMonday - now;
  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
  };
}

/** Human-readable countdown label. */
export function countdownLabel(now = new Date()) {
  const { days, hours, minutes } = countdownToWeekEnd(now);
  if (days > 0) return `${days}d ${hours}h left this week`;
  if (hours > 0) return `${hours}h ${minutes}m left this week`;
  return `${minutes}m left this week`;
}

// ─── Streak Status ───────────────────────────────────────────────────

/**
 * Classify the user's streak into a status:
 *   - `active`        — already active this ISO week
 *   - `at_risk`       — active last week but not yet this week (streak glowing but ticking)
 *   - `lapsed`        — more than one week gap, streak was broken
 *   - `none`          — never started
 */
export function streakStatus(lastActiveWeek, now = new Date()) {
  if (!lastActiveWeek) return 'none';
  const currentWeek = isoWeekString(now);
  if (lastActiveWeek === currentWeek) return 'active';
  const prevWeek = previousWeekString(now);
  if (lastActiveWeek === prevWeek) return 'at_risk';
  return 'lapsed';
}

/** Emoji + label to show alongside the streak status. */
export function streakStatusMeta(status) {
  switch (status) {
    case 'active':
      return { emoji: '🔥', label: 'Streak alive!', color: '#00B894' };
    case 'at_risk':
      return { emoji: '⏳', label: 'Act before the week ends!', color: '#F5A623' };
    case 'lapsed':
      return { emoji: '💔', label: 'Streak broken — start fresh!', color: '#D64034' };
    default:
      return { emoji: '🌱', label: 'Complete a session to start!', color: '#6C5CE7' };
  }
}

// ─── Perfect-Week Bonus ──────────────────────────────────────────────

/**
 * A "perfect week" is when a user completes ≥ 3 sessions in the same ISO
 * week.  This is tracked client-side only (counts completed sessions in
 * current week).  Returns the bonus XP if earned, 0 otherwise.
 */
export const PERFECT_WEEK_THRESHOLD = 3;
export const PERFECT_WEEK_BONUS_XP = 200;

export function isPerfectWeek(sessionsThisWeek = 0) {
  return sessionsThisWeek >= PERFECT_WEEK_THRESHOLD;
}
