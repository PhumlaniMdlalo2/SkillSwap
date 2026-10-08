import { Linking } from 'react-native';

/**
 * Formats a JS Date into Google / iCal format: YYYYMMDDTHHmmssZ
 */
export function formatToUtcCompact(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Extracts and prepares session event metadata
 */
export function getCalendarEventData(session, isTeacher) {
  const startDate = new Date(session.session_date);
  const durationMinutes = Number(session.duration) || 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const title = `SkillSwap: ${session.skill_title || 'Skill Session'}`;
  const roleText = isTeacher ? 'Teaching' : 'Learning';
  const description = `SkillSwap Session: ${session.skill_title}\nRole: ${roleText}\nDuration: ${durationMinutes} minutes\nSession ID: ${session.session_id}`;

  return {
    title,
    startDate,
    endDate,
    startIsoCompact: formatToUtcCompact(startDate),
    endIsoCompact: formatToUtcCompact(endDate),
    description,
  };
}

/**
 * Generates a Google Calendar web link
 */
export function generateGoogleCalendarUrl(session, isTeacher) {
  const event = getCalendarEventData(session, isTeacher);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.startIsoCompact}/${event.endIsoCompact}`,
    details: event.description,
    location: 'SkillSwap App',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook Web Calendar link
 */
export function generateOutlookCalendarUrl(session, isTeacher) {
  const event = getCalendarEventData(session, isTeacher);
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description,
    location: 'SkillSwap App',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates raw iCalendar (.ics) string
 */
export function generateIcsContent(session, isTeacher) {
  const event = getCalendarEventData(session, isTeacher);
  const nowCompact = formatToUtcCompact(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SkillSwap//Session Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:session-${session.session_id}@skillswap`,
    `DTSTAMP:${nowCompact}`,
    `DTSTART:${event.startIsoCompact}`,
    `DTEND:${event.endIsoCompact}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    'LOCATION:SkillSwap App',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Opens Google Calendar directly via URL
 */
export async function openGoogleCalendar(session, isTeacher) {
  const url = generateGoogleCalendarUrl(session, isTeacher);
  return Linking.openURL(url);
}

/**
 * Opens Outlook Calendar directly via URL
 */
export async function openOutlookCalendar(session, isTeacher) {
  const url = generateOutlookCalendarUrl(session, isTeacher);
  return Linking.openURL(url);
}

/**
 * Opens standard calendar (falls back to Google Calendar on web / Android)
 */
export async function openDefaultCalendar(session, isTeacher) {
  return openGoogleCalendar(session, isTeacher);
}
