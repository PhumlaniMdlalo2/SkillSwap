import {
  COLORS,
  SPACING,
  RADII,
  FONT_SIZES,
  SHADOW,
  SKILL_CATEGORIES,
  SESSION_STATUS,
  SESSION_STATUS_LABELS,
  TRANSACTION_TYPE,
  DEFAULT_SESSION_TOKEN_COST,
} from '../src/utils/constants';

describe('COLORS', () => {
  it('defines a primary color', () => {
    expect(COLORS.primary).toBe('#6C5CE7');
  });

  it('exposes common semantic colors', () => {
    expect(COLORS.danger).toBe('#E74C3C');
    expect(COLORS.success).toBe('#00B894');
    expect(COLORS.white).toBe('#FFFFFF');
  });

  it('uses color values that look valid', () => {
    Object.entries(COLORS).forEach(([key, value]) => {
      if (key === 'overlay') {
        expect(value).toMatch(/^rgba?\(/);
      } else {
        expect(value).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });
  });
});

describe('SPACING', () => {
  it('defines an ascending scale', () => {
    const values = Object.values(SPACING);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('starts with xs = 4', () => {
    expect(SPACING.xs).toBe(4);
  });
});

describe('RADII', () => {
  it('provides a set of radii', () => {
    expect(RADII.sm).toBe(8);
    expect(RADII.round).toBe(999);
  });
});

describe('FONT_SIZES', () => {
  it('defines an ascending scale', () => {
    const values = Object.values(FONT_SIZES);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('has a readable base size', () => {
    expect(FONT_SIZES.md).toBe(16);
  });
});

describe('SHADOW', () => {
  it('includes platform shadow props', () => {
    expect(SHADOW).toHaveProperty('shadowColor');
    expect(SHADOW).toHaveProperty('shadowOpacity');
    expect(SHADOW).toHaveProperty('elevation');
  });
});

describe('SKILL_CATEGORIES', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(SKILL_CATEGORIES)).toBe(true);
    expect(SKILL_CATEGORIES.length).toBeGreaterThan(0);
    SKILL_CATEGORIES.forEach((c) => expect(typeof c).toBe('string'));
  });

  it('contains expected categories', () => {
    expect(SKILL_CATEGORIES).toContain('Music');
    expect(SKILL_CATEGORIES).toContain('Technology');
    expect(SKILL_CATEGORIES).toContain('Languages');
  });

  it('has no duplicate categories', () => {
    expect(new Set(SKILL_CATEGORIES).size).toBe(SKILL_CATEGORIES.length);
  });
});

describe('SESSION_STATUS', () => {
  it('exposes the correct status values', () => {
    expect(SESSION_STATUS.PENDING).toBe('pending');
    expect(SESSION_STATUS.COMPLETED).toBe('completed');
    expect(SESSION_STATUS.CANCELLED).toBe('cancelled');
  });

  it('SESSION_STATUS_LABELS maps every status', () => {
    Object.values(SESSION_STATUS).forEach((status) => {
      expect(SESSION_STATUS_LABELS[status]).toBeTruthy();
    });
  });
});

describe('TRANSACTION_TYPE', () => {
  it('exposes earn and spend', () => {
    expect(TRANSACTION_TYPE.EARN).toBe('earn');
    expect(TRANSACTION_TYPE.SPEND).toBe('spend');
  });
});

describe('DEFAULT_SESSION_TOKEN_COST', () => {
  it('is a positive number', () => {
    expect(DEFAULT_SESSION_TOKEN_COST).toBe(1);
    expect(typeof DEFAULT_SESSION_TOKEN_COST).toBe('number');
  });
});
