/**
 * Time formatting utilities for relative time display
 */

/**
 * Formats a timestamp as relative time (e.g. "5 mins ago").
 * Works with milliseconds (JavaScript Date.now()) or seconds (Unix timestamp).
 * 
 * @param timestamp - Unix timestamp in milliseconds or seconds, or null
 * @returns Human-readable relative time string
 * @example
 * formatTimeAgo(Date.now() - 5 * 60 * 1000) // "5 mins ago"
 * formatTimeAgo(null) // "Never"
 */
export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';

  // Normalize to milliseconds if input appears to be in seconds
  // (timestamps older than year 2001 are likely in seconds)
  const ms = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
  
  const seconds = Math.floor((Date.now() - ms) / 1000);

  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Month labels used by formatDate — fixed (not locale-derived) so server and
 * client always render identical output during SSR hydration.
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Formats a date as a deterministic UTC "Jun 5, 2025" string.
 * Avoids toLocaleDateString(), which differs between server and client
 * locales and causes React hydration mismatches. UTC components are used so
 * the output is also independent of the host timezone.
 *
 * @param date - ISO date string, timestamp, or Date
 * @returns Formatted date, or an em dash when the input is invalid
 */
export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Formats a date's time-of-day as a deterministic zero-padded UTC "HH:MM"
 * string.
 * Avoids toLocaleTimeString(), which differs between server and client
 * locales and causes React hydration mismatches. UTC components are used so
 * the output is also independent of the host timezone.
 *
 * @param date - ISO date string, timestamp, or Date
 * @returns Formatted time, or an em dash when the input is invalid
 */
export function formatTime(date: string | number | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
