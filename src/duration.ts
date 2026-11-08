/** Twitch video lengths such as `2h20m29s`, `10m48s` or `45s`. */
export function parseTwitchDuration(value: string): number | null {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);

  if (!match || value === "") return null;

  return (Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)) * 60 + Number(match[3] ?? 0);
}

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
