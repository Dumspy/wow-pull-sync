import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Caption strip above a video pane, e.g. "● Dispy  Pull #12 · Wipe · 86%".
 * It sits above the player, never on it: Twitch won't play a covered embed without a click.
 */
function PaneCaption({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="pane-caption"
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 border-b bg-card px-3 text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { PaneCaption };
