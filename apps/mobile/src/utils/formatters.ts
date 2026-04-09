import { colors } from '@theme/colors';

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