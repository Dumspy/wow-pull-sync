import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Pull, PullSyncResponse } from "../types";
import { track } from "./analytics";
import { Button, buttonVariants } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { formatPercent } from "./format";
import { cn } from "./lib/utils";
import { RaidPlayer, devFakePlayer, type PlayerController } from "./player";
import { PullList } from "./pull-list";
import { searchForPull, type RaidSearch } from "./raid-search";
import { Timeline, type TimelineMode } from "./timeline";

export function RaidPage({
  data,
  search,
  initialOffsetText,
  onSelectPull,
  onReplaceSearch,
  onAnotherRaid,
}: {
  data: PullSyncResponse;
  search: RaidSearch;
  initialOffsetText: string;
  onSelectPull: (fightId: number, seconds: number | null) => void;
  onReplaceSearch: (search: RaidSearch) => void;
  onAnotherRaid: (offsetText: string) => void;
}) {
  const [offsetText, setOffsetText] = useState(initialOffsetText);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("night");
  const [player, setPlayer] = useState<PlayerController | null>(null);
  const fakePlayer = devFakePlayer();
  const offsetSeconds = offsetNumber(offsetText);

  const onController = useCallback((next: PlayerController | null) => {
    setPlayer(next);
  }, []);

  const source = useMemo<VideoSource>(
    () => ({
      kind: "youtube",
      id: data.videoId,
      startedAt: data.vodStartedAtMs,
      duration: data.vodDurationSeconds,
      offset: offsetSeconds,
    }),
    [data.videoId, data.vodStartedAtMs, data.vodDurationSeconds, offsetSeconds],
  );

  const activePull = data.pulls.find((pull) => pull.fightId === search.pull) ?? null;

  useEffect(() => {
    track("raid loaded", { pull_count: data.pulls.length });
  }, [data.reportCode, data.videoId, data.pulls.length]);

  const seededPull = useRef(false);

  useEffect(() => {
    if (seededPull.current || search.pull != null) return;
    const first = data.pulls.find((pull) => pullInSource(pull, source)) ?? data.pulls[0];

    if (!first) return;
    seededPull.current = true;
    onReplaceSearch(searchForPull(search, first.fightId, seekSeconds(first, source)));
  }, [data.pulls, onReplaceSearch, search, source]);

  useEffect(() => {
    if (!player || search.pull == null) return;
    const pull = data.pulls.find((item) => item.fightId === search.pull);

    if (!pull || !pullInSource(pull, source)) return;
    const seconds = pullToVideoSeconds(pull, source);

    return player.onReady(() => {
      player.seekTo(seconds);
    });
  }, [player, source, data.pulls, search.pull]);

  function selectPull(pull: Pull) {
    track("pull clicked", { encounter_id: pull.encounterId, kill: pull.kill });
    const seconds = seekSeconds(pull, source);

    if (seconds != null) player?.seekTo(pullToVideoSeconds(pull, source));
    onSelectPull(pull.fightId, seconds);
  }

  function step(direction: -1 | 1) {
    if (data.pulls.length === 0) return;
    const index = data.pulls.findIndex((pull) => pull.fightId === search.pull);

    const nextIndex = index < 0 ? (direction === 1 ? 0 : data.pulls.length - 1) : index + direction;

    const pull = data.pulls[nextIndex];

    if (!pull) return;
    selectPull(pull);
  }

  const index = data.pulls.findIndex((pull) => pull.fightId === search.pull);

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-sm font-medium">{data.reportTitle}</h1>
          <span className="truncate text-xs text-muted-foreground">{data.videoTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={index <= 0}
            onClick={() => step(-1)}
          >
            Prev
          </Button>
          <p className="max-w-56 truncate text-xs">
            {activePull ? pullSummary(activePull) : "No pull"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={index < 0 || index >= data.pulls.length - 1}
            onClick={() => step(1)}
          >
            Next
          </Button>
        </div>
        <Label className="text-muted-foreground">
          Offset
          <Input
            aria-label="Offset in seconds"
            type="number"
            step="1"
            value={offsetText}
            onChange={(event) => setOffsetText(event.target.value)}
            className="h-7 w-16 px-1.5"
          />
        </Label>
        <a
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          href={reportHref(data.reportCode, activePull?.fightId ?? null)}
          target="_blank"
          rel="noreferrer"
        >
          Open in Warcraft Logs
        </a>
        <Button type="button" size="sm" variant="outline" onClick={() => onAnotherRaid(offsetText)}>
          Load another raid
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
          <div className="border-b border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
            Sources
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PullList
              pulls={data.pulls}
              source={source}
              activeId={search.pull ?? null}
              onSelect={selectPull}
            />
          </div>
        </aside>
        <div className="relative min-w-0 flex-1 bg-black">
          <div className="absolute inset-0">
            <RaidPlayer
              videoId={source.id}
              duration={source.duration}
              fake={fakePlayer}
              onController={onController}
            />
          </div>
        </div>
      </div>
      <Timeline
        mode={timelineMode}
        onMode={setTimelineMode}
        source={source}
        pulls={data.pulls}
        activeId={search.pull ?? null}
        player={player}
        onSelect={selectPull}
      />
    </div>
  );
}

function offsetNumber(offsetText: string): number {
  if (offsetText.trim() === "") return 0;
  const next = Number(offsetText);

  if (!Number.isFinite(next)) return 0;

  return next;
}

function seekSeconds(pull: Pull, source: VideoSource): number | null {
  if (!pullInSource(pull, source)) return null;

  return Math.round(pullToVideoSeconds(pull, source));
}

function reportHref(code: string, fightId: number | null): string {
  const base = `https://www.warcraftlogs.com/reports/${encodeURIComponent(code)}`;

  if (fightId == null) return base;

  return `${base}#fight=${fightId}`;
}

function pullSummary(pull: Pull): string {
  const result = pull.kill
    ? "Kill"
    : pull.bossPercentage != null
      ? formatPercent(pull.bossPercentage)
      : "Wipe";

  return `${pull.bossName} · #${pull.pullNumber} · ${result}`;
}
