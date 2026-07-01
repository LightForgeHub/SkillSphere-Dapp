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
