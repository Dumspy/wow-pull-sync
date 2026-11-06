import type { DataCollection } from "@sentry/core";

/**
 * SDK 11 replaced `sendDefaultPii` with `dataCollection`.
 * These categories stay off so events carry no user, request, or local-variable data.
 */
export function sentryDataCollection(): DataCollection {
  return {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  };
}
