import { useEffect, useRef } from "react";

import type { Json } from "../json";
import type { VideoSource } from "../source";
import { track } from "./analytics";
import { formatClock, formatSeconds } from "./format";

export interface PlayerController {
  /** Seeks and plays. */
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  /** Side by side keeps every pane but one muted. Applied once the player is ready. */
  setMuted(muted: boolean): void;
  /** If the player is already ready, the listener runs now. Returns unsubscribe. */
  onReady(listener: () => void): () => void;
}

interface YtPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
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

interface TwitchPlayer {
  seek(seconds: number): void;
  play(): void;
  pause(): void;
  setMuted(muted: boolean): void;
  getCurrentTime(): Json;
  addEventListener(event: string, listener: () => void): void;
}

interface TwitchPlayerOptions {
  video: string;
  width: string;
  height: string;
  /** Hostnames of the page embedding the player. Twitch refuses to play without a match. */
  parent: string[];
  autoplay: boolean;
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: YtPlayerOptions) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
    Twitch?: {
      Player: {
        new (element: HTMLElement, options: TwitchPlayerOptions): TwitchPlayer;
        READY: string;
        PLAY: string;
        PLAYING: string;
        PAUSE: string;
        ENDED: string;
      };
    };
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

let twitchApi: Promise<void> | null = null;

function loadTwitchApi(): Promise<void> {
  if (window.Twitch?.Player) return Promise.resolve();

  twitchApi ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://player.twitch.tv/js/embed/v1.js";
    script.dataset.twitchEmbedApi = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      twitchApi = null;
      reject(new Error("The Twitch player could not be loaded."));
    };

    document.body.appendChild(script);
  });

  return twitchApi;
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
    return <TwitchVideoPlayer videoId={source.id} onController={onController} />;
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
    let muted = false;
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
      play() {
        if (ready) player?.playVideo();
      },
      pause() {
        if (ready) player?.pauseVideo();
      },
      isPlaying() {
        return playing;
      },
      setMuted(next) {
        muted = next;

        if (!ready || !player) return;

        if (next) player.mute();
        else player.unMute();
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

            if (muted) player?.mute();

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
      // The page drops this controller on its next render, so until then every call must be a
      // no-op: a destroyed YouTube player throws on any method.
      ready = false;
      const destroyed = player;
      player = null;
      destroyed?.destroy();
    };
  }, [videoId]);

  return <div ref={hostRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />;
}

function TwitchVideoPlayer({
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
    let player: TwitchPlayer | null = null;
    let ready = false;
    // Twitch ignores seek() until playback has started. It also won't start without a click
    // while anything covers the embed, so captions sit above the player, never on it.
    let started = false;
    let pending: number | null = null;
    let seekTarget: number | null = null;
    let playing = false;
    let muted = false;
    const listeners = new Set<() => void>();

    const controller: PlayerController = {
      seekTo(seconds) {
        seekTarget = seconds;

        if (ready && player && started) {
          player.seek(seconds);
          player.play();
        } else {
          // Applied on PLAYING, whether our play() or the viewer's click starts it.
          pending = seconds;

          if (ready) player?.play();
        }
      },
      getCurrentTime() {
        if (!ready || !player || !started) return seekTarget ?? pending ?? 0;
        let reported = 0;

        try {
          const value = player.getCurrentTime();
          // SAFETY: Number.isFinite accepts only finite numbers, which are JSON numbers.
          reported = Number.isFinite(value) ? (value as number) : 0;
        } catch {
          reported = 0;
        }

        // Twitch reports the old time for a moment after a seek, like YouTube.
        if (seekTarget != null && Math.abs(reported - seekTarget) > 0.75) return seekTarget;
        seekTarget = null;

        return reported;
      },
      play() {
        if (ready) player?.play();
      },
      pause() {
        if (ready) player?.pause();
      },
      isPlaying() {
        return playing;
      },
      setMuted(next) {
        muted = next;

        if (ready) player?.setMuted(next);
      },
      onReady(listener) {
        if (ready) listener();
        else listeners.add(listener);

        return () => listeners.delete(listener);
      },
    };

    onControllerRef.current(controller);

    void loadTwitchApi()
      .then(() => {
        const Twitch = window.Twitch;

        if (cancelled || !hostRef.current || !Twitch) return;
        host.replaceChildren();
        const mount = document.createElement("div");
        mount.className = "h-full w-full";
        host.appendChild(mount);
        player = new Twitch.Player(mount, {
          video: videoId,
          width: "100%",
          height: "100%",
          parent: [window.location.hostname],
          autoplay: false,
        });
        player.addEventListener(Twitch.Player.READY, () => {
          ready = true;
          player?.setMuted(muted);
          listeners.forEach((listener) => listener());
        });
        player.addEventListener(Twitch.Player.PLAYING, () => {
          started = true;
          playing = true;

          if (pending != null) {
            seekTarget = pending;
            player?.seek(pending);
            pending = null;
          }
        });
        player.addEventListener(Twitch.Player.PLAY, () => track("VOD played"));
        player.addEventListener(Twitch.Player.PAUSE, () => {
          playing = false;
        });
        player.addEventListener(Twitch.Player.ENDED, () => {
          playing = false;
        });
      })
      .catch(() => {
        if (!cancelled) host.textContent = "The Twitch player could not be loaded.";
      });

    return () => {
      cancelled = true;
      onControllerRef.current(null);
      ready = false;
      player = null;
      // The embed has no destroy call; removing its iframe stops playback.
      host.replaceChildren();
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
      play() {
        clock.playing = true;
        clock.last = performance.now();
      },
      pause() {
        clock.playing = false;
      },
      isPlaying() {
        return clock.playing;
      },
      setMuted() {},
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
