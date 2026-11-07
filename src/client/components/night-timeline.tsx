import type { ComponentProps } from "react";

import { formatClock } from "@/format";
import { cn } from "@/lib/utils";

export interface TimelinePull {
  id: number;
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  kill: boolean;
  label: string;
}

const TICK_COUNT = 4;

/** Every pull as a block on the night. Gaps are breaks and trash. */
function NightTimeline({
  className,
  duration,
  pulls,
  onSelect,
  ...props
}: Omit<ComponentProps<"div">, "onSelect"> & {
  duration: number;
  pulls: readonly TimelinePull[];
  onSelect?: (id: number) => void;
}) {
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (duration * i) / TICK_COUNT);

  return (
    <div data-slot="night-timeline" className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="relative h-7 rounded-sm bg-secondary">
        {pulls.map((pull) => (
          <button
            key={pull.id}
            type="button"
            title={pull.label}
            aria-label={pull.label}
            onClick={() => onSelect?.(pull.id)}
            style={{
              left: `${(pull.start / duration) * 100}%`,
              width: `${((pull.end - pull.start) / duration) * 100}%`,
            }}
            className={cn(
              "absolute inset-y-0 min-w-0.5 rounded-xs transition-colors",
              pull.kill
                ? "bg-success hover:bg-success-muted-foreground"
                : "bg-border-strong hover:bg-subtle-foreground",
            )}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
        {ticks.map((tick) => (
          <span key={tick}>{formatClock(tick)}</span>
        ))}
      </div>
    </div>
  );
}

export { NightTimeline };
