import { useEffect, useRef } from "react";

import type { Json } from "../json";
import type { VideoSource } from "../source";
import { track } from "./analytics";
import { formatClock, formatSeconds } from "./format";

export interface PlayerController {
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  /** If the player is already ready, the listener runs now. Returns unsubscribe. */
  onReady(listener: () => void): () => void;
}

interface YtPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
  getCurrentTime(): Json;
}

interface YtPlayerOptions {
  videoId: string;
  width: string;
  height: string;
  playerVars: {
    rel: number;
    modestbranding: number;
    playsinline: number;
    enablejsapi: number;
    origin: string;
  };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: YtPlayerOptions) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    if (!document.querySelector("script[data-youtube-iframe-api]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.dataset.youtubeIframeApi = "true";
      document.body.appendChild(script);
    }
  });
}

export function devFakePlayer(): boolean {
  if (!import.meta.env.DEV) return false;

  return new URLSearchParams(window.location.search).get("player") === "fake";
}

export function RaidPlayer({
  source,
  fake,
  onController,
}: {
  source: VideoSource;
  fake: boolean;
  onController: (player: PlayerController | null) => void;
}) {
  if (fake) {
    return <FakePlayer duration={source.duration} onController={onController} />;
  }

  if (source.kind === "twitch") {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
        Twitch playback is not available yet.
      </div>
    );
  }

  return <YoutubePlayer videoId={source.id} onController={onController} />;
}

function YoutubePlayer({
  videoId,
  onController,
}: {
  videoId: string;
  onController: (player: PlayerController | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onControllerRef = useRef(onController);
  onControllerRef.current = onController;

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;
    let cancelled = false;
    let player: YtPlayer | null = null;
    let ready = false;
    let playing = false;
    let pending: number | null = null;
    let seekTarget: number | null = null;
    const listeners = new Set<() => void>();

    const noteState = (state: number) => {
      const isPlaying = state === 1;

      if (isPlaying && !playing) track("VOD played");

      if (isPlaying) playing = true;
      else if (state === -1 || state === 0 || state === 2 || state === 5) playing = false;
    };

    const controller: PlayerController = {
      seekTo(seconds) {
        seekTarget = seconds;

        if (ready && player) {
          player.seekTo(seconds, true);
          player.playVideo();
        } else {
          pending = seconds;
        }
      },
      getCurrentTime() {
        if (!ready || !player) return seekTarget ?? pending ?? 0;
        let reported = 0;

        try {
          const value = player.getCurrentTime();
          // SAFETY: Number.isFinite accepts only finite numbers, which are JSON numbers.
          reported = Number.isFinite(value) ? (value as number) : 0;
        } catch {
          reported = 0;
        }

        if (seekTarget != null && Math.abs(reported - seekTarget) > 0.75) return seekTarget;
        seekTarget = null;

        return reported;
      },
      onReady(listener) {
        if (ready) listener();
        else listeners.add(listener);

        return () => listeners.delete(listener);
      },
    };

    onControllerRef.current(controller);

    void loadYoutubeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      host.replaceChildren();
      const mount = document.createElement("div");
      mount.className = "h-full w-full";
      host.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ready = true;

            if (pending != null) {
              seekTarget = pending;
              player?.seekTo(pending, true);
              player?.playVideo();
              pending = null;
            }

            listeners.forEach((listener) => listener());
          },
          onStateChange: (event: { data: number }) => {
            noteState(event.data);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      onControllerRef.current(null);
      player?.destroy();
    };
  }, [videoId]);

  return <div ref={hostRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />;
}

interface FakeClock {
  time: number;
  playing: boolean;
  last: number;
  seek: number | null;
}

function FakePlayer({
  duration,
  onController,
}: {
  duration: number;
  onController: (player: PlayerController | null) => void;
}) {
  const onControllerRef = useRef(onController);
  onControllerRef.current = onController;
  const clockRef = useRef<FakeClock>({ time: 0, playing: false, last: 0, seek: null });
  const labelRef = useRef<HTMLParagraphElement>(null);
  const seekRef = useRef<HTMLParagraphElement>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    let ready = false;
    const listeners = new Set<() => void>();
    const clock = clockRef.current;

    const controller: PlayerController = {
      seekTo(seconds) {
        const length = durationRef.current;
        const wasPlaying = clock.playing;
        clock.time = Math.min(Math.max(0, seconds), Math.max(length, 0));
        clock.playing = true;
        clock.last = performance.now();
        clock.seek = seconds;

        if (!wasPlaying) track("VOD played");
      },
      getCurrentTime() {
        return clock.time;
      },
      onReady(listener) {
        if (ready) listener();
        else listeners.add(listener);

        return () => listeners.delete(listener);
      },
    };

    onControllerRef.current(controller);
    ready = true;
    listeners.forEach((listener) => listener());

    let raf = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      if (clock.playing) {
        const step = (now - clock.last) / 1000;
        clock.last = now;
        clock.time = Math.min(durationRef.current, clock.time + step);

        if (clock.time >= durationRef.current) clock.playing = false;
      } else {
        clock.last = now;
      }

      if (labelRef.current) labelRef.current.textContent = formatClock(clock.time);

      if (seekRef.current) {
        seekRef.current.textContent =
          clock.seek == null ? "seekTo(—)" : `seekTo(${formatSeconds(clock.seek)})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      onControllerRef.current(null);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-white">
      <p className="text-[11px] tracking-wide text-white/60 uppercase">Dev player</p>
      <p ref={labelRef} className="font-mono text-3xl tabular-nums">
        0:00
      </p>
      <p ref={seekRef} className="font-mono text-xs text-white/70">
        seekTo(—)
      </p>
      <button
        type="button"
        className="mt-2 border border-white/30 px-2 py-1 text-xs"
        onClick={() => {
          const clock = clockRef.current;
          clock.playing = !clock.playing;
          clock.last = performance.now();

          if (clock.playing) track("VOD played");
        }}
      >
        Play / Pause
      </button>
    </div>
  );
}
