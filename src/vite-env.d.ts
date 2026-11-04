/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
}

declare module "*.jsonc?raw" {
  const source: string;
  export default source;
}
