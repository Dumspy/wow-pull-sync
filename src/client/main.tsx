import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import type { PostHog } from "posthog-js";
import slimPosthog from "posthog-js/dist/module.slim.no-external";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { initAnalytics } from "./analytics";
import { AppRouter } from "./router";
import "../styles.css";

initAnalytics();

function analyticsClient(): PostHog {
  const client: unknown = slimPosthog;

  // SAFETY: the slim entrypoint is the PostHog client the provider renders. Its class is declared again in the full build, so the two types do not overlap.
  return client as PostHog;
}

/** Dark is the default, including on a light OS theme. */
function Theme() {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  const posthog = analyticsClient();

  return (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <AppRouter />
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme />
  </StrictMode>,
);
