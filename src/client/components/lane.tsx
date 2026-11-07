import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Width of the label column, shared by the axis and every lane so they line up. */
const LABEL_WIDTH = "w-22";

interface AxisTick {
  /** Position along the lane, 0 to 100. */
  at: number;
  label: string;
}

function TimeAxis({ ticks }: { ticks: readonly AxisTick[] }) {
  return (
    <div data-slot="time-axis" className="flex items-center gap-3">
      <span className={cn("flex-none", LABEL_WIDTH)} />
      <div className="relative h-3.5 min-w-0 flex-1 font-mono text-[11px] text-muted-foreground tabular-nums">
        {ticks.map((tick) => (
          <span key={tick.at} className="absolute" style={{ left: `${tick.at}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One row of the pull timeline: label on the left, a positioned track on the right. */
function Lane({
  className,
  label,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { label: ReactNode; children?: ReactNode }) {
  return (
    <div data-slot="lane" className="flex items-center gap-3">
      <span className={cn("flex-none text-xs text-muted-foreground", LABEL_WIDTH)}>{label}</span>
      <div
        className={cn("relative h-5 min-w-0 flex-1 rounded-xs bg-secondary", className)}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

const laneMarkVariants = cva("absolute inset-y-1 min-w-0.5 rounded-xs", {
  variants: {
    tone: {
      neutral: "bg-soft-foreground",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
      info: "bg-ring",
      violet: "bg-class-warlock",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/** An event on a lane. Give `to` for a span, leave it off for a tick. */
function LaneMark({
  className,
  tone,
  from,
  to,
  ...props
}: Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof laneMarkVariants> & { from: number; to?: number }) {
  return (
    <span
      data-slot="lane-mark"
      className={cn(laneMarkVariants({ tone }), className)}
      style={{ left: `${from}%`, width: to === undefined ? undefined : `${to - from}%` }}
      {...props}
    />
  );
}

/** A named stretch of the fight, such as a phase. */
function LaneSegment({
  className,
  from,
  to,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { from: number; to: number; children?: ReactNode }) {
  return (
    <div
      data-slot="lane-segment"
      className={cn(
        "absolute inset-y-0 flex items-center overflow-hidden border-r bg-border px-2 text-[11px] whitespace-nowrap text-soft-foreground last:border-r-0",
        className,
      )}
      style={{ left: `${from}%`, width: `${to - from}%` }}
      {...props}
    >
      {children}
    </div>
  );
}

function Playhead({ at }: { at: number }) {
  return (
    <div
      data-slot="playhead"
      aria-hidden="true"
      className="absolute inset-y-0 w-0.5 bg-foreground"
      style={{ left: `${at}%` }}
    />
  );
}

export { Lane, LaneMark, LaneSegment, Playhead, TimeAxis };
