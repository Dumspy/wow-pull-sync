import { hc } from "hono/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { AppType } from "../api";
import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Pull } from "../types";
import { track } from "./analytics";
import { Button, buttonVariants } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { formatPercent } from "./format";
import { RaidPlayer, devFakePlayer, type PlayerController } from "./player";
import { PullList } from "./pull-list";
import { Timeline, type TimelineMode } from "./timeline";
import { cn } from "./lib/utils";

interface RaidSession {
  reportCode: string;
  reportTitle: string;
  videoTitle: string;
  pulls: Pull[];
}

const REPORT = "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9";
const VOD = "https://youtube.com/live/BLJBhzLNt8w";
const client = hc<AppType>("/api");

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

export function App() {
  const [reportUrl, setReportUrl] = useState("");
  const [vodUrl, setVodUrl] = useState("");
  const [offsetText, setOffsetText] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<RaidSession | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("night");
  const [player, setPlayer] = useState<PlayerController | null>(null);
  const fakePlayer = devFakePlayer();

  const onController = useCallback((next: PlayerController | null) => {
    setPlayer(next);
  }, []);

  const active = sources.find((source) => source.id === activeSourceId) ?? null;
  const activePull = session?.pulls.find((pull) => pull.fightId === activeId) ?? null;

  useEffect(() => {
    if (!player || !active || !session || activeId == null) return;
    const pull = session.pulls.find((item) => item.fightId === activeId);

    if (!pull || !pullInSource(pull, active)) return;
    const seconds = pullToVideoSeconds(pull, active);

    return player.onReady(() => {
      player.seekTo(seconds);
    });
  }, [player, active, session, activeId]);

  function applyOffset(next: number) {
    setSources((current) =>
      current.map((source) =>
        source.id === activeSourceId ? { ...source, offset: next } : source,
      ),
    );
  }

  function selectPull(pull: Pull) {
    track("pull clicked", { encounter_id: pull.encounterId, kill: pull.kill });
    setActiveId(pull.fightId);

    if (!active || !pullInSource(pull, active)) return;
    player?.seekTo(pullToVideoSeconds(pull, active));
  }

  function step(direction: -1 | 1) {
    if (!session || session.pulls.length === 0) return;
    const index = session.pulls.findIndex((pull) => pull.fightId === activeId);

    const nextIndex =
      index < 0 ? (direction === 1 ? 0 : session.pulls.length - 1) : index + direction;

    const pull = session.pulls[nextIndex];

    if (!pull) return;
    selectPull(pull);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const offsetSeconds = offsetText.trim() === "" ? 0 : Number(offsetText);

    if (!Number.isFinite(offsetSeconds)) {
      setError("Offset must be a number of seconds.");

      return;
    }

    setLoading(true);

    try {
      const response = await client.pulls.$post({
        json: { reportUrl, vodUrl, offsetSeconds: 0 },
      });

      if (!response.ok) {
        const error = await response.json();

        setError(error.error || "Something went wrong loading that raid.");

        return;
      }

      const body = await response.json();

      const source: VideoSource = {
        kind: "youtube",
        id: body.videoId,
        startedAt: body.vodStartedAtMs,
        duration: body.vodDurationSeconds,
        offset: offsetSeconds,
      };

      const pulls = body.pulls;
      track("raid loaded", { pull_count: pulls.length });
      const first = pulls.find((pull) => pullInSource(pull, source)) ?? pulls[0] ?? null;
      setSession({
        reportCode: body.reportCode,
        reportTitle: body.reportTitle,
        videoTitle: body.videoTitle,
        pulls,
      });
      setSources([source]);
      setActiveSourceId(source.id);
      setActiveId(first?.fightId ?? null);
      setTimelineMode("night");
      setReviewing(true);
    } catch {
      setError("Could not reach the app.");
    } finally {
      setLoading(false);
    }
  }

  if (!reviewing || !session || !active) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <header className="mb-4 flex flex-col gap-1">
            <h1 className="text-lg font-medium tracking-tight">Pull sync</h1>
            <p className="text-sm text-muted-foreground">
              Paste a Warcraft Logs report and the YouTube VOD from that night.
            </p>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Raid night</CardTitle>
              <CardDescription>
                Offset shifts every timestamp, for stream delay or a trimmed VOD. Default is 0.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={onSubmit}>
                <div className="grid gap-1.5">
                  <Label htmlFor="report-url">Warcraft Logs report</Label>
                  <Input
                    id="report-url"
                    name="reportUrl"
                    type="url"
                    required
                    placeholder={REPORT}
                    value={reportUrl}
                    onChange={(event) => setReportUrl(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vod-url">YouTube VOD</Label>
                  <Input
                    id="vod-url"
                    name="vodUrl"
                    type="url"
                    required
                    placeholder={VOD}
                    value={vodUrl}
                    onChange={(event) => setVodUrl(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5 sm:max-w-48">
                  <Label htmlFor="offset">Offset (seconds)</Label>
                  <Input
                    id="offset"
                    name="offset"
                    type="number"
                    step="1"
                    inputMode="numeric"
                    value={offsetText}
                    onChange={(event) => setOffsetText(event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Loading…" : "Load pulls"}
                  </Button>
                  {session ? (
                    <Button type="button" variant="ghost" onClick={() => setReviewing(true)}>
                      Back to raid
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
          {error ? (
            <p
              role="alert"
              className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  const index = session.pulls.findIndex((pull) => pull.fightId === activeId);

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-sm font-medium">{session.reportTitle}</h1>
          <span className="truncate text-xs text-muted-foreground">{session.videoTitle}</span>
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
            disabled={index < 0 || index >= session.pulls.length - 1}
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
            onChange={(event) => {
              setOffsetText(event.target.value);
              const next = Number(event.target.value);

              if (event.target.value.trim() !== "" && Number.isFinite(next)) applyOffset(next);
            }}
            className="h-7 w-16 px-1.5"
          />
        </Label>
        <a
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          href={reportHref(session.reportCode, activePull?.fightId ?? null)}
          target="_blank"
          rel="noreferrer"
        >
          Open in Warcraft Logs
        </a>
        <Button type="button" size="sm" variant="outline" onClick={() => setReviewing(false)}>
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
              pulls={session.pulls}
              source={active}
              activeId={activeId}
              onSelect={selectPull}
            />
          </div>
        </aside>
        <div className="relative min-w-0 flex-1 bg-black">
          <div className="absolute inset-0">
            <RaidPlayer
              videoId={active.id}
              duration={active.duration}
              fake={fakePlayer}
              onController={onController}
            />
          </div>
        </div>
      </div>
      <Timeline
        mode={timelineMode}
        onMode={setTimelineMode}
        source={active}
        pulls={session.pulls}
        activeId={activeId}
        player={player}
        onSelect={selectPull}
      />
    </div>
  );
}
