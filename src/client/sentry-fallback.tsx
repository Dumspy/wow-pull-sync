import { buttonVariants } from "./components/ui/button";
import { cn } from "./lib/utils";

/** Generic fallback. The error text can contain a report code, so it stays off the page. */
export function SentryFallback() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <p
          role="alert"
          className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Something went wrong.
        </p>
        <a href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-3")}>
          Load another raid
        </a>
      </div>
    </main>
  );
}
