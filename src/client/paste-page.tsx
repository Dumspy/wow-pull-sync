import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { parseReportCode, parseVodLink } from "../urls";
import { Button } from "./components/ui/button";
import { AppBrand, AppHeader } from "./components/app-header";
import { PageHeader } from "./components/page-header";
import { Card, CardContent } from "./components/ui/card";
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
  const [reportUrl, setReportUrl] = useState(import.meta.env.VITE_PREFILL_REPORT_URL?.trim() ?? "");
  const [vodUrl, setVodUrl] = useState(import.meta.env.VITE_PREFILL_VOD_URL?.trim() ?? "");
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

    const vod = parseVodLink(vodUrl);

    if (!vod) {
      setError("That doesn't look like a YouTube or Twitch video link.");

      return;
    }

    // The offset goes into the link, so switching VODs or sharing the raid keeps it.
    const search: RaidSearch = {
      vods: [offsetSeconds === 0 ? vod : { ...vod, offset: offsetSeconds }],
    };

    if (devFakePlayer()) search.player = "fake";

    void navigate({
      to: "/raid/$reportCode",
      params: { reportCode },
      search,
      state: { offsetText },
    });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <AppBrand />
      </AppHeader>
      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-5">
          <PageHeader
            title="Sync a raid night"
            subtitle="Paste a Warcraft Logs report and the YouTube or Twitch VOD from that night."
          />
          <Card variant="panel">
            <CardContent>
              <form className="grid gap-4" onSubmit={onSubmit}>
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
                  <Label htmlFor="vod-url">YouTube or Twitch VOD</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Shifts every timestamp, for stream delay or a trimmed VOD.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="lg">
                    Load pulls
                  </Button>
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
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-destructive-text"
            >
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
