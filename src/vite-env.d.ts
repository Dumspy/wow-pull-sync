/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_PREFILL_REPORT_URL?: string;
  readonly VITE_PREFILL_VOD_URL?: string;
}

declare const __SENTRY_RELEASE__: string;
declare const __SENTRY_BRANCH__: string;

declare module "*.jsonc?raw" {
  const source: string;
  export default source;
}
