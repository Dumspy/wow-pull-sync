import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const dotVariants = cva("inline-block size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-subtle-foreground",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
    },
    /** Outline only, for "nothing here yet". */
    hollow: {
      true: "border border-current bg-transparent",
      false: "",
    },
  },
  defaultVariants: { tone: "neutral", hollow: false },
});

/** Kill / wipe / pending marker. */
function Dot({
  className,
  tone,
  hollow,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof dotVariants>) {
  return (
    <span
      data-slot="dot"
      aria-hidden="true"
      className={cn(dotVariants({ tone, hollow }), className)}
      {...props}
    />
  );
}

export { Dot, dotVariants };
