import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function AppLogo({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect x="1" y="7" width="16" height="4" rx="1" className="fill-border-strong" />
      <rect x="3" y="7" width="5" height="4" rx="1" className="fill-success" />
      <rect x="9.5" y="4" width="1.5" height="10" rx=".75" className="fill-foreground" />
    </svg>
  );
}

function AppBrand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      data-slot="app-brand"
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <AppLogo />
      pull-sync
    </Link>
  );
}

/** Slim top bar. Put `<span className="flex-1" />` between groups to push the rest right. */
function AppHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="app-header"
      className={cn(
        "relative z-5 flex min-h-12 flex-wrap items-center gap-x-5 gap-y-2 border-b bg-card px-4 py-1.5",
        className,
      )}
      {...props}
    />
  );
}

export { AppBrand, AppHeader, AppLogo };
