import { useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Pull, PullSyncResponse } from "../types";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { formatClock } from "./format";
import { YoutubePlayer } from "./player";

export function App() {
  const [reportUrl, setReportUrl] = useState("");
  const [vodUrl, setVodUrl] = useState("");
  const [offset, setOffset] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullSyncResponse | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playingFrom, setPlayingFrom] = useState<number | null>(null);
  const seekRef = useRef<(seconds: number) => void>(() => {});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setActiveId(null);
    setPlayingFrom(null);
    const offsetSeconds = offset.trim() === "" ? 0 : Number(offset);
    if (!Number.isFinite(offsetSeconds)) {
      setError("Offset must be a number of seconds.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/pulls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl,
          vodUrl,
          offsetSeconds,
        }),
      });
      const body = (await response.json()) as PullSyncResponse & { error?: string };
      if (!response.ok) {
        setResult(null);
        setError(body.error || "Something went wrong loading that raid.");
        return;
      }
      setResult(body);
    } catch {
      setResult(null);
      setError("Could not reach the app.");
    } finally {
      setLoading(false);
    }
  }

  function onPull(pull: Pull) {
    if (!pull.inVod) return;
    setActiveId(pull.fightId);
    setPlayingFrom(pull.vodSeconds);
    seekRef.current(pull.vodSeconds);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium tracking-tight">Pull sync</h1>
        <p className="text-sm text-muted-foreground">
          Paste a Warcraft Logs report and the raid VOD. Each boss pull jumps the video to when
          that pull started.
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
                placeholder="https://www.warcraftlogs.com/reports/…"
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
                placeholder="https://youtube.com/live/…"
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
                value={offset}
                onChange={(event) => setOffset(event.target.value)}
              />
            </div>
            <div>
              <Button type="submit" disabled={loading}>
                {loading ? "Loading…" : "Load pulls"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>{result.videoTitle}</CardTitle>
              <CardDescription>
                {result.reportTitle} · {result.reportCode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YoutubePlayer videoId={result.videoId} seekRef={seekRef} />
              {playingFrom != null ? (
                <p className="pt-2 text-muted-foreground">Playing from {formatClock(playingFrom)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Boss pulls</CardTitle>
              <CardDescription>
                {result.pulls.length} pulls. Trash fights are left out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.pulls.length === 0 ? (
                <p className="text-muted-foreground">No boss pulls in this report.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {result.pulls.map((pull) => (
                    <li key={pull.fightId}>
                      {pull.inVod ? (
                        <button
                          type="button"
                          onClick={() => onPull(pull)}
                          aria-current={activeId === pull.fightId ? "true" : undefined}
                          className={`grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3 px-2 py-2 text-left text-xs hover:bg-muted ${
                            activeId === pull.fightId ? "bg-accent text-accent-foreground" : ""
                          }`}
                        >
                          <PullBody pull={pull} />
                        </button>
                      ) : (
                        <div className="grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3 px-2 py-2 text-xs text-muted-foreground">
                          <PullBody pull={pull} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}

function PullBody({ pull }: { pull: Pull }) {
  return (
    <>
      <span className={pull.kill ? "text-primary" : "text-muted-foreground"}>
        {pull.kill ? "Kill" : "Wipe"}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{pull.bossName}</span>
        <span className="text-muted-foreground">Pull {pull.pullNumber}</span>
      </span>
      <span className="text-right tabular-nums">
        <span className="block">{formatClock(pull.durationMs / 1000)}</span>
        <span>{pull.inVod ? formatClock(pull.vodSeconds) : "not in VOD"}</span>
      </span>
    </>
  );
}
