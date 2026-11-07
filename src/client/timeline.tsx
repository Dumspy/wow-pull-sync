import { useEffect, useState } from "react";

import { pullEndVideoSeconds, pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { EncounterPhases, Lane as LaneConfig, Player, Pull } from "../types";
import { FilterChip } from "./components/filter-chip";
import { Lane, LaneMark, LaneSegment, Playhead, TimeAxis } from "./components/lane";
import { NightTimeline, type TimelinePull } from "./components/night-timeline";
import { formatClock, formatPercent } from "./format";
import type { PlayerController } from "./player";

export function usePlayhead(player: PlayerController | null): number {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!player) return;
    let raf = 0;
    let last = Number.NaN;

    const tick = () => {
      const next = player.getCurrentTime();

      if (!Number.isFinite(last) || Math.abs(next - last) >= 0.05) {
        last = next;
        setTime(next);
      }

      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(raf);
  }, [player]);

  return time;
}

/** Event lane swatches, cycled in config order. */
const LANE_TONES = [
  { tone: "warning", swatch: "bg-warning" },
  { tone: "success", swatch: "bg-success" },
  { tone: "info", swatch: "bg-ring" },
] as const;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function Timeline({
  source,
  pulls,
  activeId,
  playhead,
  players,
  encounterPhases,
  lanes,
  onSeek,
  onSelect,
}: {
  source: VideoSource;
  pulls: Pull[];
  activeId: number | null;
  playhead: number;
  players: Player[];
  encounterPhases: EncounterPhases[];
  lanes: LaneConfig[];
  onSeek: (seconds: number) => void;
  onSelect: (pull: Pull) => void;
}) {
  const active = pulls.find((pull) => pull.fightId === activeId) ?? null;
  const byFight = new Map<number, Pull>();

  const nightPulls: TimelinePull[] = [];

  for (const pull of pulls) {
    if (!pullInSource(pull, source)) continue;
    byFight.set(pull.fightId, pull);
    const start = pullToVideoSeconds(pull, source);

    nightPulls.push({
      id: pull.fightId,
      start,
      end: Math.min(source.duration, Math.max(pullEndVideoSeconds(pull, source), start)),
      kill: pull.kill,
      label: `${pull.bossName} #${pull.pullNumber} · ${pull.kill ? "Kill" : pull.bossPercentage == null ? "Wipe" : formatPercent(pull.bossPercentage)}`,
    });
  }

  return (
    <footer className="flex flex-col gap-3 border-t bg-card px-4 py-3">
      <div className="relative">
        <NightTimeline
          duration={source.duration}
          pulls={nightPulls}
          onSelect={(id) => {
            const pull = byFight.get(id);

            if (pull) onSelect(pull);
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-7">
          <Playhead at={clampPercent((playhead / source.duration) * 100)} />
        </div>
      </div>
      {active ? (
        <PullLanes
          source={source}
          pull={active}
          playhead={playhead}
          players={players}
          phases={encounterPhases.find((item) => item.encounterId === active.encounterId)}
          lanes={lanes.filter((lane) => lane.encounterId === active.encounterId)}
          onSeek={onSeek}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Select a pull to see its events.</p>
      )}
    </footer>
  );
}

function PullLanes({
  source,
  pull,
  playhead,
  players,
  phases,
  lanes,
  onSeek,
}: {
  source: VideoSource;
  pull: Pull;
  playhead: number;
  players: Player[];
  phases: EncounterPhases | undefined;
  lanes: LaneConfig[];
  onSeek: (seconds: number) => void;
}) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const start = pullToVideoSeconds(pull, source);
  const inVod = pullInSource(pull, source);
  const duration = Math.max(pull.durationMs, 1);
  const at = (ms: number) => clampPercent((ms / duration) * 100);
  const playheadAt = at((playhead - start) * 1000);
  const starts = pull.phaseStarts.slice().sort((a, b) => a.atMs - b.atMs);

  function seekFromClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!inVod) return;
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) return;
    onSeek(start + ((event.clientX - rect.left) / rect.width) * (duration / 1000));
  }

  function toggle(id: string) {
    setHidden((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  const result = pull.kill
    ? "Kill"
    : pull.bossPercentage == null
      ? "Wipe"
      : `Wipe · ${formatPercent(pull.bossPercentage)}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[13px]">
          <span className="font-semibold">Pull #{pull.pullNumber}</span>{" "}
          <span className="font-mono text-xs text-muted-foreground">
            · {result} · {formatClock(pull.durationMs / 1000)}
          </span>
        </span>
        <span className="flex-1" />
        {lanes.length > 0 ? (
          <>
            <span className="text-xs text-muted-foreground">Show events</span>
            {lanes.map((lane, index) => (
              <FilterChip
                key={lane.id}
                label={lane.label}
                swatchClassName={LANE_TONES[index % LANE_TONES.length].swatch}
                on={!hidden.has(lane.id)}
                onClick={() => toggle(lane.id)}
              />
            ))}
          </>
        ) : null}
      </div>
      <TimeAxis
        ticks={[
          { at: 0, label: formatClock(0) },
          { at: 50, label: formatClock(duration / 2000) },
          { at: 95, label: formatClock(duration / 1000) },
        ]}
      />
      {starts.length > 0 ? (
        <Lane
          label="Phases"
          className="h-5.5 cursor-pointer overflow-hidden"
          onClick={seekFromClick}
        >
          {starts.map((item, index) => (
            <LaneSegment
              key={`${item.phaseId}:${item.atMs}`}
              from={at(item.atMs)}
              to={at(starts[index + 1]?.atMs ?? duration)}
            >
              {phases?.phases.find((phase) => phase.id === item.phaseId)?.name ??
                `Phase ${item.phaseId}`}
            </LaneSegment>
          ))}
          <Playhead at={playheadAt} />
        </Lane>
      ) : null}
      <Lane
        label={
          <>
            Deaths <span className="font-mono text-destructive-text">{pull.deaths.length}</span>
          </>
        }
        className="h-10 cursor-pointer"
        onClick={seekFromClick}
      >
        {pull.deaths.map((death) => (
          <LaneMark
            key={`${death.playerId}:${death.atMs}`}
            tone="destructive"
            from={at(death.atMs)}
            title={`${players.find((player) => player.id === death.playerId)?.name ?? "Unknown"} · ${formatClock(death.atMs / 1000)}`}
            className="inset-y-0 w-0.5"
          />
        ))}
        <Playhead at={playheadAt} />
      </Lane>
      {lanes
        .filter((lane) => !hidden.has(lane.id))
        .map((lane) => {
          const tone = LANE_TONES[lanes.indexOf(lane) % LANE_TONES.length].tone;
          const events = pull.lanes.find((item) => item.laneId === lane.id)?.events ?? [];

          return (
            <Lane
              key={lane.id}
              label={lane.label}
              className="cursor-pointer"
              onClick={seekFromClick}
            >
              {events.map((event) => (
                <LaneMark
                  key={`${event.spellId}:${event.atMs}`}
                  tone={tone}
                  from={at(event.atMs)}
                  title={`${event.spellId} · ${formatClock(event.atMs / 1000)}`}
                  className="w-1"
                />
              ))}
              <Playhead at={playheadAt} />
            </Lane>
          );
        })}
    </div>
  );
}
