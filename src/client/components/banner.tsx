import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Full-width strip under the header, e.g. "You're viewing a shared review". */
function Banner({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="banner"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b bg-popover px-8 py-2.5 text-soft-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Banner };
