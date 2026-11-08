import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Columns2, Volume2, VolumeX } from "lucide-react";

import { pullSecondsIn, sameMoment, type VideoSource } from "../source";
import type { Pull, ReportResponse } from "../types";
import { track } from "./analytics";
import { AppBrand, AppHeader } from "./components/app-header";
import { Dot } from "./components/dot";
import { PaneCaption } from "./components/pane-caption";
import { PlayerName } from "./components/player-name";
import { StatChip } from "./components/stat-chip";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./components/ui/empty";
import { AddVodChip, VodChip } from "./components/vod-chip";
import { Button, buttonVariants } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Kbd } from "./components/ui/kbd";
import { formatClock, formatOffset, formatPercent } from "./format";
import { cn } from "./lib/utils";
import { RaidPlayer, devFakePlayer, type PlayerController } from "./player";
import { PullList } from "./pull-list";
import {
  activeVodIndex,
  searchForPull,
  MAX_PANES,
  searchWithOffset,
  searchWithPaneToggled,
  searchWithRecorder,
  searchWithSideBySide,
  sidePanes,
  searchWithSpells,
  viewSearch,
  type RaidSearch,
} from "./raid-search";
import { useRaidVods, type RaidVod } from "./raid-vods";
import { Timeline, usePlayhead } from "./timeline";

export function RaidPage({
  report,
  search,
  onSelectPull,
  onReplaceSearch,
  onAddVod,
  onAnotherRaid,
}: {
  report: ReportResponse;
  search: RaidSearch;
  onSelectPull: (fightId: number, seconds: number | null) => void;
  onReplaceSearch: (search: RaidSearch) => void;
  /** Opens the Add VOD page; `replace` is the index of an expired VOD to swap out. */
  onAddVod: (replace: number | null) => void;
  onAnotherRaid: () => void;
}) {
  const vods = useRaidVods(search.vods, report.players);
  const activeIndex = activeVodIndex(search);
  // Null until the first VOD is added; the log, pulls and timeline work without one.
  const shown = vods[activeIndex] ?? null;
  const [offsetText, setOffsetText] = useState(String(shown?.ref.offset ?? 0));

  // The field edits the VOD with sound. When that changes (a chip, the speaker, back/forward),
  // it shows the new VOD's saved offset.
  const [offsetFor, setOffsetFor] = useState(activeIndex);

  if (offsetFor !== activeIndex) {
    setOffsetFor(activeIndex);
    setOffsetText(String(shown?.ref.offset ?? 0));
  }

  /** Where to put the next VOD's player after a switch, so the moment of the pull stays put. */
  const resumeAt = useRef<number | null>(null);

  /** One controller per VOD pane, by VOD index. The VOD with sound (`pov`) leads the rest. */
  const [controllers, setControllers] = useState<ReadonlyMap<number, PlayerController>>(
    () => new Map(),
  );

  const fakePlayer = devFakePlayer();
  const offsetSeconds = offsetNumber(offsetText);
  const player = controllers.get(activeIndex) ?? null;
  const panes = sidePanes(search);
  const split = panes.length > 0;
  const shownIndexes = split ? panes : [activeIndex];

  const register = useCallback((index: number, next: PlayerController | null) => {
    setControllers((previous) => {
      const updated = new Map(previous);

      if (next) updated.set(index, next);
      else updated.delete(index);

      return updated;
    });
  }, []);

  const loaded = shown?.source;
  const kind = loaded?.kind;
  const videoId = loaded?.id;
  const startedAt = loaded?.startedAt;
  const duration = loaded?.duration;

  // `shown.source` is rebuilt every render, so the memo keys on its fields.
  const source = useMemo<VideoSource | null>(
    () =>
      kind != null && videoId != null && startedAt != null && duration != null
        ? { kind, id: videoId, startedAt, duration, offset: offsetSeconds }
        : null,
    [kind, videoId, startedAt, duration, offsetSeconds],
  );

  const activePull = report.pulls.find((pull) => pull.fightId === search.pull) ?? null;

  /** The leader uses the offset being typed; the other panes their saved offsets. */
  function paneSource(index: number): VideoSource | null {
    return index === activeIndex ? source : (vods[index]?.source ?? null);
  }

  /** Followers: the other panes side by side, each with its controller and source. */
  const followers = shownIndexes.flatMap((index): Follower[] => {
    const controller = controllers.get(index);
    const own = paneSource(index);

    return index !== activeIndex && controller && own ? [{ controller, source: own }] : [];
  });

  /** Seek the leader, and every other pane to the same moment (or pause it if it has none). */
  function seekAll(seconds: number) {
    player?.seekTo(seconds);

    if (source) seekFollowers(seconds, source, followers);
  }

  const sync = useRef({ player, source, followers });
  sync.current = { player, source, followers };

  // Side by side, the other panes follow the leader: same moment, playing or paused with it.
  useEffect(() => {
    if (!split) return;

    const timer = window.setInterval(() => {
      const { player: leader, source: leading, followers: others } = sync.current;

      if (!leader || !leading) return;
      const at = leader.getCurrentTime();
      const playing = leader.isPlaying();

      for (const follower of others) {
        const target = sameMoment(at, leading, follower.source);

        if (target == null) {
          follower.controller.pause();
          continue;
        }

        // seekTo also starts playback, so a seeked follower of a paused leader pauses again.
        const drifted = Math.abs(follower.controller.getCurrentTime() - target) > 1.5;

        if (drifted) follower.controller.seekTo(target);

        if (playing && !follower.controller.isPlaying()) follower.controller.play();
        else if (!playing && (drifted || follower.controller.isPlaying())) {
          follower.controller.pause();
        }
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [split]);

  // Only the leader has sound side by side.
  useEffect(() => {
    for (const [index, controller] of controllers) {
      controller.setMuted(split && index !== activeIndex);
    }
  }, [controllers, split, activeIndex]);

  useEffect(() => {
    track("raid loaded", { pull_count: report.pulls.length });
  }, [report.reportCode, report.pulls.length]);

  const seededPull = useRef(false);

  useEffect(() => {
    if (seededPull.current || search.pull != null || shown?.status === "loading") return;

    const first =
      report.pulls.find((pull) => pullSecondsIn(pull, source) != null) ?? report.pulls[0];

    if (!first) return;
    seededPull.current = true;
    onReplaceSearch(searchForPull(search, first.fightId, seekSeconds(first, source)));
  }, [report.pulls, onReplaceSearch, search, source, shown?.status]);

  useEffect(() => {
    if (!player) return;
    const pull = report.pulls.find((item) => item.fightId === search.pull);
    const seconds = resumeAt.current ?? (pull ? pullSecondsIn(pull, source) : null);

    if (seconds == null) return;

    return player.onReady(() => {
      resumeAt.current = null;
      const { player: leader, source: leading, followers: others } = sync.current;
      leader?.seekTo(seconds);

      if (leading) seekFollowers(seconds, leading, others);
    });
  }, [player, source, report.pulls, search.pull]);

  function selectPull(pull: Pull) {
    track("pull clicked", { encounter_id: pull.encounterId, kill: pull.kill });
    const exact = pullSecondsIn(pull, source);

    if (exact != null) seekAll(exact);
    onSelectPull(pull.fightId, exact == null ? null : Math.round(exact));
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
    if (!source || seconds < 0 || seconds > source.duration) return;
    seekAll(seconds);
  }

  /** Show another VOD at the same wall-clock moment, or at the pull start if it has no footage then. */
  /** A new leader picks up at the moment on screen now, not back at the pull start. */
  function keepMoment(index: number) {
    const next = vods[index]?.source;
    resumeAt.current = source && next ? sameMoment(playhead, source, next) : null;
  }

  function switchVod(next: RaidVod) {
    if (next.index === activeIndex) return;
    keepMoment(next.index);

    track("VOD switched", { platform: next.ref.platform });
    // `t` is the pull start in the VOD on screen, so it follows the switch.
    const { t: _previous, ...rest } = search;
    const t = activePull ? seekSeconds(activePull, next.source) : null;

    onReplaceSearch(t == null ? { ...rest, pov: next.index } : { ...rest, pov: next.index, t });
  }

  function nextDeath() {
    const start = activePull ? pullSecondsIn(activePull, source) : null;

    if (!activePull || start == null) return;

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

  /** Side by side, a chip adds or removes its pane; the sound moves with it. */
  function togglePane(vod: RaidVod) {
    const next = searchWithPaneToggled(search, vod.index);
    const pov = activeVodIndex(next);

    if (pov !== activeIndex) keepMoment(pov);

    onReplaceSearch(next);
  }

  /** Side by side, give a pane the sound. It leads from then on. */
  function listenTo(index: number) {
    if (index === activeIndex) return;
    keepMoment(index);
    onReplaceSearch({ ...search, pov: index });
  }

  const pullStart = activePull ? pullSecondsIn(activePull, source) : null;
  const recorders = report.players.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-[13px] font-semibold">{report.reportTitle}</h1>
          <span className="truncate text-xs text-muted-foreground">
            {[
              report.zone?.name,
              report.guild?.name,
              vods.length === 0
                ? "No VOD yet"
                : vods.length === 1
                  ? "1 VOD"
                  : `${vods.length} VODs`,
            ]
              .filter(Boolean)
              .join(" · ")}
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
          search={viewSearch(search)}
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
        <Button type="button" size="sm" variant="outline" onClick={onAnotherRaid}>
          Load another raid
        </Button>
      </AppHeader>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-2" aria-label="VODs" role="group">
            <span className="text-xs text-muted-foreground">VODs</span>
            {vods.map((vod) => {
              const active = split ? panes.includes(vod.index) : vod.index === activeIndex;
              const offset = vod.index === activeIndex ? offsetSeconds : (vod.ref.offset ?? 0);

              const covers =
                vod.source && activePull
                  ? pullSecondsIn(activePull, { ...vod.source, offset }) != null
                  : undefined;

              return (
                <VodChip
                  key={`${vod.ref.platform}:${vod.ref.id}:${vod.index}`}
                  name={vod.name}
                  platform={vod.platformLabel}
                  wowClass={vod.wowClass}
                  offset={formatOffset(offset)}
                  covers={covers}
                  expired={vod.status === "expired"}
                  active={active}
                  onClick={() => (split ? togglePane(vod) : switchVod(vod))}
                />
              );
            })}
            <AddVodChip onClick={() => onAddVod(null)} />
            <span className="flex-1" />
            {split ? (
              <span className="text-xs text-muted-foreground">
                Pick up to {MAX_PANES} · speaker sets the audio
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={split}
              disabled={vods.length < 2}
              className="aria-pressed:bg-accent"
              onClick={() => {
                track("side by side toggled", { on: !split });
                onReplaceSearch(searchWithSideBySide(search, !split));
              }}
            >
              <Columns2 />
              Side by side
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            {shownIndexes.map((index) => {
              const vod = vods[index];

              if (!vod) return <NoVodPane key="none" onAdd={() => onAddVod(null)} />;

              return (
                <VideoPane
                  key={`${index}:${vod.ref.platform}:${vod.ref.id}`}
                  vod={vod}
                  source={paneSource(index)}
                  pull={activePull}
                  fake={fakePlayer}
                  register={register}
                  split={split}
                  audible={index === activeIndex}
                  onListen={() => listenTo(index)}
                  onReplace={() => onAddVod(index)}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border bg-card px-4 py-2 font-mono text-xs tabular-nums">
            {source ? (
              <span className="text-[13px]">
                {formatClock(playhead)}
                <span className="text-muted-foreground"> / {formatClock(source.duration)}</span>
              </span>
            ) : null}
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
            {shown ? (
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                {shown.name} offset
                <Input
                  aria-label={`Offset in seconds for ${shown.name}`}
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
            ) : null}
            {shown && shown.ref.by == null ? (
              <Select
                items={recorders.map((item) => ({ value: String(item.id), label: item.name }))}
                value={null}
                onValueChange={(value) => {
                  if (value != null) onReplaceSearch(searchWithRecorder(search, Number(value)));
                }}
              >
                <SelectTrigger size="sm" className="h-6 font-sans text-xs">
                  <SelectValue placeholder={`Who recorded ${shown.name}?`} />
                </SelectTrigger>
                <SelectContent>
                  {recorders.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)} className="py-1.5">
                      <PlayerName wowClass={item.wowClass}>{item.name}</PlayerName>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
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

interface Follower {
  controller: PlayerController;
  source: VideoSource;
}

/** Put each follower on the leader's moment, or pause it where it has no footage then. */
function seekFollowers(seconds: number, leading: VideoSource, others: Follower[]) {
  for (const follower of others) {
    const target = sameMoment(seconds, leading, follower.source);

    if (target == null) follower.controller.pause();
    else follower.controller.seekTo(target);
  }
}

function offsetNumber(offsetText: string): number {
  if (offsetText.trim() === "") return 0;
  const next = Number(offsetText);

  if (!Number.isFinite(next)) return 0;

  return next;
}

function seekSeconds(pull: Pull, source: VideoSource | null): number | null {
  const seconds = pullSecondsIn(pull, source);

  return seconds == null ? null : Math.round(seconds);
}

/** One VOD's player with its label. Side by side it also has the speaker button. */
function VideoPane({
  vod,
  source,
  pull,
  fake,
  register,
  split,
  audible,
  onListen,
  onReplace,
}: {
  vod: RaidVod;
  source: VideoSource | null;
  pull: Pull | null;
  fake: boolean;
  register: (index: number, controller: PlayerController | null) => void;
  split: boolean;
  audible: boolean;
  onListen: () => void;
  onReplace: () => void;
}) {
  const index = vod.index;

  const onController = useCallback(
    (controller: PlayerController | null) => register(index, controller),
    [register, index],
  );

  const covered = pull ? pullSecondsIn(pull, source) != null : true;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-black",
        split && audible && "border-border-strong ring-1 ring-border-strong",
      )}
    >
      {pull || split ? (
        <PaneCaption>
          {pull ? (
            <>
              <Dot tone={pull.kill ? "success" : "neutral"} />
              <span className="shrink-0 font-medium">{vod.name}</span>
              <span className="shrink-0 text-muted-foreground">{vod.platformLabel}</span>
              <span className="truncate text-soft-foreground">{pullSummary(pull)}</span>
            </>
          ) : null}
          {split ? (
            <button
              type="button"
              aria-pressed={audible}
              aria-label={audible ? `${vod.name} is playing audio` : `Play audio from ${vod.name}`}
              onClick={onListen}
              className={cn(
                "ml-auto inline-flex h-6.5 shrink-0 items-center gap-1.5 rounded-sm border bg-background px-2 text-xs",
                audible ? "border-ring text-foreground" : "text-muted-foreground",
              )}
            >
              {audible ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              {audible ? "Audio" : "Muted"}
            </button>
          ) : null}
        </PaneCaption>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {source ? (
          <div className="absolute inset-0">
            <RaidPlayer
              key={`${source.kind}:${source.id}`}
              source={source}
              fake={fake}
              onController={onController}
            />
          </div>
        ) : (
          <VodUnavailable vod={vod} onReplace={onReplace} />
        )}
        {source && !covered ? (
          <Empty className="absolute inset-0 border-0 bg-black">
            <EmptyHeader>
              <EmptyTitle>No footage for this pull</EmptyTitle>
              <EmptyDescription>Pick another pull or VOD.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>
    </div>
  );
}

/** The player area before the raid has a VOD. */
function NoVodPane({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border bg-black">
      <Empty className="absolute inset-0 border-0">
        <EmptyHeader>
          <EmptyTitle>Add a VOD to watch the pulls</EmptyTitle>
          <EmptyDescription>
            Paste a YouTube or Twitch recording of this raid. The pull list and timeline already
            work without one.
          </EmptyDescription>
        </EmptyHeader>
        <Button type="button" size="sm" onClick={onAdd}>
          Add VOD
        </Button>
      </Empty>
    </div>
  );
}

/** The player area when the VOD on screen can't play: still loading, gone, or failed. */
function VodUnavailable({ vod, onReplace }: { vod: RaidVod; onReplace: () => void }) {
  if (vod.status === "loading") {
    return (
      <Empty className="absolute inset-0 border-0">
        <EmptyHeader>
          <EmptyTitle>Loading VOD…</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (vod.status === "expired") {
    return (
      <Empty className="absolute inset-0 border-0">
        <EmptyHeader>
          <EmptyTitle>VOD expired</EmptyTitle>
          <EmptyDescription>
            {vod.platformLabel} removed this recording. The log and timeline still work.
          </EmptyDescription>
        </EmptyHeader>
        <Button type="button" size="sm" variant="outline" onClick={onReplace}>
          Replace link
        </Button>
      </Empty>
    );
  }

  return (
    <Empty className="absolute inset-0 border-0">
      <EmptyHeader>
        <EmptyTitle>This VOD could not be loaded</EmptyTitle>
        <EmptyDescription>{vod.error}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
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
