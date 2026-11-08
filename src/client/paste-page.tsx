import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { parseReportCode } from "../urls";
import { Button } from "./components/ui/button";
import { AppBrand, AppHeader } from "./components/app-header";
import { PageHeader } from "./components/page-header";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { devFakePlayer } from "./player";
import type { AddVodSearch } from "./raid-search";

const REPORT = "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9";

export function PastePage() {
  const navigate = useNavigate();
  const router = useRouter();

  const returnToRaid = useRouterState({
    select: (state) => state.location.state.returnToRaid === true,
  });

  const [reportUrl, setReportUrl] = useState(import.meta.env.VITE_PREFILL_REPORT_URL?.trim() ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const reportCode = parseReportCode(reportUrl);

    if (!reportCode) {
      setError("That doesn't look like a Warcraft Logs report URL.");

      return;
    }

    // The log loads first. The first VOD is added once its players are known, so the
    // recorder can be picked from them.
    const search: AddVodSearch = { vods: [] };

    if (devFakePlayer()) search.player = "fake";

    void navigate({ to: "/raid/$reportCode/add-vod", params: { reportCode }, search });
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
            subtitle="Paste the Warcraft Logs report from that night. You add the YouTube or Twitch VODs next."
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
                <div className="flex items-center gap-2">
                  <Button type="submit" size="lg">
                    Load the log
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
