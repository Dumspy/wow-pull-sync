import * as Sentry from "@sentry/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { initAnalytics } from "./analytics";
import { AppRouter } from "./router";
import { initSentry } from "./sentry";
import { SentryFallback } from "./sentry-fallback";
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

  return <AppRouter />;
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
