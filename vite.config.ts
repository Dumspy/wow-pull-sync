import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const commit = process.env.WORKERS_CI_COMMIT_SHA?.trim() ?? "";

export default defineConfig({
  define: {
    __SENTRY_RELEASE__: JSON.stringify(commit),
    __SENTRY_BRANCH__: JSON.stringify(process.env.WORKERS_CI_BRANCH ?? ""),
  },
  build: {
    sourcemap: "hidden",
  },
  plugins: [react(), tailwindcss(), cloudflare(), ...sentryVitePlugins("./dist/**/*.map")],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src/client", import.meta.url)) },
  },
});

export function sentryUploadEnabled(): boolean {
  return Boolean(
    process.env.SENTRY_AUTH_TOKEN?.trim() &&
    process.env.SENTRY_ORG?.trim() &&
    process.env.SENTRY_PROJECT?.trim(),
  );
}

/**
 * Rollup starts every `writeBundle` hook at once. Sentry's hook awaits release
 * creation before it reads `.map` files, so a parallel delete removes them
 * first and the upload ships JavaScript without maps.
 * When the token, org, and project are set, Sentry deletes the maps itself
 * after that read (`filesToDeleteAfterUpload`). Otherwise this plugin is
 * registered with `sequential: true`, which runs after Sentry's hook.
 */
export function sentryVitePlugins(mapGlob: string): Plugin[] {
  const upload = sentryUploadEnabled();
  const commit = process.env.WORKERS_CI_COMMIT_SHA?.trim() ?? "";

  const plugins: Plugin[] = sentryVitePlugin({
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
    sourcemaps: upload ? { filesToDeleteAfterUpload: [mapGlob] } : { disable: "disable-upload" },
  });

  if (!upload) plugins.push(stripSourceMaps());

  return plugins;
}

function stripSourceMaps(): Plugin {
  return {
    name: "strip-source-maps",
    apply: "build",
    enforce: "post",
    writeBundle: {
      sequential: true,
      handler(options) {
        if (!options.dir) return;
        const removed = removeMapFiles(options.dir);

        if (removed > 0) console.info(`Removed ${removed} source maps from ${options.dir}`);
      },
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
