export type SentryEnvironment = "development" | "preview" | "production";

/**
 * Workers Builds sets `WORKERS_CI_BRANCH`. The production branch of this repo is `development`.
 * Local `vite` dev is `development` even when that variable is unset.
 */
export function environmentFromBranch(branch: string): SentryEnvironment {
  if (branch === "development") return "production";

  return "preview";
}

export function currentSentryEnvironment(): SentryEnvironment {
  if (import.meta.env.DEV) return "development";

  return environmentFromBranch(__SENTRY_BRANCH__);
}

/** Empty outside Workers Builds, where `WORKERS_CI_COMMIT_SHA` is not set. */
export function currentSentryRelease(): string {
  if (import.meta.env.DEV) return "";

  return __SENTRY_RELEASE__;
}

/** The debug routes exist on local dev and preview builds. Production returns 404. */
export function sentryDebugEnabled(environment: SentryEnvironment): boolean {
  return environment === "development" || environment === "preview";
}
