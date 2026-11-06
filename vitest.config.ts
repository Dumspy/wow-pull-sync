import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __SENTRY_RELEASE__: JSON.stringify(""),
    __SENTRY_BRANCH__: JSON.stringify(""),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
