import type { Lane } from "./contract";

/**
 * Timeline lanes per encounter, by spell id. Add a lane here and every pull of that
 * encounter carries its events. `label` is the spell id for now.
 *
 * Find ids in Warcraft Logs: open a pull, pick "Casts" (or buffs/debuffs), and the
 * ability link ends in the spell id.
 */
export const LANES: readonly Lane[] = [
  {
    id: "ulatek-mothers-wrath",
    encounterId: 3492,
    label: "1298367",
    dataType: "Casts",
    hostility: "Enemies",
    spellIds: [1298367],
  },
  {
    id: "ulatek-call-of-the-serpent",
    encounterId: 3492,
    label: "1304012",
    dataType: "Casts",
    hostility: "Enemies",
    spellIds: [1304012],
  },
  {
    id: "ulatek-toxic-incubation",
    encounterId: 3492,
    label: "1299759",
    dataType: "Casts",
    hostility: "Enemies",
    spellIds: [1299759],
  },
];
