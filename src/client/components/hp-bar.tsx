import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Thin track showing how much boss HP was left, 0 to 100. */
function HpBar({
  className,
  value,
  kill = false,
  ...props
}: Omit<ComponentProps<"span">, "children"> & { value: number; kill?: boolean }) {
  return (
    <span
      data-slot="hp-bar"
      className={cn("h-1 min-w-0 flex-1 overflow-hidden rounded-xs bg-border", className)}
      {...props}
    >
      <span
        className={cn("block h-full", kill ? "bg-success" : "bg-subtle-foreground")}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

export { HpBar };
