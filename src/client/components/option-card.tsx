import type { ComponentProps, ReactNode } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/** A radio list of OptionCards, e.g. "Who can view". */
function OptionGroup({ className, ...props }: ComponentProps<typeof RadioGroup>) {
  return <RadioGroup data-slot="option-group" className={cn("gap-1", className)} {...props} />;
}

/** Selectable row: radio, label and a muted note. Must sit inside an OptionGroup. */
function OptionCard({
  className,
  value,
  label,
  note,
  ...props
}: Omit<ComponentProps<"label">, "children"> & {
  value: string;
  label: ReactNode;
  note?: ReactNode;
}) {
  return (
    <label
      data-slot="option-card"
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-[13px] transition-colors hover:bg-accent has-data-checked:border-border-strong has-data-checked:bg-accent",
        className,
      )}
      {...props}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col gap-px">
        <span className="font-medium">{label}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </span>
    </label>
  );
}

export { OptionCard, OptionGroup };
