import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const commit = process.env.WORKERS_CI_COMMIT_SHA?.trim() ?? "";
const upload = sentryUploadEnabled();

export default defineConfig({
  define: {
    __SENTRY_RELEASE__: JSON.stringify(commit),
    __SENTRY_BRANCH__: JSON.stringify(process.env.WORKERS_CI_BRANCH ?? ""),
  },
  build: {
    sourcemap: "hidden",
  },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    ...sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      url: process.env.SENTRY_URL ?? "https://de.sentry.io",
      telemetry: false,
      silent: !upload,
      release: {
        name: commit || undefined,
        inject: commit !== "",
        create: upload,
        finalize: upload,
      },
      sourcemaps: upload
        ? { filesToDeleteAfterUpload: ["./dist/**/*.map"] }
        : { disable: "disable-upload" },
    }),
    stripSourceMaps(),
  ],
});

function sentryUploadEnabled(): boolean {
  return Boolean(
    process.env.SENTRY_AUTH_TOKEN?.trim() &&
    process.env.SENTRY_ORG?.trim() &&
    process.env.SENTRY_PROJECT?.trim(),
  );
}

function stripSourceMaps(): Plugin {
  return {
    name: "strip-source-maps",
    apply: "build",
    enforce: "post",
    writeBundle(options) {
      if (!options.dir) return;
      const removed = removeMapFiles(options.dir);

      if (removed > 0) console.info(`Removed ${removed} source maps from ${options.dir}`);
    },
  };
}

function removeMapFiles(directory: string): number {
  const entries = readdirSync(directory, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      removed += removeMapFiles(path);
      continue;
    }

    if (!entry.name.endsWith(".map")) continue;
    rmSync(path);
    removed += 1;
  }

  return removed;
}
