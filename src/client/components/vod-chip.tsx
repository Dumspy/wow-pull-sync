import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { PovAvatar, type WowClass } from "./pov-avatar";

/** One recording (point of view). Toggles via `aria-pressed`. */
function VodChip({
  className,
  name,
  offset,
  wowClass,
  active = false,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  name: string;
  /** Sync offset, already formatted, e.g. "+6.0s". */
  offset?: string;
  wowClass?: WowClass;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="vod-chip"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-sm border bg-popover pr-2.5 pl-1 text-xs transition-colors hover:bg-accent aria-pressed:border-border-strong aria-pressed:bg-accent",
        className,
      )}
      {...props}
    >
      <PovAvatar name={name} wowClass={wowClass} className="data-[size=sm]:size-5" />
      {name}
      {offset && <span className="font-mono text-[11px] text-muted-foreground">{offset}</span>}
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
