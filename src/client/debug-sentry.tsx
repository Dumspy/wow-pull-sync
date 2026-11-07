import { useState } from "react";

import { Button } from "./components/ui/button";

export function DebugSentry() {
  const [crash, setCrash] = useState(false);

  if (crash) throw new Error("Sentry test error");

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-3">
        <h1 className="text-lg font-medium tracking-tight">Sentry check</h1>
        <p className="text-sm text-muted-foreground">
          This page is only on dev and preview. It throws once so the fallback and Sentry can be
          checked.
        </p>
        <Button type="button" onClick={() => setCrash(true)}>
          Throw Sentry test error
        </Button>
      </div>
    </main>
  );
}
