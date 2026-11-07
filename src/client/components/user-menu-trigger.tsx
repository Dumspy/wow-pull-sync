import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Pill button for the signed-in user. Use as `render` on a DropdownMenuTrigger. */
function UserMenuTrigger({
  className,
  name,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { name: string }) {
  return (
    <button
      type="button"
      data-slot="user-menu-trigger"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border py-0 pr-2.5 pl-1 text-xs text-soft-foreground transition-colors hover:bg-accent",
        className,
      )}
      {...props}
    >
      <span className="inline-flex size-5.5 items-center justify-center rounded-full bg-border-strong text-[11px] font-semibold text-foreground">
        {name.slice(0, 1).toUpperCase()}
      </span>
      {name}
      <ChevronDown className="size-2.5 text-muted-foreground" />
    </button>
  );
}

export { UserMenuTrigger };
