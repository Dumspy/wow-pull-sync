import { createServer, type Server } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { build, type Plugin } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { sentryVitePlugins } from "../vite.config";

const ENV_KEYS = [
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_URL",
  "WORKERS_CI_COMMIT_SHA",
  "SENTRY_TEST_OVERRIDE_TEMP_DIR",
] as const;

describe("source map upload order", () => {
  const previous = new Map<string, string | undefined>();
  const roots: string[] = [];

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = previous.get(key);

      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    previous.clear();

    for (const root of roots) rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it("reads maps during the Sentry upload, then deletes them", async () => {
    const root = tempRoot(roots);
    const uploadDir = join(root, "uploaded");
    const outDir = join(root, "dist");

    mkdirSync(uploadDir);
    const server = await listen();

    remember(previous);
    process.env.SENTRY_AUTH_TOKEN = "test-token";
    process.env.SENTRY_ORG = "auxera";
    process.env.SENTRY_PROJECT = "pull-sync";
    process.env.SENTRY_URL = `http://127.0.0.1:${server.port}`;
    process.env.WORKERS_CI_COMMIT_SHA = "abc123def4567890";
    process.env.SENTRY_TEST_OVERRIDE_TEMP_DIR = uploadDir;
    writeApp(root);

    try {
      await buildApp(root, sentryVitePlugins(`${outDir}/**/*.map`));
    } finally {
      await server.close();
    }

    const uploaded = mapFiles(uploadDir);
    const left = mapFiles(outDir);

    expect(uploaded.length).toBeGreaterThan(0);
    expect(left).toEqual([]);
    expect(readMaps(uploaded).some((contents) => contents.includes('"mappings"'))).toBe(true);
  }, 30_000);

  it("deletes generated maps when upload is not configured", async () => {
    const root = tempRoot(roots);
    const outDir = join(root, "dist");
    const seen: number[] = [];

    remember(previous);
    delete process.env.SENTRY_AUTH_TOKEN;
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
    delete process.env.SENTRY_URL;
    delete process.env.SENTRY_TEST_OVERRIDE_TEMP_DIR;
    writeApp(root);

    await buildApp(root, [mapProbe(seen), ...sentryVitePlugins(`${outDir}/**/*.map`)]);

    expect(seen).toEqual([1]);
    expect(mapFiles(outDir)).toEqual([]);
  }, 30_000);
});

function tempRoot(roots: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "pull-sync-maps-"));

  roots.push(root);

  return root;
}

function remember(previous: Map<string, string | undefined>): void {
  for (const key of ENV_KEYS) previous.set(key, process.env[key]);
}

function writeApp(root: string): void {
  writeFileSync(join(root, "main.js"), "console.log('ready');\n");
}

async function buildApp(root: string, plugins: Plugin[]): Promise<void> {
  await build({
    configFile: false,
    root,
    logLevel: "warn",
    build: {
      outDir: "dist",
      sourcemap: "hidden",
      emptyOutDir: true,
      minify: false,
      rollupOptions: { input: join(root, "main.js") },
    },
    plugins,
  });
}

function mapProbe(seen: number[]): Plugin {
  return {
    name: "map-probe",
    enforce: "pre",
    writeBundle(options) {
      if (!options.dir) return;
      seen.push(mapFiles(options.dir).length);
    },
  };
}

function mapFiles(directory: string): string[] {
  const found: string[] = [];

  collectMaps(directory, found);

  return found;
}

function collectMaps(directory: string, found: string[]): void {
  let entries;

  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      collectMaps(path, found);
      continue;
    }

    if (entry.name.endsWith(".map")) found.push(path);
  }
}

function readMaps(paths: string[]): string[] {
  const contents: string[] = [];

  for (const path of paths) contents.push(readFile(path));

  return contents;
}

function readFile(path: string): string {
  return readFileSync(path, "utf8");
}

function listen(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((_request, response) => {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end("{}");
  });

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const parsed = z.object({ port: z.number() }).safeParse(server.address());

      if (!parsed.success) {
        reject(new Error("stub Sentry did not bind"));

        return;
      }

      resolve({
        port: parsed.data.port,
        close: () => closeServer(server),
      });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
