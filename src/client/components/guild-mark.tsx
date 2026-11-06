import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const guildMarkVariants = cva(
  "inline-flex shrink-0 items-center justify-center bg-border-strong font-semibold",
  {
    variants: {
      size: {
        sm: "size-5 rounded-sm text-[11px]",
        lg: "size-9 rounded-lg text-sm",
      },
    },
    defaultVariants: { size: "lg" },
  },
);

/** Rounded-square guild badge showing the guild's initial. */
function GuildMark({
  className,
  name,
  size,
  ...props
}: Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof guildMarkVariants> & { name: string }) {
  return (
    <span
      data-slot="guild-mark"
      aria-hidden="true"
      className={cn(guildMarkVariants({ size }), className)}
      {...props}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export { GuildMark };
