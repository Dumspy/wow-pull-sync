import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Toggle for an event lane. `swatchClassName` is the lane's colour, e.g. "bg-warning". */
function FilterChip({
  className,
  label,
  swatchClassName,
  on = false,
  icon,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: string;
  /** Shown instead of the colour swatch. */
  icon?: ReactNode;
  swatchClassName: string;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      aria-pressed={on}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent aria-pressed:border-border-strong aria-pressed:bg-accent aria-pressed:text-foreground",
        className,
      )}
      {...props}
    >
      {icon ?? (
        <span
          className={cn(
            "size-2 rounded-xs border border-transparent",
            on ? swatchClassName : "border-current bg-transparent",
          )}
        />
      )}
      {label}
    </button>
  );
}

export { FilterChip };
