import type { Breadcrumb, CloudflareOptions } from "@sentry/cloudflare";
import { z } from "zod";

import type { Env } from "./api";
import { currentSentryEnvironment, currentSentryRelease } from "./sentry-build";
import { sentryDataCollection } from "./sentry-options";
import { scrubSentryBreadcrumb, sentryBeforeSend } from "./sentry-scrub";

export function workerSentryOptions(env: Env): CloudflareOptions {
  const dsn = readDsn(env);
  const release = currentSentryRelease();
  const environment = currentSentryEnvironment();

  // TEMPORARY: SDK debug output lands in Workers Logs on preview. Remove once events arrive.
  const debug = environment === "preview";

  if (debug) console.log(`sentry dsn present: ${dsn !== ""}`);

  const options: CloudflareOptions = {
    dsn,
    enabled: dsn !== "",
    environment,
    debug,
    cacheClient: false,
    dataCollection: sentryDataCollection(),
    beforeSend: sentryBeforeSend,
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb);
    },
  };

  if (release !== "") options.release = release;

  return options;
}

function readDsn(env: Env): string {
  const parsed = z.string().safeParse(env?.SENTRY_DSN);

  if (!parsed.success) return "";

  return parsed.data.trim();
}
