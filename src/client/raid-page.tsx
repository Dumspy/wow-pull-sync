import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Pull, ReportResponse, VodResponse } from "../types";
import { track } from "./analytics";
import { AppBrand, AppHeader } from "./components/app-header";
import { Dot } from "./components/dot";
import { OverlayLabel } from "./components/overlay-label";
import { StatChip } from "./components/stat-chip";
import { Button, buttonVariants } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Kbd } from "./components/ui/kbd";
import { formatClock, formatPercent } from "./format";
import { cn } from "./lib/utils";
import { RaidPlayer, devFakePlayer, type PlayerController } from "./player";
import { PullList } from "./pull-list";
import { searchForPull, searchWithOffset, searchWithSpells, type RaidSearch } from "./raid-search";
import { Timeline, usePlayhead } from "./timeline";

export function RaidPage({
  report,
  vod,
  search,
  initialOffsetText,
  onSelectPull,
  onReplaceSearch,
  onAnotherRaid,
}: {
  report: ReportResponse;
  vod: VodResponse;
  search: RaidSearch;
  initialOffsetText: string;
  onSelectPull: (fightId: number, seconds: number | null) => void;
  onReplaceSearch: (search: RaidSearch) => void;
  onAnotherRaid: (offsetText: string) => void;
}) {
  const [offsetText, setOffsetText] = useState(
    search.offset != null ? String(search.offset) : initialOffsetText,
  );

  const [player, setPlayer] = useState<PlayerController | null>(null);
  const fakePlayer = devFakePlayer();
  const offsetSeconds = offsetNumber(offsetText);

  const onController = useCallback((next: PlayerController | null) => {
    setPlayer(next);
  }, []);

  const source = useMemo<VideoSource>(
    () => ({
      kind: vod.platform,
      id: vod.id,
      startedAt: vod.startedAtMs,
      duration: vod.durationSeconds,
      offset: offsetSeconds,
    }),
    [vod.platform, vod.id, vod.startedAtMs, vod.durationSeconds, offsetSeconds],
  );

  const activePull = report.pulls.find((pull) => pull.fightId === search.pull) ?? null;

  useEffect(() => {
    track("raid loaded", { pull_count: report.pulls.length });
  }, [report.reportCode, vod.id, report.pulls.length]);

  const seededPull = useRef(false);

  useEffect(() => {
    if (seededPull.current || search.pull != null) return;
    const first = report.pulls.find((pull) => pullInSource(pull, source)) ?? report.pulls[0];

    if (!first) return;
    seededPull.current = true;
    onReplaceSearch(searchForPull(search, first.fightId, seekSeconds(first, source)));
  }, [report.pulls, onReplaceSearch, search, source]);

  useEffect(() => {
    if (!player || search.pull == null) return;
    const pull = report.pulls.find((item) => item.fightId === search.pull);

    if (!pull || !pullInSource(pull, source)) return;
    const seconds = pullToVideoSeconds(pull, source);

    return player.onReady(() => {
      player.seekTo(seconds);
    });
  }, [player, source, report.pulls, search.pull]);

  function selectPull(pull: Pull) {
    track("pull clicked", { encounter_id: pull.encounterId, kill: pull.kill });
    const seconds = seekSeconds(pull, source);

    if (seconds != null) player?.seekTo(pullToVideoSeconds(pull, source));
    onSelectPull(pull.fightId, seconds);
  }

  function step(direction: -1 | 1) {
    if (report.pulls.length === 0) return;
    const index = report.pulls.findIndex((pull) => pull.fightId === search.pull);

    const nextIndex =
      index < 0 ? (direction === 1 ? 0 : report.pulls.length - 1) : index + direction;

    const pull = report.pulls[nextIndex];

    if (!pull) return;
    selectPull(pull);
  }

  const index = report.pulls.findIndex((pull) => pull.fightId === search.pull);
  const playhead = usePlayhead(player);
  const kills = report.pulls.filter((pull) => pull.kill).length;

  function seek(seconds: number) {
    if (seconds < 0 || seconds > source.duration) return;
    player?.seekTo(seconds);
  }

  function nextDeath() {
    if (!activePull || !pullInSource(activePull, source)) return;
    const start = pullToVideoSeconds(activePull, source);

    const next = activePull.deaths
      .map((death) => start + death.atMs / 1000)
      .sort((a, b) => a - b)
      .find((seconds) => seconds > playhead + 0.5);

    if (next != null) seek(next);
  }

  const shortcuts = useRef({ step, nextDeath });
  shortcuts.current = { step, nextDeath };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.target instanceof Element && event.target.closest("input, textarea, select")) {
        return;
      }

      if (event.key === "j") shortcuts.current.step(-1);
      else if (event.key === "k") shortcuts.current.step(1);
      else if (event.key === "d") shortcuts.current.nextDeath();
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeInVod = activePull ? pullInSource(activePull, source) : false;
  const pullStart = activePull && activeInVod ? pullToVideoSeconds(activePull, source) : null;

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-[13px] font-semibold">{report.reportTitle}</h1>
          <span className="truncate text-xs text-muted-foreground">
            {[report.zone?.name, report.guild?.name].filter(Boolean).join(" · ") || vod.title}
          </span>
        </div>
        <StatChip tone="success" value={kills}>
          {kills === 1 ? "kill" : "kills"}
        </StatChip>
        <StatChip tone="neutral" value={report.pulls.length - kills}>
          {report.pulls.length - kills === 1 ? "wipe" : "wipes"}
        </StatChip>
        <span className="flex-1" />
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={index < 0 || index >= report.pulls.length - 1}
            onClick={() => step(1)}
          >
            Next
          </Button>
        </div>
        <Link
          to="/raid/$reportCode/overview"
          params={{ reportCode: report.reportCode }}
          search={{ vod: search.vod, offset: search.offset }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Overview
        </Link>
        <a
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          href={reportHref(report.reportCode, activePull?.fightId ?? null)}
          target="_blank"
          rel="noreferrer"
        >
          Open in Warcraft Logs
        </a>
        <Button type="button" size="sm" variant="outline" onClick={() => onAnotherRaid(offsetText)}>
          Load another raid
        </Button>
      </AppHeader>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-black">
            <div className="absolute inset-0">
              <RaidPlayer
                videoId={source.id}
                duration={source.duration}
                fake={fakePlayer}
                onController={onController}
              />
            </div>
            {activePull ? (
              <OverlayLabel>
                <Dot tone={activePull.kill ? "success" : "neutral"} />
                <span className="text-soft-foreground">{pullSummary(activePull)}</span>
              </OverlayLabel>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border bg-card px-4 py-2 font-mono text-xs tabular-nums">
            <span className="text-[13px]">
              {formatClock(playhead)}
              <span className="text-muted-foreground"> / {formatClock(source.duration)}</span>
            </span>
            {activePull ? (
              <span className="text-muted-foreground">
                pull <span className="text-foreground">#{activePull.pullNumber}</span>
                {pullStart != null && playhead >= pullStart ? (
                  <>
                    {" "}
                    · <span className="text-foreground">
                      {formatClock(playhead - pullStart)}
                    </span>{" "}
                    in
                  </>
                ) : null}
              </span>
            ) : null}
            <label className="inline-flex items-center gap-2 text-muted-foreground">
              Offset
              <Input
                aria-label="Offset in seconds"
                type="number"
                step="1"
                value={offsetText}
                onChange={(event) => {
                  setOffsetText(event.target.value);
                  onReplaceSearch(searchWithOffset(search, offsetNumber(event.target.value)));
                }}
                className="h-6 w-20 px-2 text-right font-mono text-xs"
              />
            </label>
            <span className="flex-1" />
            <span className="inline-flex items-center gap-3.5 font-sans text-muted-foreground">
              <span>
                <Kbd>j</Kbd> prev
              </span>
              <span>
                <Kbd>k</Kbd> next
              </span>
              <span>
                <Kbd>d</Kbd> next death
              </span>
            </span>
          </div>
        </div>
        <aside className="my-3 mr-3 flex w-80 shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex h-9 shrink-0 items-center justify-between border-b pr-3 pl-4 text-xs text-muted-foreground">
            <span>Pulls</span>
            <span className="font-mono">{report.pulls.length} total</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PullList
              pulls={report.pulls}
              source={source}
              activeId={search.pull ?? null}
              onSelect={selectPull}
            />
          </div>
        </aside>
      </div>
      <Timeline
        source={source}
        pulls={report.pulls}
        activeId={search.pull ?? null}
        playhead={playhead}
        players={report.players}
        encounterPhases={report.encounterPhases}
        abilities={report.abilities}
        spells={search.spells ?? []}
        onSpellsChange={(spells) => onReplaceSearch(searchWithSpells(search, spells))}
        onSeek={seek}
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
