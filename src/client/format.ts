export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const whole = Math.round(Math.abs(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${sign}${hours}:${mm}:${ss}`;
  return `${sign}${minutes}:${ss}`;
}

/** Exact seek target, to the millisecond. */
export function formatSeconds(totalSeconds: number): string {
  return (Math.round(totalSeconds * 1000) / 1000).toFixed(3);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
