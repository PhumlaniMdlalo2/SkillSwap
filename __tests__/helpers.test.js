import {
  getInitials,
  capitalize,
  formatTokens,
  formatDate,
  formatTime,
  formatDateTime,
  timeAgo,
  groupSlotsByDay,
  formatDuration,
} from '../src/utils/helpers';

describe('getInitials', () => {
  it('returns empty string for default/empty input', () => {
    expect(getInitials()).toBe('');
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });

  it('returns single initial for a single name', () => {
    expect(getInitials('Ada')).toBe('A');
  });

  it('returns two initials for a multi-word name', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('Grace Brewster Murray Hopper')).toBe('GB');
  });

  it('handles extra whitespace between words', () => {
    expect(getInitials('  Alan   Turing  ')).toBe('AT');
  });

  it('returns only the first two initials, ignoring extra words', () => {
    expect(getInitials('John Ronald Reuel Tolkien')).toBe('JR');
  });

  it('upper-cases lowercase initials', () => {
    expect(getInitials('ada lovelace')).toBe('AL');
  });
});

describe('capitalize', () => {
  it('returns the input unchanged for empty/falsy text', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize()).toBe('');
  });

  it('capitalizes the first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('leaves an already-capitalized word untouched first letter', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('does not lowercase the rest of the string', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });
});

describe('formatTokens', () => {
  it('formats positive amounts with a plus sign', () => {
    expect(formatTokens(5)).toBe('+5 tokens');
  });

  it('uses singular for exactly 1', () => {
    expect(formatTokens(1)).toBe('+1 token');
  });

  it('omits plus sign for negative amounts', () => {
    expect(formatTokens(-3)).toBe('-3 tokens');
  });

  it('formats zero without a sign', () => {
    expect(formatTokens(0)).toBe('0 tokens');
  });

  it('coerces numeric strings', () => {
    expect(formatTokens('2')).toBe('+2 tokens');
  });

  it('falls back to zero for non-numeric input', () => {
    expect(formatTokens('abc')).toBe('0 tokens');
    expect(formatTokens(null)).toBe('0 tokens');
    expect(formatTokens(undefined)).toBe('0 tokens');
  });

  it('handles decimal amounts', () => {
    expect(formatTokens(2.5)).toBe('+2.5 tokens');
  });
});

describe('formatDate', () => {
  it('returns a formatted date string for a valid date', () => {
    const result = formatDate('2024-05-15T12:00:00Z');
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\w{3}, (\w{3} \d{1,2}|\d{1,2} \w{3})$/);
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatTime', () => {
  it('returns a formatted time string for a valid date', () => {
    const result = formatTime('2024-05-15T14:30:00Z');
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns empty string for invalid dates', () => {
    expect(formatTime('not-a-date')).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('combines date and time', () => {
    const result = formatDateTime('2024-05-15T14:30:00Z');
    expect(result).toContain('·');
    expect(result).toMatch(/^\S.*·.*\s\d{1,2}:\d{2}$/);
  });

  it('returns empty-ish when date invalid', () => {
    expect(formatDateTime('bad')).toBe(' · ');
  });
});

describe('timeAgo', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-05-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for a recent date', () => {
    expect(timeAgo('2024-05-15T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo('2024-05-15T11:55:00Z')).toBe('5 minutes ago');
    expect(timeAgo('2024-05-15T11:59:00Z')).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo('2024-05-15T10:00:00Z')).toBe('2 hours ago');
  });

  it('returns days ago', () => {
    expect(timeAgo('2024-05-13T12:00:00Z')).toBe('2 days ago');
  });

  it('returns weeks ago', () => {
    expect(timeAgo('2024-05-01T12:00:00Z')).toBe('2 weeks ago');
  });

  it('returns months ago', () => {
    expect(timeAgo('2024-03-15T12:00:00Z')).toBe('2 months ago');
  });

  it('returns years ago', () => {
    expect(timeAgo('2022-05-15T12:00:00Z')).toBe('2 years ago');
  });

  it('returns empty string for invalid dates', () => {
    expect(timeAgo('bad-date')).toBe('');
  });
});

describe('groupSlotsByDay', () => {
  const slot = (start_time, id) => ({ id, start_time });

  it('returns an empty array for empty input', () => {
    expect(groupSlotsByDay([])).toEqual([]);
  });

  it('groups slots that share the same day', () => {
    const slots = [
      slot('2024-05-15T09:00:00Z', 1),
      slot('2024-05-15T11:00:00Z', 2),
    ];
    const groups = groupSlotsByDay(slots);
    expect(groups).toHaveLength(1);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[0].key).toBe(new Date('2024-05-15T09:00:00Z').toDateString());
    expect(groups[0].label).toBeTruthy();
  });

  it('creates separate groups for different days', () => {
    const slots = [
      slot('2024-05-15T09:00:00Z', 1),
      slot('2024-05-16T09:00:00Z', 2),
    ];
    const groups = groupSlotsByDay(slots);
    expect(groups).toHaveLength(2);
  });

  it('preserves the order of first-day encounter', () => {
    const slots = [
      slot('2024-05-16T09:00:00Z', 1),
      slot('2024-05-15T09:00:00Z', 2),
      slot('2024-05-16T11:00:00Z', 3),
    ];
    const groups = groupSlotsByDay(slots);
    expect(groups[0].slots.map((s) => s.id)).toEqual([1, 3]);
    expect(groups[1].slots.map((s) => s.id)).toEqual([2]);
  });
});

describe('formatDuration', () => {
  it('formats minutes that are under an hour', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(0)).toBe('0 min');
  });

  it('formats exact hours', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(180)).toBe('3h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(150)).toBe('2h 30m');
  });
});
