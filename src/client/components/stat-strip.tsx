import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function StatStrip({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-strip"
      className={cn("flex flex-wrap rounded-lg border bg-card", className)}
      {...props}
    />
  );
}

/** Label over a large mono value. Colour the value through `valueClassName`. */
function StatTile({
  className,
  label,
  value,
  valueClassName,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "flex flex-1 basis-30 flex-col gap-0.5 border-r px-4 py-3 last:border-r-0",
        className,
      )}
      {...props}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xl tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

export { StatStrip, StatTile };
