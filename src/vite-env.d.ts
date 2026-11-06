/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
}

declare const __SENTRY_RELEASE__: string;
declare const __SENTRY_BRANCH__: string;

declare module "*.jsonc?raw" {
  const source: string;
  export default source;
}
