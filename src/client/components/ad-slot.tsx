import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function AdTag() {
  return (
    <span className="rounded-xs border border-input px-1.5 py-px text-[10px] tracking-widest text-muted-foreground uppercase">
      Ad
    </span>
  );
}

/**
 * Sponsor placement. `bar` is a full-width row, `compact` a smaller row for side panels,
 * `rectangle` a tall box. Add a footnote for the Plus upsell.
 */
function AdSlot({
  className,
  size = "bar",
  sponsor,
  message,
  action,
  footnote,
  ...props
}: Omit<ComponentProps<"aside">, "children"> & {
  size?: "bar" | "compact" | "rectangle";
  sponsor: ReactNode;
  message: ReactNode;
  action: ReactNode;
  footnote?: ReactNode;
}) {
  const rectangle = size === "rectangle";

  return (
    <div data-slot="ad-slot" className="flex flex-col gap-1.5">
      <aside
        aria-label="Advertisement"
        className={cn(
          "border text-soft-foreground",
          size === "bar" && "flex h-14 items-center gap-3 rounded-lg bg-card px-3.5",
          size === "compact" &&
            "flex h-12.5 items-center gap-2 rounded-md bg-background px-3 text-xs",
          rectangle && "flex h-62.5 flex-col gap-2 rounded-lg bg-background p-4 text-center",
          className,
        )}
        {...props}
      >
        <span className={cn(rectangle && "self-start")}>
          <AdTag />
        </span>
        {rectangle ? (
          <span className="flex flex-1 flex-col items-center justify-center gap-2.5">
            <span className="font-medium text-foreground">{sponsor}</span>
            <span>{message}</span>
            {action}
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-foreground">{sponsor}</span> · {message}
            </span>
            {action}
          </>
        )}
      </aside>
      {footnote && <span className="self-end text-xs text-muted-foreground">{footnote}</span>}
    </div>
  );
}

export { AdSlot };
