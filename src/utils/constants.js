export const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5849C2',
  primaryLight: '#EDEBFC',
  secondary: '#00B894',
  secondaryLight: '#E3FBF5',
  token: '#F5A623',
  tokenLight: '#FEF3DE',
  danger: '#D64034',
  dangerLight: '#FDECEA',
  success: '#00B894',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  border: '#E8E8ED',
  text: '#1A1A1A',
  // Muted/faint text is sized 12-14px, so both must clear WCAG AA (4.5:1)
  // against background/surface rather than just looking "grey enough".
  textMuted: '#5A6270',
  textFaint: '#6F6F79',
  white: '#FFFFFF',
  overlay: 'rgba(26, 26, 26, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const SHADOW = {
  shadowColor: '#1A1A1A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const SKILL_CATEGORIES = [
  'Music',
  'Cooking',
  'Languages',
  'Technology',
  'Fitness',
  'Art & Design',
  'Business',
  'Academics',
  'Crafts',
  'Wellness',
];

export const SESSION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const SESSION_STATUS_LABELS = {
  [SESSION_STATUS.PENDING]: 'Upcoming',
  [SESSION_STATUS.COMPLETED]: 'Completed',
  [SESSION_STATUS.CANCELLED]: 'Cancelled',
};

export const TRANSACTION_TYPE = {
  EARN: 'earn',
  SPEND: 'spend',
};

export const DEFAULT_SESSION_TOKEN_COST = 1;

export const ENDORSEMENT_BADGES = [
  { key: 'explains_simply', label: 'Explains Simply', emoji: '🎯' },
  { key: 'infinite_patience', label: 'Infinite Patience', emoji: '🧘' },
  { key: 'super_punctual', label: 'Super Punctual', emoji: '⚡' },
  { key: 'practical_exercises', label: 'Great Exercises', emoji: '💡' },
  { key: 'conversational_pro', label: 'Conversational Pro', emoji: '🗣️' },
  { key: 'hands_on', label: 'Hands-On & Practical', emoji: '🛠️' },
];

export const XP_REWARDS = {
  SESSION_COMPLETE: 100,
  BOUNTY_HELP: 150,
  FIRST_SWAP_BONUS: 50,
};

export function getLevelInfo(xp = 0) {
  const currentXp = Math.max(0, Number(xp) || 0);
  if (currentXp < 200) {
    return { level: 1, title: 'Novice', minXp: 0, nextXp: 200, progress: Math.min(1, currentXp / 200) };
  }
  if (currentXp < 500) {
    return { level: 2, title: 'Explorer', minXp: 200, nextXp: 500, progress: Math.min(1, (currentXp - 200) / 300) };
  }
  if (currentXp < 1000) {
    return { level: 3, title: 'Practitioner', minXp: 500, nextXp: 1000, progress: Math.min(1, (currentXp - 500) / 500) };
  }
  if (currentXp < 2000) {
    return { level: 4, title: 'Skill Mentor', minXp: 1000, nextXp: 2000, progress: Math.min(1, (currentXp - 1000) / 1000) };
  }
  return { level: 5, title: 'Master Polymath', minXp: 2000, nextXp: 2000, progress: 1 };
}
