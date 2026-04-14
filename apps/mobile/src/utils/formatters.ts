import { colors } from '@theme/colors';

// ─── Timezone-safe date parsing ───────────────────────────────────────────
//
// Backend sends timestamps in UTC. Some come WITH 'Z' suffix (ISO 8601),
// some WITHOUT. Without 'Z', JavaScript's Date constructor treats the string
// as LOCAL time, giving wrong results.
//
// We always append 'Z' if missing so JS always parses as UTC, then let
// toLocaleString render in the device's local timezone (Europe/Dublin).
//
// Ireland timezone:
//   Winter (Oct–Mar): GMT / UTC+0  (GMT)
//   Summer (Mar–Oct): BST / UTC+1  (British Summer Time)
// The device OS handles DST automatically when we pass timeZone:'Europe/Dublin'.

const ensureUTC = (iso: string): string => {
  if (!iso) return iso;
  // Already has timezone offset (+HH:MM or Z)
  if (iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso)) return iso;
  // Naive datetime string — treat as UTC
  return iso + 'Z';
};

// Full datetime: "13 Apr 2026, 19:38"
export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(ensureUTC(iso));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IE', {
      timeZone:  'Europe/Dublin',
      day:       'numeric',
      month:     'short',
      year:      'numeric',
      hour:      '2-digit',
      minute:    '2-digit',
      hour12:    false,
    });
  } catch { return '—'; }
};

// Time only: "19:38"
export const formatTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(ensureUTC(iso));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IE', {
      timeZone: 'Europe/Dublin',
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   false,
    });
  } catch { return '—'; }
};

// Date only: "13 Apr 2026"
export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(ensureUTC(iso));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IE', {
      timeZone: 'Europe/Dublin',
      day:      'numeric',
      month:    'short',
      year:     'numeric',
    });
  } catch { return '—'; }
};

// Short date+time without year: "13 Apr, 19:38"
export const formatShortDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(ensureUTC(iso));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IE', {
      timeZone: 'Europe/Dublin',
      day:      'numeric',
      month:    'short',
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   false,
    });
  } catch { return '—'; }
};

// Relative time: "just now", "5m ago", "2h ago", "13 Apr, 19:38"
export const formatTimeAgo = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(ensureUTC(iso));
    if (isNaN(d.getTime())) return '—';
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1)    return 'just now';
    if (diffMin < 60)   return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return formatShortDateTime(iso);
  } catch { return '—'; }
};



export const getTimeAgo = (date: Date): string => {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
};

export const getDisasterIcon = (type: string): string => {
  const icons: Record<string, string> = {
    flood: '🌊', fire: '🔥', earthquake: '🏚️', hurricane: '🌀',
    tornado: '🌪️', tsunami: '🌊', drought: '☀️', heatwave: '🌡️',
    coldwave: '🥶', storm: '⛈️', other: '⚠️',
  };
  return icons[type?.toLowerCase()] ?? '📍';
};

export const getSeverityColor = (severity: string): string => {
  const map: Record<string, string> = {
    critical: colors.error,
    high: colors.coral,
    medium: colors.warning,
    low: colors.primary,
  };
  return map[severity] ?? colors.gray500;
};

export const getSeverityLabel = (severity: string): string =>
  severity.charAt(0).toUpperCase() + severity.slice(1);