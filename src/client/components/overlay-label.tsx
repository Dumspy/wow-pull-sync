import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Caption pinned to the top-left of a video pane, e.g. "● Dispy  Pull #12 · Wipe · 86%". */
function OverlayLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="overlay-label"
      className={cn(
        "absolute top-3 left-3 flex items-center gap-2 rounded-sm bg-background/80 px-2 py-1 text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { OverlayLabel };
