import type { ComponentProps } from "react";

import { Dot } from "@/components/dot";
import { cn } from "@/lib/utils";

export interface HpPull {
  n: number;
  /** Boss HP left when the pull ended, 0 to 100. A kill is 0. */
  hp: number;
  kill: boolean;
}

const AXIS = ["100%", "50%", "0%"];

/** Boss HP at the end of each pull, with a dashed line at the best wipe. */
function PullHpChart({
  className,
  pulls,
  best,
  bestLabel,
  onSelect,
  ...props
}: Omit<ComponentProps<"div">, "onSelect"> & {
  pulls: readonly HpPull[];
  /** Lowest boss HP reached on a wipe. */
  best?: number;
  bestLabel?: string;
  onSelect?: (n: number) => void;
}) {
  return (
    <div data-slot="pull-hp-chart" className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="neutral" className="rounded-xs" />
          Wipe
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="success" className="rounded-xs" />
          Kill
        </span>
        {best !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 border-t border-dashed border-soft-foreground" />
            {bestLabel ?? `Best ${best}%`}
          </span>
        )}
      </div>
      <div className="flex gap-2.5">
        <div className="relative h-50 w-9 font-mono text-[11px] text-muted-foreground">
          {AXIS.map((label, i) => (
            <span
              key={label}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${i * 50}%` }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="relative h-50 min-w-0 flex-1 border-b border-input">
          <div className="absolute inset-x-0 top-1/2 border-t" />
          {best !== undefined && (
            <div
              className="absolute inset-x-0 border-t border-dashed border-soft-foreground"
              style={{ top: `${100 - best}%` }}
            />
          )}
          <div className="absolute inset-0 flex items-end gap-1.5">
            {pulls.map((pull) => (
              <button
                key={pull.n}
                type="button"
                title={`Pull ${pull.n}: ${pull.kill ? "kill" : `wipe at ${pull.hp}%`}`}
                aria-label={`Pull ${pull.n}: ${pull.kill ? "kill" : `wipe at ${pull.hp}%`}`}
                onClick={() => onSelect?.(pull.n)}
                className="group flex h-full min-w-0 flex-1 items-end"
              >
                <span
                  style={{ height: pull.kill ? "4px" : `${Math.max(pull.hp, 2)}%` }}
                  className={cn(
                    "w-full rounded-t-xs transition-colors",
                    pull.kill
                      ? "bg-success"
                      : "bg-subtle-foreground group-hover:bg-soft-foreground",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="w-9" />
        <div className="flex min-w-0 flex-1 gap-1.5">
          {pulls.map((pull) => (
            <span
              key={pull.n}
              className="min-w-0 flex-1 text-center font-mono text-[11px] text-muted-foreground"
            >
              {pull.n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export { PullHpChart };
