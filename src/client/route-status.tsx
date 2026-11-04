import { Link, SearchParamError } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { z } from "zod";

import { buttonVariants } from "./components/ui/button";
import { RaidLinkError, raidLinkError } from "./raid-search";
import { cn } from "./lib/utils";

export function LoadingRaid() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <p className="text-sm">Loading…</p>
    </main>
  );
}

export function RouteFailure({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <p
          role="alert"
          className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {routeErrorMessage(error)}
        </p>
        <Link to="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-3")}>
          Load another raid
        </Link>
      </div>
    </main>
  );
}

export function routeErrorMessage(error: ErrorComponentProps["error"]): string {
  const parsed = z.instanceof(Error).safeParse(error);

  if (!parsed.success) return "Something went wrong loading that raid.";

  if (
    parsed.data instanceof SearchParamError ||
    parsed.data instanceof RaidLinkError ||
    parsed.data.name === "ZodError" ||
    parsed.data.message === raidLinkError
  ) {
    return raidLinkError;
  }

  return parsed.data.message || "Something went wrong loading that raid.";
}
