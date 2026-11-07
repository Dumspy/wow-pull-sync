import type { ComponentProps } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const classRings = {
  "death-knight": "ring-class-death-knight",
  "demon-hunter": "ring-class-demon-hunter",
  druid: "ring-class-druid",
  evoker: "ring-class-evoker",
  hunter: "ring-class-hunter",
  mage: "ring-class-mage",
  monk: "ring-class-monk",
  paladin: "ring-class-paladin",
  priest: "ring-class-priest",
  rogue: "ring-class-rogue",
  shaman: "ring-class-shaman",
  warlock: "ring-class-warlock",
  warrior: "ring-class-warrior",
} as const;

export type WowClass = keyof typeof classRings;

/** Player portrait. The ring takes the WoW class colour; without a class it falls back to the foreground. */
function PovAvatar({
  className,
  name,
  src,
  wowClass,
  size = "sm",
  ...props
}: Omit<ComponentProps<typeof Avatar>, "children"> & {
  name: string;
  src?: string;
  wowClass?: WowClass;
}) {
  return (
    <Avatar
      data-slot="pov-avatar"
      size={size}
      className={cn(
        "ring-2 ring-inset",
        wowClass ? classRings[wowClass] : "ring-foreground",
        className,
      )}
      {...props}
    >
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-border-strong text-[11px] font-semibold">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export { PovAvatar };
