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
    expect(COLORS.danger).toBe('#D64034');
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

describe('color contrast (WCAG AA)', () => {
  const channel = (value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const luminance = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (
      0.2126 * channel((n >> 16) & 255) +
      0.7152 * channel((n >> 8) & 255) +
      0.0722 * channel(n & 255)
    );
  };

  const ratio = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  const pairs = [
    ['muted text on background', COLORS.textMuted, COLORS.background],
    ['muted text on surface', COLORS.textMuted, COLORS.surface],
    ['faint text on background', COLORS.textFaint, COLORS.background],
    ['faint text on surface', COLORS.textFaint, COLORS.surface],
    ['body text on background', COLORS.text, COLORS.background],
    ['white on primary', COLORS.white, COLORS.primary],
    ['white on danger', COLORS.white, COLORS.danger],
  ];

  it.each(pairs)('%s meets 4.5:1', (label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
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
