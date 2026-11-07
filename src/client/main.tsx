import * as Sentry from "@sentry/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { initAnalytics } from "./analytics";
import { DebugSentry } from "./debug-sentry";
import { AppRouter } from "./router";
import { initSentry } from "./sentry";
import { SentryFallback } from "./sentry-fallback";
import { currentSentryEnvironment, sentryDebugEnabled } from "../sentry-build";
import "../styles.css";

initAnalytics();

initSentry();

/** Dark is the default, including on a light OS theme. */
function Theme() {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  // The router catches route errors with its own screen. This page sits outside
  // it so the throw reaches Sentry.ErrorBoundary. Production has no page here.
  if (debugSentryPage()) return <DebugSentry />;

  return <AppRouter />;
}

function debugSentryPage(): boolean {
  if (!sentryDebugEnabled(currentSentryEnvironment())) return false;

  return window.location.pathname === "/debug-sentry";
}

createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
      <Theme />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
