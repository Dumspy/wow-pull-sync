import { useEffect } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
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
  source: VideoSource;
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
            const inVod = pullInSource(pull, source);

            return (
              <PullRow
                key={pull.fightId}
                variant="compact"
                n={pull.pullNumber}
                kill={pull.kill}
                hp={hpLeft(pull)}
                duration={formatClock(pull.durationMs / 1000)}
                start={inVod ? formatClock(pullToVideoSeconds(pull, source)) : "no VOD"}
                selected={pull.fightId === activeId}
                className={inVod ? undefined : "opacity-45"}
                onClick={() => onSelect(pull)}
              />
            );
          })}
        </PullGroup>
      ))}
    </>
  );
}
