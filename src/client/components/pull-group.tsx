import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Collapsible boss group in the player's pull list. The header sticks while its rows scroll. */
function PullGroup({
  name,
  summary,
  defaultOpen = true,
  children,
}: {
  name: ReactNode;
  /** Mono summary on the right, e.g. "1 / 16 · 12%". */
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible data-slot="pull-group" defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group/pull-group sticky top-0 z-1 flex h-8.5 w-full items-center gap-2 border-b bg-popover px-3 text-left text-[13px] transition-colors hover:bg-accent">
        <ChevronDown className="size-2.5 -rotate-90 text-muted-foreground transition-transform group-data-panel-open/pull-group:rotate-0" />
        <span className="font-semibold">{name}</span>
        <span className="flex-1" />
        <span className="font-mono text-xs text-muted-foreground">{summary}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export { PullGroup };
