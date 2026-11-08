import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { PovAvatar, type WowClass } from "./pov-avatar";

/**
 * One recording (point of view). Toggles via `aria-pressed`. `covers` adds a dot for whether it
 * has footage of the selected pull; `expired` dims it and replaces the dot with a tag.
 */
function VodChip({
  className,
  name,
  platform,
  offset,
  wowClass,
  covers,
  expired = false,
  active = false,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  name: string;
  /** "YouTube" or "Twitch". */
  platform?: string;
  /** Sync offset, already formatted, e.g. "+6.0s". */
  offset?: string;
  wowClass?: WowClass;
  covers?: boolean;
  expired?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="vod-chip"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-sm border bg-popover pr-2.5 pl-1 text-xs transition-colors hover:bg-accent aria-pressed:border-border-strong aria-pressed:bg-accent",
        expired && "opacity-70",
        className,
      )}
      {...props}
    >
      <PovAvatar name={name} wowClass={wowClass} className="data-[size=sm]:size-5" />
      {name}
      {platform && <span className="text-[11px] text-muted-foreground">{platform}</span>}
      {offset && <span className="font-mono text-[11px] text-muted-foreground">{offset}</span>}
      {expired ? (
        <span className="rounded-xs border border-destructive/40 px-1 text-[10px] tracking-wide text-destructive-text uppercase">
          Expired
        </span>
      ) : covers != null ? (
        <span
          title={covers ? "Footage covers this pull" : "No footage for this pull"}
          className={cn(
            "size-1.5 rounded-full",
            covers ? "bg-success" : "border border-muted-foreground",
          )}
        />
      ) : null}
    </button>
  );
}

function AddVodChip({ className, children = "Add VOD", ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="add-vod-chip"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2.5 text-xs text-soft-foreground transition-colors hover:bg-accent",
        className,
      )}
      {...props}
    >
      <Plus className="size-3" />
      {children}
    </button>
  );
}

export { AddVodChip, VodChip };
