import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PovAvatar, type WowClass } from "./pov-avatar";

/** Track showing which stretch of the night a VOD covers, both ends 0 to 100. */
function CoverageBar({ from, to, className }: { from: number; to: number; className?: string }) {
  return (
    <span
      data-slot="coverage-bar"
      className={cn("relative block h-1 overflow-hidden rounded-xs bg-border", className)}
    >
      <span
        className="absolute inset-y-0 bg-soft-foreground"
        style={{ left: `${from}%`, width: `${to - from}%` }}
      />
    </span>
  );
}

/**
 * A recording in the raid sidebar. Add `coverage` for the night-coverage bar and `offset` for its sync.
 * Renders a div; pass `render={<Link … />}` to make it a link.
 */
function VodCard({
  className,
  render,
  name,
  wowClass,
  tag,
  offset,
  coverage,
  note,
  ...props
}: Omit<useRender.ComponentProps<"div">, "children"> & {
  name: string;
  wowClass?: WowClass;
  /** Small pill beside the name, e.g. a "You" badge. */
  tag?: ReactNode;
  offset?: string;
  coverage?: { from: number; to: number };
  note?: ReactNode;
}) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex flex-col gap-2 rounded-lg border bg-popover px-3 py-2.5 transition-colors hover:bg-accent",
          className,
        ),
        children: (
          <>
            <span className="flex items-center gap-2">
              <PovAvatar name={name} wowClass={wowClass} />
              <span className="font-medium">{name}</span>
              {tag}
              <span className="flex-1" />
              {offset && <span className="font-mono text-xs text-muted-foreground">{offset}</span>}
            </span>
            {coverage && <CoverageBar from={coverage.from} to={coverage.to} />}
            {note && <span className="text-xs text-muted-foreground">{note}</span>}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: "vod-card" },
  });
}

export { CoverageBar, VodCard };
