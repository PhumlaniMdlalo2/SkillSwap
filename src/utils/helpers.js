export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function capitalize(text = '') {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

export function formatTokens(amount) {
  const value = Number(amount) || 0;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value} token${Math.abs(value) === 1 ? '' : 's'}`;
}

export function formatDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(dateInput) {
  return `${formatDate(dateInput)} · ${formatTime(dateInput)}`;
}

export function timeAgo(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const ranges = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secondsInUnit] of ranges) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// Buckets a list of { start_time } slots into same-day groups, in the order
// each day is first encountered — used anywhere a flat slot list would
// otherwise repeat the same date on every row.
export function groupSlotsByDay(slots) {
  const groups = [];
  const byKey = new Map();
  for (const slot of slots) {
    const key = new Date(slot.start_time).toDateString();
    if (!byKey.has(key)) {
      const group = { key, label: formatDate(slot.start_time), slots: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).slots.push(slot);
  }
  return groups;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
