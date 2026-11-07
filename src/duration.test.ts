import { describe, expect, it } from "vitest";
import { parseIso8601Duration, parseTwitchDuration } from "./duration";

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

describe("parseTwitchDuration", () => {
  it("parses Twitch video lengths", () => {
    expect(parseTwitchDuration("2h20m29s")).toBe(8429);
    expect(parseTwitchDuration("10m48s")).toBe(648);
    expect(parseTwitchDuration("45s")).toBe(45);
    expect(parseTwitchDuration("1h")).toBe(3600);
  });

  it("rejects values that are not lengths", () => {
    expect(parseTwitchDuration("")).toBeNull();
    expect(parseTwitchDuration("PT1H")).toBeNull();
    expect(parseTwitchDuration("20m29")).toBeNull();
  });
});
