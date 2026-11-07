import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Side-panel step: mono number, title, then content. */
function NumberedStep({
  className,
  step,
  title,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & { step: number; title: ReactNode }) {
  return (
    <section
      data-slot="numbered-step"
      className={cn("flex flex-col gap-2.5", className)}
      {...props}
    >
      <h2 className="text-[13px] font-semibold">
        <span className="mr-2 font-mono text-muted-foreground">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export { NumberedStep };
