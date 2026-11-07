import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Quiet inline note, e.g. what saving a VOD makes public. */
function Notice({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="notice"
      className={cn(
        "rounded-md border bg-popover px-3 py-2.5 text-xs text-soft-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Notice };
