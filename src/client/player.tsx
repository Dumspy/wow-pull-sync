import { useCallback, useEffect, useRef, useState } from "react";

import type { Json } from "../json";
import type { VideoSource } from "../source";
import { track } from "./analytics";
import { formatClock, formatSeconds } from "./format";
import { PlayerFrame } from "./player-controls";

export interface PlayerController {
  /** Seeks and plays. */
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  /** Side by side keeps every pane but one muted. Applied once the player is ready. */
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** From 0 to 1. Applied once the player is ready. */
  setVolume(volume: number): void;
  getVolume(): number;
  /** If the player is already ready, the listener runs now. Returns unsubscribe. */
  onReady(listener: () => void): () => void;
}

interface YtPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  destroy(): void;
  getCurrentTime(): Json;
}

interface YtPlayerOptions {
  videoId: string;
  width: string;
  height: string;
  playerVars: {
    controls: number;
    disablekb: number;
    fs: number;
    iv_load_policy: number;
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
  setVolume(volume: number): void;
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
  /**
   * Not in Twitch's docs, but the player honours it: false hides the controls, title and Follow
   * button. Our own controls replace them, and Twitch can't be covered or clipped instead.
   */
  controls: boolean;
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

/** Letterbox to clip off each embed, sized to YouTube's title and logo strips. Twitch can't be clipped. */
const CROP = { youtube: 72, twitch: 0 } as const;

export interface PlayerGroup {
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
}

/** The VOD's own embed under our controls, so YouTube and Twitch look and work the same. */
export function RaidPlayer({
  source,
  fake,
  group,
  onController,
}: {
  source: VideoSource;
  fake: boolean;
  /** The page draws the bar for every pane: no bar of its own, and clicks drive the page's. */
  group?: PlayerGroup;
  onController: (player: PlayerController | null) => void;
}) {
  const [player, setPlayer] = useState<PlayerController | null>(null);
  const onControllerRef = useRef(onController);
  onControllerRef.current = onController;

  const register = useCallback((next: PlayerController | null) => {
    setPlayer(next);
    onControllerRef.current(next);
  }, []);

  return (
    <PlayerFrame
      player={player}
      duration={source.duration}
      coverable={fake || source.kind !== "twitch"}
      crop={fake ? 0 : CROP[source.kind]}
      bar={!group}
      onClick={group?.onTogglePlay}
      onDoubleClick={group?.onToggleFullscreen}
    >
      {fake ? (
        <FakePlayer duration={source.duration} onController={register} />
      ) : source.kind === "twitch" ? (
        <TwitchVideoPlayer videoId={source.id} onController={register} />
      ) : (
        <YoutubePlayer videoId={source.id} onController={register} />
      )}
    </PlayerFrame>
  );
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
    let volume = 1;
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
      isMuted() {
        return muted;
      },
      setVolume(next) {
        volume = next;

        if (ready) player?.setVolume(Math.round(next * 100));
      },
      getVolume() {
        return volume;
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
        // Our own controls sit on top, so YouTube's are off.
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
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
            player?.setVolume(Math.round(volume * 100));

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
    // Twitch ignores seek() until playback has started. It also pauses itself, and then ignores
    // play(), while anything covers the embed, so captions and controls sit around it, never on it.
    let started = false;
    let pending: number | null = null;
    let seekTarget: number | null = null;
    let playing = false;
    let muted = false;
    let volume = 1;
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
      isMuted() {
        return muted;
      },
      setVolume(next) {
        volume = next;

        if (ready) player?.setVolume(next);
      },
      getVolume() {
        return volume;
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
          controls: false,
        });
        player.addEventListener(Twitch.Player.READY, () => {
          ready = true;
          player?.setMuted(muted);
          player?.setVolume(volume);
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
        // Resuming fires PLAY but not always PLAYING, so either one means it plays.
        player.addEventListener(Twitch.Player.PLAY, () => {
          if (!playing) track("VOD played");
          playing = true;
        });
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
  muted: boolean;
  volume: number;
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

  const clockRef = useRef<FakeClock>({
    time: 0,
    playing: false,
    last: 0,
    seek: null,
    muted: false,
    volume: 1,
  });

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
        if (!clock.playing) track("VOD played");
        clock.playing = true;
        clock.last = performance.now();
      },
      pause() {
        clock.playing = false;
      },
      isPlaying() {
        return clock.playing;
      },
      setMuted(next) {
        clock.muted = next;
      },
      isMuted() {
        return clock.muted;
      },
      setVolume(next) {
        clock.volume = next;
      },
      getVolume() {
        return clock.volume;
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
    </div>
  );
}
