import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Pull, PullSyncResponse } from "../types";
import { track } from "./analytics";
import { AppBrand, AppHeader } from "./components/app-header";
import { BossSection } from "./components/boss-section";
import { PullHpChart } from "./components/pull-hp-chart";
import { PullRow } from "./components/pull-row";
import { StatStrip, StatTile } from "./components/stat-strip";
import { buttonVariants } from "./components/ui/button";
import { formatClock } from "./format";
import { formatSpan, hpLeft, summarizeBosses, type BossSummary } from "./pull-view";
import { searchForPull, type RaidViewSearch } from "./raid-search";

function videoSource(data: PullSyncResponse, offset: number): VideoSource {
  return {
    kind: "youtube",
    id: data.videoId,
    startedAt: data.vodStartedAtMs,
    duration: data.vodDurationSeconds,
    offset,
  };
}

/** Review-page search for a pull, so a link lands on it with the video seeked. */
function reviewSearch(search: RaidViewSearch, pull: Pull, source: VideoSource) {
  const seconds = pullInSource(pull, source) ? Math.round(pullToVideoSeconds(pull, source)) : null;

  return searchForPull(search, pull.fightId, seconds);
}

function ViewHeader({
  data,
  search,
  title,
  children,
}: {
  data: PullSyncResponse;
  search: RaidViewSearch;
  title: string;
  children?: ReactNode;
}) {
  return (
    <AppHeader>
      <AppBrand />
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-[13px] font-semibold">{title}</h1>
        <span className="truncate text-xs text-muted-foreground">{data.reportTitle}</span>
      </div>
      <span className="flex-1" />
      {children}
      <Link
        to="/raid/$reportCode"
        params={{ reportCode: data.reportCode }}
        search={search}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Review
      </Link>
    </AppHeader>
  );
}

function bossStats(boss: BossSummary): string {
  const best = boss.kills === 0 && boss.bestWipeHp != null ? ` · best ${boss.bestWipeHp}%` : "";

  return `${boss.kills} kill · ${boss.wipes} wipes · ${formatSpan(boss.timeMs)}${best}`;
}

function PullRows({
  pulls,
  data,
  search,
  source,
}: {
  pulls: Pull[];
  data: PullSyncResponse;
  search: RaidViewSearch;
  source: VideoSource;
}) {
  return pulls.map((pull) => (
    <PullRow
      key={pull.fightId}
      n={pull.pullNumber}
      kill={pull.kill}
      hp={hpLeft(pull)}
      duration={formatClock(pull.durationMs / 1000)}
      start={pullInSource(pull, source) ? formatClock(pullToVideoSeconds(pull, source)) : "no VOD"}
      render={
        <Link
          to="/raid/$reportCode"
          params={{ reportCode: data.reportCode }}
          search={reviewSearch(search, pull, source)}
          onClick={() => track("pull clicked", { encounter_id: pull.encounterId, kill: pull.kill })}
        />
      }
    />
  ));
}

export function OverviewPage({ data, search }: { data: PullSyncResponse; search: RaidViewSearch }) {
  const source = videoSource(data, search.offset ?? 0);
  const bosses = summarizeBosses(data.pulls);
  const kills = data.pulls.filter((pull) => pull.kill).length;
  const totalMs = data.pulls.reduce((sum, pull) => sum + pull.durationMs, 0);

  useEffect(() => {
    track("overview opened");
  }, []);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ViewHeader data={data} search={search} title="Raid overview" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <StatStrip>
          <StatTile label="Bosses" value={bosses.length} />
          <StatTile label="Pulls" value={data.pulls.length} />
          <StatTile label="Kills" value={kills} valueClassName="text-success" />
          <StatTile label="Wipes" value={data.pulls.length - kills} />
          <StatTile label="Time in pulls" value={formatSpan(totalMs)} />
        </StatStrip>
        {bosses.length === 0 ? (
          <p className="text-muted-foreground">No boss pulls in this report.</p>
        ) : null}
        {bosses.map((boss) => (
          <BossSection
            key={boss.encounterId}
            name={boss.name}
            stats={bossStats(boss)}
            action={
              <Link
                to="/raid/$reportCode/boss/$encounterId"
                params={{ reportCode: data.reportCode, encounterId: boss.encounterId }}
                search={search}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Progress
              </Link>
            }
          >
            <PullRows pulls={boss.pulls} data={data} search={search} source={source} />
          </BossSection>
        ))}
      </main>
    </div>
  );
}

export function BossProgressPage({
  data,
  search,
  encounterId,
}: {
  data: PullSyncResponse;
  search: RaidViewSearch;
  encounterId: number;
}) {
  const source = videoSource(data, search.offset ?? 0);
  const bosses = summarizeBosses(data.pulls);
  const boss = bosses.find((item) => item.encounterId === encounterId);

  useEffect(() => {
    if (boss) track("boss progress opened", { encounter_id: boss.encounterId });
  }, [boss]);

  if (!boss) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <ViewHeader data={data} search={search} title="Boss progress" />
        <main className="mx-auto w-full max-w-4xl p-4 text-muted-foreground">
          That boss wasn't pulled in this report.
        </main>
      </div>
    );
  }

  const hpPulls = boss.pulls.map((pull) => ({
    n: pull.pullNumber,
    hp: hpLeft(pull),
    kill: pull.kill,
  }));

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ViewHeader data={data} search={search} title={`${boss.name} progress`}>
        {bosses.length > 1 ? (
          <nav className="flex flex-wrap gap-1" aria-label="Bosses">
            {bosses.map((item) => (
              <Link
                key={item.encounterId}
                to="/raid/$reportCode/boss/$encounterId"
                params={{ reportCode: data.reportCode, encounterId: item.encounterId }}
                search={search}
                className={buttonVariants({
                  variant: item.encounterId === boss.encounterId ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <Link
          to="/raid/$reportCode/overview"
          params={{ reportCode: data.reportCode }}
          search={search}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Overview
        </Link>
      </ViewHeader>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <StatStrip>
          <StatTile label="Pulls" value={boss.pulls.length} />
          <StatTile label="Kills" value={boss.kills} valueClassName="text-success" />
          <StatTile label="Wipes" value={boss.wipes} />
          <StatTile
            label="Best wipe"
            value={boss.bestWipeHp == null ? "–" : `${boss.bestWipeHp}%`}
          />
          <StatTile label="Time" value={formatSpan(boss.timeMs)} />
        </StatStrip>
        <div className="rounded-lg border bg-card p-4">
          <PullHpChart
            pulls={hpPulls}
            best={boss.kills === 0 ? (boss.bestWipeHp ?? undefined) : undefined}
          />
        </div>
        <BossSection name={boss.name} stats={bossStats(boss)}>
          <PullRows pulls={boss.pulls} data={data} search={search} source={source} />
        </BossSection>
      </main>
    </div>
  );
}
