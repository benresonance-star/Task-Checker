/**
 * Formats seconds into a HH:MM:SS or MM:SS string.
 * @param seconds The number of seconds to format
 * @param duration Default duration if seconds is null/undefined
 * @returns Formatted time string
 */
export const formatTime = (seconds: number | undefined | null, duration?: number): string => {
  let val = seconds ?? duration ?? (20 * 60);
  if (isNaN(val) || val < 0) val = 20 * 60;
  const hrs = Math.floor(val / 3600);
  const mins = Math.floor((val % 3600) / 60);
  const secs = val % 60;
  return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

