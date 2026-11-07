import { Link, SearchParamError, useLocation } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { z } from "zod";

import { AppBrand, AppHeader } from "./components/app-header";
import { buttonVariants } from "./components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./components/ui/empty";
import { Skeleton } from "./components/ui/skeleton";
import { RaidLinkError, raidLinkError } from "./raid-search";

/** Mirrors the raid page layout so the real page replaces it without shifting. */
export function LoadingRaid() {
  return (
    <div role="status" aria-live="polite" className="flex h-svh flex-col bg-background">
      <span className="sr-only">Loading raid…</span>
      <AppHeader>
        <AppBrand />
        <Skeleton className="h-4 w-56" />
        <span className="flex-1" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </AppHeader>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col gap-1 border-r bg-card p-2">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </aside>
        <div className="relative grid min-w-0 flex-1 place-items-center bg-black">
          <p className="animate-pulse text-xs text-muted-foreground">
            Fetching the report and VOD…
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t bg-card p-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function RouteFailure({ error }: ErrorComponentProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
      </AppHeader>
      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col items-start gap-3">
          <p
            role="alert"
            className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-destructive-text"
          >
            {routeErrorMessage(error)}
          </p>
          <Link to="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Load another raid
          </Link>
        </div>
      </main>
    </div>
  );
}

export function NotFoundPage() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
      </AppHeader>
      <main className="grid flex-1 place-items-center px-4 py-10">
        <Empty className="flex-none border-0">
          <p
            aria-hidden="true"
            className="font-mono text-7xl font-semibold tracking-tighter text-border-strong"
          >
            404
          </p>
          <EmptyHeader className="max-w-md">
            <EmptyTitle className="text-lg">Page not found</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t find anything at
              <code className="mx-auto my-2 block w-fit max-w-full rounded bg-muted px-2 py-1 font-mono text-xs break-all text-foreground">
                {pathname}
              </code>
              The link may be mistyped or out of date.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/" className={buttonVariants({ size: "lg" })}>
              Load a raid
            </Link>
          </EmptyContent>
        </Empty>
      </main>
    </div>
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
