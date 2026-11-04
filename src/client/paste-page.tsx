import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { parseReportCode, parseVideoId } from "../urls";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { devFakePlayer } from "./player";
import type { RaidSearch } from "./raid-search";

const REPORT = "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9";
const VOD = "https://youtube.com/live/BLJBhzLNt8w";

export function PastePage() {
  const navigate = useNavigate();
  const router = useRouter();

  const returnToRaid = useRouterState({
    select: (state) => state.location.state.returnToRaid === true,
  });

  const storedOffset = useRouterState({ select: (state) => state.location.state.offsetText });
  const [reportUrl, setReportUrl] = useState("");
  const [vodUrl, setVodUrl] = useState("");
  const [offsetText, setOffsetText] = useState(storedOffset ?? "0");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const offsetSeconds = offsetText.trim() === "" ? 0 : Number(offsetText);

    if (!Number.isFinite(offsetSeconds)) {
      setError("Offset must be a number of seconds.");

      return;
    }

    const reportCode = parseReportCode(reportUrl);

    if (!reportCode) {
      setError("That doesn't look like a Warcraft Logs report URL.");

      return;
    }

    const videoId = parseVideoId(vodUrl);

    if (!videoId) {
      setError("That doesn't look like a YouTube URL.");

      return;
    }

    const search: RaidSearch = { vod: videoId };

    if (devFakePlayer()) search.player = "fake";

    void navigate({
      to: "/raid/$reportCode",
      params: { reportCode },
      search,
      state: { offsetText },
    });
  }

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
                <Button type="submit">Load pulls</Button>
                {returnToRaid ? (
                  <Button type="button" variant="ghost" onClick={() => router.history.back()}>
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
