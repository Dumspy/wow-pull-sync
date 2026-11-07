import type { Breadcrumb, BrowserOptions } from "@sentry/react";
import * as Sentry from "@sentry/react";

import { currentSentryEnvironment, currentSentryRelease } from "../sentry-build";
import { sentryDataCollection } from "../sentry-options";
import { scrubSentryBreadcrumb, sentryBeforeSend } from "../sentry-scrub";

let started = false;

/** No DSN means no client and no network. */
export function initBrowserSentry(dsn: string, transport?: BrowserOptions["transport"]): void {
  const trimmed = dsn.trim();

  if (trimmed === "" || started) return;
  started = true;

  const release = currentSentryRelease();

  const options: BrowserOptions = {
    dsn: trimmed,
    environment: currentSentryEnvironment(),
    dataCollection: sentryDataCollection(),
    integrations(integrations) {
      const kept = [];

      for (const integration of integrations) {
        if (integration.name === "BrowserSession") continue;
        kept.push(integration);
      }

      return kept;
    },
    beforeSend: sentryBeforeSend,
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb);
    },
  };

  if (release !== "") options.release = release;

  if (transport) options.transport = transport;
  Sentry.init(options);
}

export function initSentry(): void {
  initBrowserSentry(import.meta.env.VITE_SENTRY_DSN ?? "");
}
