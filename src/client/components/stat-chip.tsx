import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Dot } from "./dot";

/** Compact mono count, e.g. "● 3 kill". Omit `tone` for no dot. */
function StatChip({
  className,
  tone,
  value,
  children,
  ...props
}: Omit<ComponentProps<"span">, "children"> & {
  tone?: ComponentProps<typeof Dot>["tone"];
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      data-slot="stat-chip"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {tone && <Dot tone={tone} />}
      <span className="text-foreground">{value}</span>
      {children}
    </span>
  );
}

export { StatChip };
