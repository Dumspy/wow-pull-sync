import { describe, expect, it } from "vitest";

import type { ReportSummary } from "./parse-api";
import { buildAbilities } from "./report-meta";

function report(
  abilities: { gameID: number; name: string; icon?: string | null }[] | null,
): ReportSummary {
  // SAFETY: buildAbilities reads only masterData.abilities, which this stub sets.
  return { masterData: { actors: null, abilities } } as ReportSummary;
}

describe("buildAbilities", () => {
  it("names each spell once, in id order, and keeps the id when unnamed", () => {
    expect(
      buildAbilities(
        report([{ gameID: 101, name: "Toxic Spit", icon: "ability_poison.jpg" }]),
        [101, 100, 101],
      ),
    ).toEqual([
      { id: 100, name: "Spell 100", icon: null },
      { id: 101, name: "Toxic Spit", icon: "ability_poison.jpg" },
    ]);
  });
});
