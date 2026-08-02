export const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5849C2',
  primaryLight: '#EDEBFC',
  secondary: '#00B894',
  secondaryLight: '#E3FBF5',
  token: '#F5A623',
  tokenLight: '#FEF3DE',
  danger: '#E74C3C',
  dangerLight: '#FDECEA',
  success: '#00B894',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  border: '#E8E8ED',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  textFaint: '#A0A0AB',
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
