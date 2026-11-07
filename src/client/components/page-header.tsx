import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Page title with a muted subtitle on the left and actions pushed right. */
function PageHeader({
  className,
  title,
  subtitle,
  actions,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-wrap items-end gap-x-6 gap-y-3", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="text-muted-foreground">{subtitle}</div>}
      </div>
      <span className="flex-1" />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
