import { describe, expect, it } from "vitest";
import { parseIso8601Duration } from "./duration";

describe("parseIso8601Duration", () => {
  it("parses the forms YouTube documents", () => {
    expect(parseIso8601Duration("PT15M33S")).toBe(933);
    expect(parseIso8601Duration("PT1H2M3S")).toBe(3723);
    expect(parseIso8601Duration("PT3H20M")).toBe(12000);
    expect(parseIso8601Duration("P1DT1H")).toBe(90000);
    expect(parseIso8601Duration("PT0S")).toBe(0);
  });

  it("rejects values that are not durations", () => {
    expect(parseIso8601Duration("3 hours")).toBeNull();
    expect(parseIso8601Duration("PT")).toBeNull();
  });
});
