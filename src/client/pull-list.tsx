import { useEffect, useState } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Pull } from "../types";
import { formatClock, formatPercent } from "./format";
import { cn } from "./lib/utils";

function resultLabel(pull: Pull): string {
  if (pull.kill) return "Kill";
  if (pull.bossPercentage == null) return "Wipe";
  return formatPercent(pull.bossPercentage);
}

function damageDone(pull: Pull): number {
  if (pull.kill) return 100;
  if (pull.bossPercentage == null) return 0;
  return Math.min(100, Math.max(0, 100 - pull.bossPercentage));
}

function groupByBoss(pulls: Pull[]): { name: string; pulls: Pull[] }[] {
  const groups: { name: string; pulls: Pull[] }[] = [];
  for (const pull of pulls) {
    const last = groups.at(-1);
    if (last?.name === pull.bossName) last.pulls.push(pull);
    else groups.push({ name: pull.bossName, pulls: [pull] });
  }
  return groups;
}

export function PullList({
  pulls,
  source,
  activeId,
  onSelect,
}: {
  pulls: Pull[];
  source: VideoSource;
  activeId: number | null;
  onSelect: (pull: Pull) => void;
}) {
  const groups = groupByBoss(pulls);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  if (pulls.length === 0) {
    return <p className="px-2 py-3 text-muted-foreground">No boss pulls in this report.</p>;
  }

  return (
    <div>
      {groups.map((group, index) => {
        const key = `${index}:${group.name}`;
        const open = !collapsed[key];
        const killed = group.pulls.some((pull) => pull.kill);
        return (
          <section key={key}>
            <button
              type="button"
              className="sticky top-0 flex w-full items-center gap-2 border-0 bg-card px-2 py-1.5 text-left font-medium"
              aria-expanded={open}
              onClick={() => setCollapsed((current) => ({ ...current, [key]: open }))}
            >
              <span className="text-muted-foreground" aria-hidden>
                {open ? "▾" : "▸"}
              </span>
              <span className="min-w-0 flex-1 truncate">{group.name}</span>
              {killed ? <span className="text-primary">Kill</span> : null}
              <span className="text-muted-foreground tabular-nums">{group.pulls.length}</span>
            </button>
            {open
              ? group.pulls.map((pull) => {
                  const inVod = pullInSource(pull, source);
                  const selected = pull.fightId === activeId;
                  const when = inVod ? formatClock(pullToVideoSeconds(pull, source)) : "not in VOD";
                  return (
                    <button
                      key={pull.fightId}
                      type="button"
                      onClick={() => onSelect(pull)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "flex w-full flex-col gap-1 border-0 bg-transparent px-2 py-1.5 text-left",
                        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                        !inVod && "text-muted-foreground opacity-45",
                        !inVod && !selected && "hover:bg-transparent",
                      )}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="w-7 shrink-0 tabular-nums">#{pull.pullNumber}</span>
                        <span className={cn("truncate", pull.kill && inVod && "text-primary")}>
                          {resultLabel(pull)}
                        </span>
                        <span className="ml-auto shrink-0 tabular-nums">
                          {formatClock(pull.durationMs / 1000)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-[11px]">
                        <span className="h-1 min-w-0 flex-1 bg-foreground/10">
                          <span
                            className={cn("block h-full", pull.kill ? "bg-primary" : "bg-foreground/40")}
                            style={{ width: `${damageDone(pull)}%` }}
                          />
                        </span>
                        <span className="shrink-0 tabular-nums opacity-80">{when}</span>
                      </span>
                    </button>
                  );
                })
              : null}
          </section>
        );
      })}
    </div>
  );
}
