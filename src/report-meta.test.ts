import { describe, expect, it } from "vitest";

import type { ReportSummary } from "./parse-api";
import type { WclEvent } from "./parse-api";
import { buildAbilities, withoutHiddenSpells } from "./report-meta";

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

describe("withoutHiddenSpells", () => {
  const cast = (abilityGameID: number): WclEvent => ({
    timestamp: 0,
    fight: 1,
    type: "cast",
    targetID: -1,
    sourceID: 1,
    abilityGameID,
    killingAbilityGameID: null,
  });

  it("drops hidden ids and hidden names, and keeps the rest", () => {
    const kept = withoutHiddenSpells(
      report([
        { gameID: 5, name: "Generic Spell" },
        { gameID: 6, name: "Toxic Spit" },
      ]),
      [cast(51052), cast(5), cast(6), cast(7)],
    );

    expect(kept.map((event) => event.abilityGameID)).toEqual([6, 7]);
  });
});
