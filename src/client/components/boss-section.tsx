import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Boss header (name, mono stats, action) over a scrolling list of PullRows. */
function BossSection({
  className,
  name,
  stats,
  action,
  bodyClassName,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  name: ReactNode;
  stats?: ReactNode;
  action?: ReactNode;
  /** Classes for the rows area. It scrolls past a fixed height unless this overrides it. */
  bodyClassName?: string;
}) {
  return (
    <section
      data-slot="boss-section"
      className={cn("overflow-hidden rounded-lg border", className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-popover px-4 py-3">
        <span className="text-[15px] font-semibold">{name}</span>
        {stats && <span className="font-mono text-xs text-muted-foreground">{stats}</span>}
        <span className="flex-1" />
        {action}
      </div>
      <div className={cn("max-h-66 overflow-y-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

export { BossSection };
