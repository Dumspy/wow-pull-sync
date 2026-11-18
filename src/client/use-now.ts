import { useEffect, useState } from "react";

/** How often a live stream's length moves forward on the page. */
export const LIVE_TICK_MS = 5_000;

/** The wall clock, moving every `tickMs` while `ticking`. Stopped, it holds its last value. */
export function useNow(ticking: boolean, tickMs = LIVE_TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), tickMs);

    return () => window.clearInterval(timer);
  }, [ticking, tickMs]);

  return now;
}
