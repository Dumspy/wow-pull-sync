import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { vodLengthSeconds } from "../live";
import { pullSecondsIn, type VideoSource } from "../source";
import type { Pull, ReportResponse } from "../types";
import { parseVodLink } from "../urls";
import { VOD_ERROR_COPY } from "../vod-errors";
import { nudgedOffset, pullsToCheck } from "./add-vod";
import { AppBrand, AppHeader } from "./components/app-header";
import { Dot } from "./components/dot";
import { Notice } from "./components/notice";
import { NumberedStep } from "./components/numbered-step";
import { PaneCaption } from "./components/pane-caption";
import { PlayerName } from "./components/player-name";
import { PovAvatar } from "./components/pov-avatar";
import { Button, buttonVariants } from "./components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./components/ui/empty";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { formatClock, formatOffset } from "./format";
import { cn } from "./lib/utils";
import { RaidPlayer, devFakePlayer, type PlayerController } from "./player";
import { VodLoadError, vodQueryOptions } from "./raid-queries";
import { raidSearchFrom, type AddVodSearch, type SearchVod } from "./raid-search";
import { PLATFORM_LABELS } from "./raid-vods";
import { usePlayhead } from "./timeline";
import { useNow } from "./use-now";

const NUDGES = [-1, -0.1, 0.1, 1] as const;

/** What the pasted link turned out to be. */
type LinkState =
  | { kind: "empty" }
  | { kind: "checking" }
  | { kind: "ready"; source: VideoSource; live: boolean }
  | { kind: "error"; title: string; note: string };

export function AddVodPage({
  report,
  search,
  onSave,
}: {
  report: ReportResponse;
  search: AddVodSearch;
  onSave: (vod: SearchVod) => void;
}) {
  const replacing = search.replace != null ? search.vods[search.replace] : undefined;
  // Straight from the paste page: the raid has its log but no VOD yet.
  const first = search.vods.length === 0;

  const [link, setLink] = useState(
    first ? (import.meta.env.VITE_PREFILL_VOD_URL?.trim() ?? "") : "",
  );

  const [by, setBy] = useState<string | null>(replacing?.by != null ? String(replacing.by) : null);
  const [offset, setOffset] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [shownId, setShownId] = useState<number | null>(null);
  const [player, setPlayer] = useState<PlayerController | null>(null);
  const parsed = parseVodLink(link);

  const duplicate =
    parsed != null &&
    search.vods.some(
      (vod, at) =>
        at !== search.replace && vod.platform === parsed.platform && vod.id === parsed.id,
    );

  const query = useQuery({
    ...vodQueryOptions(parsed ?? { platform: "youtube", id: "" }),
    enabled: parsed != null && !duplicate,
  });

  const loaded = query.data;
  const live = loaded?.live === true;
  const now = useNow(live);

  // The video at offset 0. The check pulls are picked on it, so nudging the offset never swaps
  // the anchor mid-alignment.
  const video = useMemo<VideoSource | null>(
    () =>
      loaded
        ? {
            kind: loaded.platform,
            id: loaded.id,
            startedAt: loaded.startedAtMs,
            duration: vodLengthSeconds(loaded, now),
            offset: 0,
          }
        : null,
    [loaded, now],
  );

  const source = useMemo(() => (video ? { ...video, offset } : null), [video, offset]);
  const state = linkState(link, parsed != null, duplicate, query.error, source, live);

  const checks = useMemo(
    () => (video ? pullsToCheck(report.pulls, video) : []),
    [report.pulls, video],
  );

  const anchor = checks[0] ?? null;
  const shown = checks.find((pull) => pull.fightId === shownId) ?? anchor;
  const target = shown && source ? pullSecondsIn(shown, source) : null;
  const playhead = usePlayhead(player);

  const onController = useCallback((next: PlayerController | null) => {
    setPlayer(next);
  }, []);

  // A new link starts over: its own anchor pull, no offset, nothing checked.
  useEffect(() => {
    setOffset(0);
    setShownId(null);
    setCheckedIds([]);
  }, [loaded?.platform, loaded?.id]);

  useEffect(() => {
    if (!player || target == null) return;

    return player.onReady(() => player.seekTo(target));
  }, [player, target]);

  const players = report.players.slice().sort((a, b) => a.name.localeCompare(b.name));
  const recorder = players.find((item) => String(item.id) === by);
  const canSave = state.kind === "ready" && recorder != null;

  function showPull(pull: Pull) {
    setShownId(pull.fightId);

    if (pull.fightId !== anchor?.fightId && !checkedIds.includes(pull.fightId)) {
      setCheckedIds([...checkedIds, pull.fightId]);
    }
  }

  function save() {
    if (!parsed || !recorder) return;

    onSave(
      offset === 0
        ? { platform: parsed.platform, id: parsed.id, by: recorder.id }
        : { platform: parsed.platform, id: parsed.id, offset, by: recorder.id },
    );
  }

  const back = {
    to: "/raid/$reportCode" as const,
    params: { reportCode: report.reportCode },
    search: raidSearchFrom(search),
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
          <Link {...back} className="truncate text-muted-foreground hover:text-foreground">
            {report.reportTitle}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground">
            /
          </span>
          <span className="font-medium">
            {replacing ? "Replace VOD" : first ? "Add your first VOD" : "Add VOD"}
          </span>
        </nav>
      </AppHeader>
      <div className="flex flex-1 flex-wrap items-stretch">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col border-r">
          {source && target != null ? (
            <PaneCaption>
              Video at <span className="font-mono">{formatClock(playhead)}</span>
            </PaneCaption>
          ) : null}
          <div className="relative min-h-[440px] flex-1 overflow-hidden bg-black">
            {source && target != null ? (
              <div className="absolute inset-0">
                <RaidPlayer
                  key={`${source.kind}:${source.id}`}
                  source={source}
                  fake={devFakePlayer()}
                  onController={onController}
                />
              </div>
            ) : (
              <PreviewEmpty state={state} />
            )}
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-6 gap-y-2 border-t bg-card px-4 py-3 font-mono text-xs tabular-nums",
              !shown && "opacity-35",
            )}
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-muted-foreground">Log says</span>
              <span className="text-sm">
                {shown ? `${pullName(shown)} starts · 0:00` : "Pull starts · 0:00"}
              </span>
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              →
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-muted-foreground">Video should show</span>
              <span className="text-sm">
                Pull timer at {target != null ? formatClock(target) : "–"} {formatOffset(offset)}
              </span>
            </span>
            <span className="flex-1" />
            <span className="max-w-85 font-sans text-muted-foreground">
              Look for the pull timer or the boss engaging. Nudge until the frame matches.
            </span>
          </div>
        </main>
        <aside className="flex max-w-105 min-w-75 flex-[1_1_380px] flex-col gap-6 bg-card px-6 pt-6 pb-7">
          {first ? (
            <div className="flex flex-col gap-1">
              <h1 className="text-base font-semibold">Add your first VOD</h1>
              <p className="text-xs text-muted-foreground">
                The log is loaded: {report.pulls.length} pulls from {report.players.length} players.
                Paste a YouTube or Twitch recording of the night to watch the pulls.
              </p>
            </div>
          ) : null}
          <NumberedStep step={1} title="Recording">
            <p className="text-xs text-muted-foreground">
              Pick which character from this log recorded the video. Their portrait shows on the
              VOD.
            </p>
            <Input
              aria-label="Recording link"
              aria-invalid={state.kind === "error"}
              placeholder="https://www.youtube.com/watch?v=… or https://www.twitch.tv/videos/…"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              className="font-mono text-xs"
              autoComplete="off"
            />
            <LinkStatus state={state} />
            <Select
              items={players.map((item) => ({ value: String(item.id), label: item.name }))}
              value={by}
              onValueChange={(value) => setBy(value)}
            >
              <SelectTrigger aria-label="Choose whose point of view this is" className="w-full">
                <span className="flex items-center gap-2">
                  <PovAvatar
                    name={recorder?.name ?? "?"}
                    wowClass={recorder?.wowClass ?? undefined}
                    className="data-[size=sm]:size-5"
                  />
                  {recorder ? `Recorded by ${recorder.name}` : "Who recorded it?"}
                </span>
                <SelectValue className="sr-only" />
              </SelectTrigger>
              <SelectContent>
                {players.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)} className="py-1.5">
                    <PlayerName wowClass={item.wowClass}>{item.name}</PlayerName>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NumberedStep>
          <NumberedStep
            step={2}
            title="Offset"
            className={cn(!anchor && "pointer-events-none opacity-35")}
          >
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[28px] tracking-tight tabular-nums">
                {formatOffset(offset)}
              </span>
              <span className="text-xs text-muted-foreground">
                {anchor ? `lined up on the ${pullName(anchor)} start` : "lined up on a pull start"}
              </span>
            </div>
            <div className="flex gap-1.5">
              {NUDGES.map((delta) => (
                <Button
                  key={delta}
                  type="button"
                  variant="outline"
                  className="flex-1 font-mono text-xs"
                  onClick={() => setOffset(nudgedOffset(offset, delta))}
                >
                  {delta > 0 ? "+" : "-"}
                  {Math.abs(delta)}s
                </Button>
              ))}
            </div>
          </NumberedStep>
          <NumberedStep
            step={3}
            title="Check other pulls"
            className={cn(!anchor && "pointer-events-none opacity-35")}
          >
            <p className="text-xs text-muted-foreground">
              Jump to a later pull to confirm the offset holds across the night.
            </p>
            <div className="overflow-hidden rounded-lg border">
              {checks.map((pull) => {
                const isAnchor = pull.fightId === anchor?.fightId;
                const checked = isAnchor || checkedIds.includes(pull.fightId);

                return (
                  <button
                    key={pull.fightId}
                    type="button"
                    aria-pressed={pull.fightId === shown?.fightId}
                    onClick={() => showPull(pull)}
                    className="flex h-9.5 w-full items-center gap-2.5 border-b px-3 text-left text-[13px] last:border-b-0 hover:bg-accent aria-pressed:bg-accent"
                  >
                    {checked ? (
                      <Dot tone="success" />
                    ) : (
                      <span className="size-1.75 rounded-full border border-muted-foreground" />
                    )}
                    {pullName(pull)} start
                    <span className="flex-1" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {isAnchor ? "anchor" : checked ? "checked" : "not checked"}
                    </span>
                  </button>
                );
              })}
              {checks.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">
                  Paste a link to see the pulls it covers.
                </p>
              ) : null}
            </div>
          </NumberedStep>
          <Notice className="mt-auto">
            The VOD is kept in this raid's link. Anyone you share the link with can watch it.
          </Notice>
          <div className="flex items-center gap-2.5">
            <Button type="button" className="flex-1" disabled={!canSave} onClick={save}>
              Save VOD
            </Button>
            <Link {...back} className={buttonVariants({ variant: "outline" })}>
              {first ? "Skip for now" : "Cancel"}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function linkState(
  link: string,
  parsed: boolean,
  duplicate: boolean,
  error: Error | null,
  source: VideoSource | null,
  live: boolean,
): LinkState {
  if (link.trim() === "") return { kind: "empty" };

  if (!parsed) return { kind: "error", ...VOD_ERROR_COPY.unsupported };

  if (duplicate) {
    return {
      kind: "error",
      title: "This VOD is already in the raid",
      note: "Pick it from the VOD bar instead.",
    };
  }

  if (source) return { kind: "ready", source, live };

  if (error) {
    const reason = error instanceof VodLoadError ? error.reason : null;

    return reason
      ? { kind: "error", ...VOD_ERROR_COPY[reason] }
      : { kind: "error", title: "This VOD could not be loaded", note: error.message };
  }

  return { kind: "checking" };
}

function LinkStatus({ state }: { state: LinkState }) {
  if (state.kind === "ready") {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Dot tone="success" />
        <span className="text-foreground">{PLATFORM_LABELS[state.source.kind]}</span>
        <span className="font-mono">{formatClock(state.source.duration)}</span>
        {state.live ? "so far · still live" : "· a finished recording"}
      </span>
    );
  }

  if (state.kind === "checking") {
    return <span className="text-xs text-muted-foreground">Checking the link…</span>;
  }

  if (state.kind === "error") {
    return (
      <span role="alert" className="flex flex-col text-xs">
        <span className="text-destructive-text">{state.title}</span>
        <span className="text-muted-foreground">{state.note}</span>
      </span>
    );
  }

  return null;
}

function PreviewEmpty({ state }: { state: LinkState }) {
  const title =
    state.kind === "error"
      ? state.title
      : state.kind === "ready"
        ? "No pull in this VOD"
        : "No video yet";

  const note =
    state.kind === "ready"
      ? "None of this raid's pulls fall inside the recording."
      : "Paste a YouTube or Twitch link to preview it here.";

  return (
    <Empty className="absolute inset-0 border-0">
      <EmptyHeader>
        <EmptyTitle>{state.kind === "checking" ? "Checking the link…" : title}</EmptyTitle>
        {state.kind === "checking" ? null : <EmptyDescription>{note}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}

function pullName(pull: Pull): string {
  return `${pull.bossName} #${pull.pullNumber}`;
}
