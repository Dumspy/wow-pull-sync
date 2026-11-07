import type { ComponentProps, ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Selectable row with a checkbox, a name and a note on the right. Pass checkbox props straight through. */
function CheckboxCard({
  className,
  label,
  note,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "children"> & { label: ReactNode; note?: ReactNode }) {
  return (
    <label
      data-slot="checkbox-card"
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors hover:bg-accent has-data-checked:border-border-strong has-data-checked:bg-accent",
        className,
      )}
    >
      <Checkbox {...props} />
      <span className="flex-1">{label}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </label>
  );
}

export { CheckboxCard };
