import { useEffect, useState } from "react";

import { pullInSource, pullToVideoSeconds, type VideoSource } from "../source";
import type { Ability, EncounterPhases, Player, Pull } from "../types";
import { FilterChip } from "./components/filter-chip";
import { Lane, LaneMark, LaneSegment, Playhead, TimeAxis } from "./components/lane";
import { Input } from "./components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Button } from "./components/ui/button";
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

/** Event lane colours, cycled in the order spells were added. */
const LANE_TONES = [
  { tone: "warning", swatch: "bg-warning" },
  { tone: "info", swatch: "bg-ring" },
  { tone: "violet", swatch: "bg-class-warlock" },
  { tone: "success", swatch: "bg-success" },
] as const;

/** Phase block colours, cycled; intermissions stay neutral. */
const PHASE_FILLS = ["bg-ring", "bg-warning", "bg-class-warlock", "bg-success"] as const;

/** Diamond marker for a single event, centred on its time. */
const DIAMOND = "inset-y-auto top-1/2 size-2 min-w-0 -translate-x-1/2 -translate-y-1/2 rotate-45";

/** Widens the click target of a thin event mark. */
const EVENT_HIT =
  "cursor-pointer before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-['']";

const DEATH_LABEL_ROWS = [4, 24, 44] as const;
const MONO_CHAR_PX = 6.6;

function useElementWidth() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));

    observer.observe(element);
    setWidth(element.clientWidth);

    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, width };
}

interface PhaseBlock {
  key: string;
  from: number;
  to: number;
  name: string;
  intermission: boolean;
  stage: number;
}

interface DeathLabel {
  key: string;
  at: number;
  atMs: number;
  text: string;
  top: number | null;
  flip: boolean;
}

/** Puts each death's label in the first free row; labels that would collide stay unlabelled. */
function layoutDeathLabels(
  deaths: readonly { key: string; at: number; atMs: number; text: string }[],
  trackWidth: number,
): DeathLabel[] {
  const rowEnds = DEATH_LABEL_ROWS.map(() => Number.NEGATIVE_INFINITY);

  return deaths.map((death) => {
    const x = (death.at / 100) * trackWidth;
    const width = death.text.length * MONO_CHAR_PX + 4;
    const flip = x + width + 6 > trackWidth;
    const from = flip ? x - width - 6 : x + 6;
    const row = rowEnds.findIndex((end) => from >= end + 4);

    if (row < 0) return { ...death, top: null, flip };
    rowEnds[row] = from + width;

    return { ...death, top: DEATH_LABEL_ROWS[row] ?? null, flip };
  });
}

/** "P1", "P2" for stages, "Int" for intermissions. The full name stays in the tooltip. */
function phaseLabel(isIntermission: boolean, stageNumber: number): string {
  return isIntermission ? "Int" : `P${stageNumber}`;
}

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
  abilities,
  spells,
  onSpellsChange,
  onSeek,
}: {
  source: VideoSource;
  pulls: Pull[];
  activeId: number | null;
  playhead: number;
  players: Player[];
  encounterPhases: EncounterPhases[];
  abilities: Ability[];
  spells: number[];
  onSpellsChange: (spells: number[]) => void;
  onSeek: (seconds: number) => void;
}) {
  const active = pulls.find((pull) => pull.fightId === activeId) ?? null;

  return (
    <footer className="flex flex-col gap-3 border-t bg-card px-4 py-3">
      {active ? (
        <PullLanes
          source={source}
          pull={active}
          playhead={playhead}
          players={players}
          phases={encounterPhases.find((item) => item.encounterId === active.encounterId)}
          catalog={spellCatalog(
            pulls.filter((pull) => pull.encounterId === active.encounterId),
            abilities,
          )}
          spells={spells}
          onSpellsChange={onSpellsChange}
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
  catalog,
  spells,
  onSpellsChange,
  onSeek,
}: {
  source: VideoSource;
  pull: Pull;
  playhead: number;
  players: Player[];
  phases: EncounterPhases | undefined;
  catalog: CatalogSpell[];
  spells: number[];
  onSpellsChange: (spells: number[]) => void;
  onSeek: (seconds: number) => void;
}) {
  const shown = spells.filter((id) => catalog.some((spell) => spell.id === id));
  const start = pullToVideoSeconds(pull, source);
  const inVod = pullInSource(pull, source);
  const duration = Math.max(pull.durationMs, 1);
  const at = (ms: number) => clampPercent((ms / duration) * 100);
  const playheadAt = at((playhead - start) * 1000);
  const starts = pull.phaseStarts.slice().sort((a, b) => a.atMs - b.atMs);
  const blocks: PhaseBlock[] = [];
  let stage = 0;

  for (const [index, item] of starts.entries()) {
    const phase = phases?.phases.find((entry) => entry.id === item.phaseId);
    const intermission = phase?.isIntermission ?? false;

    if (!intermission) stage += 1;

    blocks.push({
      key: `${item.phaseId}:${item.atMs}`,
      from: at(item.atMs),
      to: at(starts[index + 1]?.atMs ?? duration),
      name: phase?.name ?? `Phase ${item.phaseId}`,
      intermission,
      stage,
    });
  }

  const deathTrack = useElementWidth();

  const deathLabels = layoutDeathLabels(
    pull.deaths
      .slice()
      .sort((a, b) => a.atMs - b.atMs)
      .map((death) => ({
        key: `${death.playerId}:${death.atMs}`,
        at: at(death.atMs),
        atMs: death.atMs,
        text: `${players.find((player) => player.id === death.playerId)?.name ?? "Unknown"} ${formatClock(death.atMs / 1000)}`,
      })),
    deathTrack.width,
  );

  function seekToEvent(event: React.MouseEvent, atMs: number) {
    event.stopPropagation();

    if (inVod) onSeek(start + atMs / 1000);
  }

  function seekFromClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!inVod) return;
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) return;
    onSeek(start + ((event.clientX - rect.left) / rect.width) * (duration / 1000));
  }

  function toggle(id: number) {
    onSpellsChange(spells.includes(id) ? spells.filter((item) => item !== id) : [...spells, id]);
  }

  const result = pull.kill
    ? "Kill"
    : pull.bossPercentage == null
      ? "Wipe"
      : `Wipe · boss at ${formatPercent(pull.bossPercentage)}`;

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
        {shown.map((id, index) => (
          <FilterChip
            key={id}
            label={catalog.find((spell) => spell.id === id)?.name ?? String(id)}
            swatchClassName={LANE_TONES[index % LANE_TONES.length].swatch}
            on
            onClick={() => toggle(id)}
            title="Remove from the timeline"
          />
        ))}
        {catalog.length > 0 ? (
          <SpellPicker catalog={catalog} selected={spells} onToggle={toggle} />
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
          {blocks.map((block) => (
            <LaneSegment
              key={block.key}
              from={block.from}
              to={block.to}
              title={block.name}
              className={
                block.intermission
                  ? "bg-border-strong"
                  : `${PHASE_FILLS[(block.stage - 1) % PHASE_FILLS.length]} font-medium text-background`
              }
            >
              {phaseLabel(block.intermission, block.stage)}
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
        className="h-16 cursor-pointer"
        ref={deathTrack.ref}
        onClick={seekFromClick}
      >
        {deathLabels.map((death) => (
          <span key={death.key}>
            <LaneMark
              tone="destructive"
              from={death.at}
              title={death.text}
              className={`inset-y-0 w-0.5 ${EVENT_HIT}`}
              onClick={(event) => seekToEvent(event, death.atMs)}
            />
            {death.top == null ? null : (
              <span
                className="pointer-events-none absolute font-mono text-[11px] whitespace-nowrap text-destructive-text"
                style={{
                  top: death.top,
                  ...(death.flip
                    ? { right: `calc(${100 - death.at}% + 6px)` }
                    : { left: `calc(${death.at}% + 6px)` }),
                }}
              >
                {death.text}
              </span>
            )}
          </span>
        ))}
        <Playhead at={playheadAt} />
      </Lane>
      {shown.map((id, index) => {
        const name = catalog.find((spell) => spell.id === id)?.name ?? String(id);
        const tone = LANE_TONES[index % LANE_TONES.length].tone;

        return (
          <Lane key={id} label={name} className="cursor-pointer" onClick={seekFromClick}>
            {pull.casts
              .filter((cast) => cast.spellId === id)
              .map((cast) => (
                <LaneMark
                  key={cast.atMs}
                  tone={tone}
                  from={at(cast.atMs)}
                  title={`${name} · ${formatClock(cast.atMs / 1000)}`}
                  className={`${DIAMOND} ${EVENT_HIT}`}
                  onClick={(click) => seekToEvent(click, cast.atMs)}
                />
              ))}
            <Playhead at={playheadAt} />
          </Lane>
        );
      })}
    </div>
  );
}

interface CatalogSpell {
  id: number;
  name: string;
  /** Casts across the encounter's pulls. */
  count: number;
}

/** Every enemy spell cast in the given pulls, most-cast first. */
function spellCatalog(pulls: Pull[], abilities: Ability[]): CatalogSpell[] {
  const counts = new Map<number, number>();

  for (const pull of pulls) {
    for (const cast of pull.casts) counts.set(cast.spellId, (counts.get(cast.spellId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      count,
      name: abilities.find((ability) => ability.id === id)?.name ?? `Spell ${id}`,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function SpellPicker({
  catalog,
  selected,
  onToggle,
}: {
  catalog: CatalogSpell[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const matches = catalog.filter(
    (spell) =>
      needle === "" ||
      spell.name.toLowerCase().includes(needle) ||
      String(spell.id).includes(needle),
  );

  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" size="sm" variant="outline" />}>
        Add events
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-2 p-2">
        <Input
          aria-label="Search spells"
          placeholder="Search boss spells"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-64 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No spells match.</p>
          ) : null}
          {matches.map((spell) => (
            <button
              key={spell.id}
              type="button"
              aria-pressed={selected.includes(spell.id)}
              onClick={() => onToggle(spell.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent aria-pressed:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate">{spell.name}</span>
              <span className="font-mono text-muted-foreground tabular-nums">{spell.count}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
