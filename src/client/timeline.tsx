import { useEffect, useState } from "react";

import {
  nightWindow,
  pullEndVideoSeconds,
  pullInSource,
  pullToVideoSeconds,
  type VideoSource,
} from "../source";
import type { Pull } from "../types";
import { Button } from "./components/ui/button";
import { formatClock } from "./format";
import type { PlayerController } from "./player";

export type TimelineMode = "night" | "pull";

function usePlayhead(player: PlayerController | null): number {
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

function percent(value: number, start: number, end: number): number {
  return ((value - start) / (end - start)) * 100;
}

export function Timeline({
  mode,
  onMode,
  source,
  pulls,
  activeId,
  player,
  onSelect,
}: {
  mode: TimelineMode;
  onMode: (mode: TimelineMode) => void;
  source: VideoSource;
  pulls: Pull[];
  activeId: number | null;
  player: PlayerController | null;
  onSelect: (pull: Pull) => void;
}) {
  const playhead = usePlayhead(player);
  const active = pulls.find((pull) => pull.fightId === activeId) ?? null;

  function seek(seconds: number) {
    if (seconds < 0 || seconds > source.duration) return;
    player?.seekTo(seconds);
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="flex items-center gap-2 px-3 pt-2">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "night" ? "secondary" : "ghost"}
            aria-pressed={mode === "night"}
            onClick={() => onMode("night")}
          >
            Night
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "pull" ? "secondary" : "ghost"}
            aria-pressed={mode === "pull"}
            onClick={() => onMode("pull")}
          >
            Pull
          </Button>
        </div>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
          {formatClock(playhead)}
        </span>
      </div>
      <div className="px-3 pt-2 pb-2">
        {mode === "night" ? (
          <NightTrack
            source={source}
            pulls={pulls}
            activeId={activeId}
            playhead={playhead}
            onSeek={seek}
            onSelect={onSelect}
          />
        ) : (
          <PullTrack source={source} pull={active} playhead={playhead} onSeek={seek} />
        )}
      </div>
    </footer>
  );
}

function NightTrack({
  source,
  pulls,
  activeId,
  playhead,
  onSeek,
  onSelect,
}: {
  source: VideoSource;
  pulls: Pull[];
  activeId: number | null;
  playhead: number;
  onSeek: (seconds: number) => void;
  onSelect: (pull: Pull) => void;
}) {
  const domain = nightWindow(source, pulls);
  const bandLeft = percent(0, domain.start, domain.end);
  const bandWidth = percent(source.duration, domain.start, domain.end) - bandLeft;

  return (
    <>
      <div
        aria-label="Night timeline"
        className="relative h-11 cursor-pointer overflow-hidden bg-muted/40"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();

          if (rect.width <= 0) return;
          const ratio = (event.clientX - rect.left) / rect.width;
          onSeek(domain.start + ratio * (domain.end - domain.start));
        }}
      >
        <div
          className="absolute inset-y-0 bg-background/70"
          style={{ left: `${bandLeft}%`, width: `${Math.max(bandWidth, 0)}%` }}
        />
        {pulls.map((pull) => {
          const start = pullToVideoSeconds(pull, source);
          const end = Math.max(pullEndVideoSeconds(pull, source), start);
          const inVod = pullInSource(pull, source);
          const left = percent(start, domain.start, domain.end);
          const width = Math.max(percent(end, domain.start, domain.end) - left, 0.55);
          const selected = pull.fightId === activeId;

          return (
            <button
              key={pull.fightId}
              type="button"
              title={
                inVod
                  ? `${pull.bossName} #${pull.pullNumber}`
                  : `${pull.bossName} #${pull.pullNumber}, not in VOD`
              }
              aria-label={
                inVod
                  ? `${pull.bossName} pull ${pull.pullNumber}`
                  : `${pull.bossName} pull ${pull.pullNumber}, not in VOD`
              }
              aria-pressed={selected}
              className={`absolute top-1.5 bottom-1.5 border-0 p-0 ${
                inVod
                  ? pull.kill
                    ? "bg-primary"
                    : "bg-foreground/35"
                  : "cursor-default bg-foreground/10"
              } ${selected ? "outline outline-1 outline-foreground" : ""}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(pull);
              }}
            />
          );
        })}
        <Playhead at={percent(playhead, domain.start, domain.end)} />
      </div>
      <Scale from={domain.start} to={domain.end} />
    </>
  );
}

function PullTrack({
  source,
  pull,
  playhead,
  onSeek,
}: {
  source: VideoSource;
  pull: Pull | null;
  playhead: number;
  onSeek: (seconds: number) => void;
}) {
  if (!pull) {
    return <p className="py-4 text-xs text-muted-foreground">Select a pull to zoom the timeline.</p>;
  }

  const start = pullToVideoSeconds(pull, source);
  const end = Math.max(pullEndVideoSeconds(pull, source), start + 0.001);
  const inVod = pullInSource(pull, source);
  const ratio = (playhead - start) / (end - start);

  return (
    <>
      <div
        aria-label="Pull timeline"
        className={`relative h-11 ${inVod ? "cursor-pointer" : "cursor-default"} ${
          inVod ? (pull.kill ? "bg-primary/80" : "bg-foreground/25") : "bg-foreground/10"
        }`}
        onClick={(event) => {
          if (!inVod) return;
          const rect = event.currentTarget.getBoundingClientRect();

          if (rect.width <= 0) return;
          const next = (event.clientX - rect.left) / rect.width;
          onSeek(start + next * (end - start));
        }}
      >
        <Playhead at={Math.min(100, Math.max(0, ratio * 100))} />
      </div>
      <Scale from={start} to={end} />
    </>
  );
}

function Playhead({ at }: { at: number }) {
  const left = Math.min(100, Math.max(0, at));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white"
      style={{ left: `clamp(0px, ${left}%, calc(100% - 2px))` }}
    />
  );
}

function Scale({ from, to }: { from: number; to: number }) {
  return (
    <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
      <span>{formatClock(from)}</span>
      <span>{formatClock(to)}</span>
    </div>
  );
}
