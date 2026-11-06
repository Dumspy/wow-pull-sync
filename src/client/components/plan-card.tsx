import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Pricing tier. Put the feature list and call to action in as children. */
function PlanCard({
  className,
  name,
  price,
  per,
  featured = false,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  name: ReactNode;
  price: ReactNode;
  per?: ReactNode;
  featured?: boolean;
}) {
  return (
    <section
      data-slot="plan-card"
      data-featured={featured}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-6 data-[featured=true]:border-muted-foreground data-[featured=true]:bg-popover",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{name}</h2>
        <span>
          <span className="font-mono text-xl">{price}</span>{" "}
          {per && <span className="text-muted-foreground">{per}</span>}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Bulleted list, or ticked when `included`. */
function PlanFeatures({
  items,
  included = false,
}: {
  items: readonly string[];
  included?: boolean;
}) {
  return (
    <ul data-slot="plan-features" className="flex flex-col gap-2.5 text-soft-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          {included ? (
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
          ) : (
            <span className="text-muted-foreground">•</span>
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}

export { PlanCard, PlanFeatures };
