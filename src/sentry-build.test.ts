import { describe, expect, it } from "vitest";

import { currentSentryEnvironment, environmentFromBranch } from "./sentry-build";

describe("sentry environment", () => {
  it("maps the development branch to production and every other branch to preview", () => {
    expect(environmentFromBranch("development")).toBe("production");
    expect(environmentFromBranch("cursor/sentry-error-reporting-4212")).toBe("preview");
    expect(environmentFromBranch("")).toBe("preview");
  });

  it("uses development while vite is in dev mode", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(currentSentryEnvironment()).toBe("development");
  });
});
