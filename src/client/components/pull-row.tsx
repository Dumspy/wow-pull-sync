import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { Dot } from "@/components/dot";
import { HpBar } from "@/components/hp-bar";
import { cn } from "@/lib/utils";

/**
 * One pull in a list. `full` suits boss sections, `compact` the side list in the player.
 * Renders a button; pass `render={<Link … />}` to make it a link.
 */
function PullRow({
  className,
  render,
  n,
  kill,
  hp,
  duration,
  start,
  selected = false,
  variant = "full",
  ...props
}: useRender.ComponentProps<"button"> & {
  n: number;
  kill: boolean;
  /** Boss HP left when the pull ended, 0 to 100. */
  hp: number;
  duration: string;
  /** Start time on the recording. */
  start?: string;
  selected?: boolean;
  variant?: "full" | "compact";
}) {
  const compact = variant === "compact";

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        "aria-pressed": selected,
        className: cn(
          "flex w-full items-center border-t text-left transition-colors first:border-t-0 hover:bg-accent aria-pressed:bg-accent",
          compact ? "h-8 gap-2 px-3" : "h-11 gap-3.5 px-4",
          className,
        ),
        children: (
          <>
            <span className={cn("flex items-center gap-2", compact ? "w-13" : "w-19")}>
              <Dot tone={kill ? "success" : "neutral"} />
              <span className="font-mono text-xs text-soft-foreground tabular-nums">#{n}</span>
            </span>
            {!compact && <span className="w-12">{kill ? "Kill" : "Wipe"}</span>}
            {compact && (
              <span className="w-8.5 text-right font-mono text-xs tabular-nums">{hp}%</span>
            )}
            <HpBar value={hp} kill={kill} />
            {!compact && (
              <span className="w-10 text-right font-mono text-xs tabular-nums">{hp}%</span>
            )}
            <span className="w-11 text-right font-mono text-xs text-muted-foreground tabular-nums">
              {duration}
            </span>
            {start && (
              <span
                className={cn(
                  "text-right font-mono text-xs text-muted-foreground tabular-nums",
                  compact ? "w-12" : "w-16",
                )}
              >
                {start}
              </span>
            )}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: "pull-row", selected },
  });
}

/** Column labels for a list of full-size PullRows. Keep the widths in step with `PullRow`. */
function PullRowHeader({ start = false, className }: { start?: boolean; className?: string }) {
  return (
    <div
      data-slot="pull-row-header"
      className={cn(
        "flex h-8 items-center gap-3.5 bg-popover px-4 text-xs whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span className="w-19 shrink-0">Pull</span>
      <span className="w-12 shrink-0">Result</span>
      <span className="min-w-0 flex-1">Boss HP over the pull</span>
      <span className="w-10 shrink-0 text-right">Left</span>
      <span className="w-11 shrink-0 text-right">Length</span>
      {start && <span className="w-16 shrink-0 text-right">In VOD</span>}
    </div>
  );
}

export { PullRow, PullRowHeader };
