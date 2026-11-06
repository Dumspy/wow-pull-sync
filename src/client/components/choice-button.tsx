import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Toggle button with a label and a muted note, for short either/or choices like review scope. */
function ChoiceButton({
  className,
  label,
  note,
  selected = false,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  note?: ReactNode;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="choice-button"
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent aria-pressed:border-border-strong aria-pressed:bg-accent",
        className,
      )}
      {...props}
    >
      <span className="font-medium">{label}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </button>
  );
}

export { ChoiceButton };
