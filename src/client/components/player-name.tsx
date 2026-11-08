import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import type { WowClass } from "./pov-avatar";

const classTexts = {
  "death-knight": "text-class-death-knight",
  "demon-hunter": "text-class-demon-hunter",
  druid: "text-class-druid",
  evoker: "text-class-evoker",
  hunter: "text-class-hunter",
  mage: "text-class-mage",
  monk: "text-class-monk",
  paladin: "text-class-paladin",
  priest: "text-class-priest",
  rogue: "text-class-rogue",
  shaman: "text-class-shaman",
  warlock: "text-class-warlock",
  warrior: "text-class-warrior",
} as const satisfies Record<WowClass, string>;

/** A character name in its WoW class colour, as in game. Without a class it keeps the text colour. */
function PlayerName({
  className,
  wowClass,
  ...props
}: ComponentProps<"span"> & { wowClass?: WowClass | null }) {
  return (
    <span
      data-slot="player-name"
      className={cn("font-medium", wowClass && classTexts[wowClass], className)}
      {...props}
    />
  );
}

export { PlayerName };
