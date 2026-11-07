/**
 * Spells left out of the event picker: player or generic abilities that show up in the boss
 * fights' enemy casts but say nothing about the encounter. Names are matched ignoring case.
 */
export const HIDDEN_SPELL_IDS: ReadonlySet<number> = new Set([
  51052, // Anti-Magic Zone
  145629, // Anti-Magic Zone, the buff
]);

export const HIDDEN_SPELL_NAMES: ReadonlySet<string> = new Set([
  "anti-magic zone",
  "generic spell",
]);
