import { useEffect } from "react";

import { pullSecondsIn, type VideoSource } from "../source";
import type { Pull } from "../types";
import { PullGroup } from "./components/pull-group";
import { PullRow } from "./components/pull-row";
import { formatClock } from "./format";
import { groupByBoss, groupSummary, hpLeft } from "./pull-view";

export function PullList({
  pulls,
  source,
  activeId,
  onSelect,
}: {
  pulls: Pull[];
  source: VideoSource | null;
  activeId: number | null;
  onSelect: (pull: Pull) => void;
}) {
  useEffect(() => {
    document
      .querySelector("[data-slot='pull-row'][aria-pressed='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  if (pulls.length === 0) {
    return <p className="px-4 py-3 text-muted-foreground">No boss pulls in this report.</p>;
  }

  return (
    <>
      {groupByBoss(pulls).map((group, index) => (
        <PullGroup
          key={`${index}:${group.name}`}
          name={group.name}
          summary={groupSummary(group.pulls)}
        >
          {group.pulls.map((pull) => {
            const seconds = pullSecondsIn(pull, source);

            return (
              <PullRow
                key={pull.fightId}
                variant="compact"
                n={pull.pullNumber}
                kill={pull.kill}
                hp={hpLeft(pull)}
                duration={formatClock(pull.durationMs / 1000)}
                start={seconds == null ? "no VOD" : formatClock(seconds)}
                selected={pull.fightId === activeId}
                className={seconds == null ? "opacity-45" : undefined}
                onClick={() => onSelect(pull)}
              />
            );
          })}
        </PullGroup>
      ))}
    </>
  );
}
