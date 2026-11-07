import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Toggle for an event lane. `swatchClassName` is the lane's colour, e.g. "bg-warning". */
function FilterChip({
  className,
  label,
  swatchClassName,
  on = false,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: string;
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
      <span
        className={cn(
          "size-2 rounded-xs border border-transparent",
          on ? swatchClassName : "border-current bg-transparent",
        )}
      />
      {label}
    </button>
  );
}

export { FilterChip };
