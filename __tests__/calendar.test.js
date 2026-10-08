import { Linking } from 'react-native';
import {
  formatToUtcCompact,
  getCalendarEventData,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsContent,
  openGoogleCalendar,
} from '../src/utils/calendar';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

describe('calendar utility', () => {
  const mockSession = {
    session_id: 'sess-123',
    skill_title: 'Jazz Piano Basics',
    session_date: '2026-10-15T14:00:00.000Z',
    duration: 90,
  };

  describe('formatToUtcCompact', () => {
    it('formats ISO date string into compact UTC format', () => {
      const result = formatToUtcCompact('2026-10-15T14:00:00.000Z');
      expect(result).toBe('20261015T140000Z');
    });

    it('returns empty string for invalid date', () => {
      expect(formatToUtcCompact('not-a-date')).toBe('');
    });
  });

  describe('getCalendarEventData', () => {
    it('computes end time from duration and formats metadata for teacher', () => {
      const event = getCalendarEventData(mockSession, true);
      expect(event.title).toBe('SkillSwap: Jazz Piano Basics');
      expect(event.description).toContain('Role: Teaching');
      expect(event.description).toContain('Duration: 90 minutes');
      expect(event.startIsoCompact).toBe('20261015T140000Z');
      expect(event.endIsoCompact).toBe('20261015T153000Z');
    });

    it('formats metadata for learner', () => {
      const event = getCalendarEventData(mockSession, false);
      expect(event.description).toContain('Role: Learning');
    });
  });

  describe('generateGoogleCalendarUrl', () => {
    it('generates a valid Google Calendar URL with required query parameters', () => {
      const url = generateGoogleCalendarUrl(mockSession, true);
      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('dates=20261015T140000Z%2F20261015T153000Z');
      expect(url).toContain('text=SkillSwap%3A+Jazz+Piano+Basics');
    });
  });

  describe('generateOutlookCalendarUrl', () => {
    it('generates a valid Outlook Calendar URL', () => {
      const url = generateOutlookCalendarUrl(mockSession, false);
      expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
      expect(url).toContain('subject=SkillSwap%3A+Jazz+Piano+Basics');
    });
  });

  describe('generateIcsContent', () => {
    it('generates valid RFC 5545 iCalendar content', () => {
      const ics = generateIcsContent(mockSession, true);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:session-sess-123@skillswap');
      expect(ics).toContain('DTSTART:20261015T140000Z');
      expect(ics).toContain('DTEND:20261015T153000Z');
      expect(ics).toContain('SUMMARY:SkillSwap: Jazz Piano Basics');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });
  });

  describe('openGoogleCalendar', () => {
    it('calls Linking.openURL with generated URL', async () => {
      await openGoogleCalendar(mockSession, true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('calendar.google.com'),
      );
    });
  });
});
