/** ISO 8601 durations as used by YouTube `contentDetails.duration` (PT#H#M#S, P#DT#H#M#S). */
export function parseIso8601Duration(value: string): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!match) return null;
  const days = match[1];
  const hours = match[2];
  const minutes = match[3];
  const seconds = match[4];
  if (days == null && hours == null && minutes == null && seconds == null) return null;
  return (
    ((Number(days ?? 0) * 24 + Number(hours ?? 0)) * 60 + Number(minutes ?? 0)) * 60 +
    Number(seconds ?? 0)
  );
}
