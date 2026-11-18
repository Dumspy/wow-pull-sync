import { useEffect, useState, type ReactNode } from "react";

import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { formatClock } from "./format";
import { cn } from "./lib/utils";
import type { PlayerController } from "./player";

export interface PlayerStatus {
  time: number;
  playing: boolean;
  muted: boolean;
  volume: number;
}

/** Polls the controller each frame; re-renders only when something visible changed. */
export function usePlayerStatus(player: PlayerController | null): PlayerStatus | null {
  const [status, setStatus] = useState<PlayerStatus | null>(null);

  useEffect(() => {
    if (!player) {
      setStatus(null);

      return;
    }

    let raf = 0;
    let last: PlayerStatus | null = null;

    const tick = () => {
      const next: PlayerStatus = {
        time: player.getCurrentTime(),
        playing: player.isPlaying(),
        muted: player.isMuted(),
        volume: player.getVolume(),
      };

      const changed =
        !last ||
        Math.abs(next.time - last.time) >= 0.25 ||
        next.playing !== last.playing ||
        next.muted !== last.muted ||
        next.volume !== last.volume;

      if (changed) {
        last = next;
        setStatus(next);
      }

      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(raf);
  }, [player]);

  return status;
}

export function useFullscreen(target: HTMLElement | null): [boolean, () => void] {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setFullscreen(target != null && document.fullscreenElement === target);
    document.addEventListener("fullscreenchange", update);

    return () => document.removeEventListener("fullscreenchange", update);
  }, [target]);

  const toggle = () => {
    if (!target) return;

    if (document.fullscreenElement === target) void document.exitFullscreen();
    else void target.requestFullscreen();
  };

  return [fullscreen, toggle];
}

/** Mute follows the slider: dragging to zero mutes, unmuting from zero restores full volume. */
function volumeHandlers(player: PlayerController, status: PlayerStatus) {
  return {
    muted: status.muted || status.volume === 0,
    volume: status.volume,
    onToggleMute: () => {
      player.setMuted(!status.muted);

      if (status.muted && status.volume === 0) player.setVolume(1);
    },
    onVolume: (next: number) => {
      player.setVolume(next);
      player.setMuted(next === 0);
    },
  };
}

/**
 * A YouTube or Twitch embed with our controls under it, so both play the same way.
 * Nothing may sit on a Twitch embed: Twitch pauses a covered player and then ignores play().
 * So the bar sits below the video, and only other embeds get a layer that takes clicks.
 * The raid page draws one bar for all its panes, so there `bar` is off and clicks go to the page.
 */
export function PlayerFrame({
  player,
  duration,
  coverable,
  crop,
  bar,
  onClick,
  onDoubleClick,
  children,
}: {
  player: PlayerController | null;
  duration: number;
  /** False for Twitch: nothing may cover it, so clicks on it go to the embed itself. */
  coverable: boolean;
  /**
   * Pixels of letterbox to add above and below the video, then clip. YouTube draws its title,
   * logo and buttons at the frame's edges, so they land in the clipped bands. Twitch must be 0:
   * it won't play while any of it is clipped, so it fills the pane and hides its UI by option.
   */
  crop: number;
  bar: boolean;
  /** Replaces play/pause on a click on the video. */
  onClick?: () => void;
  /** Replaces full screen on a double click on the video. */
  onDoubleClick?: () => void;
  children: ReactNode;
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const status = usePlayerStatus(player);
  const [fullscreen, toggleFullscreen] = useFullscreen(root);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const box = useVideoBox(stage);

  const togglePlay = () => {
    if (!player || !status) return;

    if (status.playing) player.pause();
    else player.play();
  };

  const seek = (seconds: number) => {
    if (!player || !status) return;
    player.seekTo(seconds);

    // seekTo also plays; a paused video stays paused at the new spot.
    if (!status.playing) player.pause();
  };

  return (
    <div ref={setRoot} className="flex h-full w-full flex-col bg-black">
      <div ref={setStage} className="relative min-h-0 flex-1">
        <div
          className="absolute overflow-hidden"
          style={
            box && crop > 0
              ? { left: box.left, top: box.top, width: box.width, height: box.height }
              : { inset: 0 }
          }
        >
          <div
            className="absolute inset-x-0 [&_iframe]:h-full [&_iframe]:w-full"
            style={{ top: -crop, bottom: -crop }}
          >
            {children}
          </div>
          {coverable && status ? (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              onClick={onClick ?? togglePlay}
              onDoubleClick={onDoubleClick ?? toggleFullscreen}
            />
          ) : null}
        </div>
      </div>
      {bar && player && status ? (
        <ControlBar
          className="shrink-0 border-t bg-card pt-1"
          time={status.time}
          duration={duration}
          playing={status.playing}
          sound={volumeHandlers(player, status)}
          fullscreen={fullscreen}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onToggleFullscreen={toggleFullscreen}
        />
      ) : null}
    </div>
  );
}

interface VideoBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The largest 16:9 box that fits the stage, centred. */
function useVideoBox(stage: HTMLElement | null): VideoBox | null {
  const [box, setBox] = useState<VideoBox | null>(null);

  useEffect(() => {
    if (!stage) return;

    const observer = new ResizeObserver(() => {
      const { width: outerWidth, height: outerHeight } = stage.getBoundingClientRect();
      const width = Math.min(outerWidth, (outerHeight * 16) / 9);
      const height = (width * 9) / 16;
      setBox({ left: (outerWidth - width) / 2, top: (outerHeight - height) / 2, width, height });
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, [stage]);

  return box;
}

interface Sound {
  muted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolume: (volume: number) => void;
}

/** Play, seek, time, sound and full screen. Drives one video, or every pane side by side. */
export function ControlBar({
  className,
  time,
  duration,
  playing,
  sound,
  fullscreen,
  onTogglePlay,
  onSeek,
  onToggleFullscreen,
  children,
}: {
  className?: string;
  time: number;
  duration: number;
  playing: boolean;
  sound: Sound | null;
  fullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onToggleFullscreen: () => void;
  /** Extra items after the time. The full screen button stays at the far end. */
  children?: ReactNode;
}) {
  /** Where the viewer is dragging the seek bar, in seconds. */
  const [scrub, setScrub] = useState<number | null>(null);
  const shown = scrub ?? time;
  const progress = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;

  const fromPointer = (element: HTMLElement, clientX: number): number => {
    const rect = element.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;

    return Math.min(1, Math.max(0, fraction)) * duration;
  };

  return (
    <div className={cn("flex flex-col gap-1 px-3 pb-2 text-foreground", className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${formatClock(shown)} of ${formatClock(duration)}`}
        className="group/seek relative flex h-4 cursor-pointer items-center outline-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setScrub(fromPointer(event.currentTarget, event.clientX));
        }}
        onPointerMove={(event) => {
          if (scrub != null) setScrub(fromPointer(event.currentTarget, event.clientX));
        }}
        onPointerUp={(event) => {
          if (scrub == null) return;
          onSeek(fromPointer(event.currentTarget, event.clientX));
          setScrub(null);
        }}
        onPointerCancel={() => setScrub(null)}
        onKeyDown={(event) => {
          const step = event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0;

          if (step === 0) return;
          event.preventDefault();
          onSeek(Math.min(duration, Math.max(0, shown + step)));
        }}
      >
        <div className="relative h-1 w-full rounded-full bg-foreground/20 transition-[height] group-hover/seek:h-1.5 group-focus-visible/seek:h-1.5">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground opacity-0 shadow transition-opacity group-hover/seek:opacity-100 group-focus-visible/seek:opacity-100"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        <ControlButton label={playing ? "Pause" : "Play"} onClick={onTogglePlay}>
          {playing ? <Pause /> : <Play />}
        </ControlButton>
        {sound ? (
          <div className="group/volume flex items-center">
            <ControlButton label={sound.muted ? "Unmute" : "Mute"} onClick={sound.onToggleMute}>
              {sound.muted ? <VolumeX /> : <Volume2 />}
            </ControlButton>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={sound.muted ? 0 : sound.volume}
              onChange={(event) => sound.onVolume(Number(event.target.value))}
              className="h-1 w-0 cursor-pointer accent-foreground opacity-0 transition-[width,opacity] group-focus-within/volume:ml-1 group-focus-within/volume:w-20 group-focus-within/volume:opacity-100 group-hover/volume:ml-1 group-hover/volume:w-20 group-hover/volume:opacity-100"
            />
          </div>
        ) : null}
        <span className="mr-3 ml-2 font-mono text-[13px] tabular-nums">
          {formatClock(shown)}
          <span className="text-muted-foreground"> / {formatClock(duration)}</span>
        </span>
        {children}
        <ControlButton
          className="ml-auto"
          label={fullscreen ? "Exit full screen" : "Full screen"}
          onClick={onToggleFullscreen}
        >
          {fullscreen ? <Minimize /> : <Maximize />}
        </ControlButton>
      </div>
    </div>
  );
}

/** The pane's sound, for the side by side bar: it drives the pane with the speaker on. */
export function soundFor(
  player: PlayerController | null,
  status: PlayerStatus | null,
): Sound | null {
  return player && status ? volumeHandlers(player, status) : null;
}

function ControlButton({
  className,
  label,
  onClick,
  children,
}: {
  className?: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4.5",
        className,
      )}
    >
      {children}
    </button>
  );
}
