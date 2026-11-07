import type { WowClass } from "./contract";

/** Warcraft Logs actor `subType` to our class key. */
const BY_SUBTYPE = new Map<string, WowClass>([
  ["DeathKnight", "death-knight"],
  ["DemonHunter", "demon-hunter"],
  ["Druid", "druid"],
  ["Evoker", "evoker"],
  ["Hunter", "hunter"],
  ["Mage", "mage"],
  ["Monk", "monk"],
  ["Paladin", "paladin"],
  ["Priest", "priest"],
  ["Rogue", "rogue"],
  ["Shaman", "shaman"],
  ["Warlock", "warlock"],
  ["Warrior", "warrior"],
]);

export function wowClassFor(subType: string | null): WowClass | null {
  if (subType === null) return null;

  return BY_SUBTYPE.get(subType) ?? null;
}

/** Warcraft Logs icons read "Class-Spec", e.g. "DeathKnight-Blood". Returns the spec part. */
export function specFromIcon(icon: string | null): string | null {
  if (icon === null) return null;

  const dash = icon.indexOf("-");

  if (dash < 0) return null;

  return icon.slice(dash + 1) || null;
}
