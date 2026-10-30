import { useEffect, useRef, type MutableRefObject } from "react";

interface YtPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: unknown) => YtPlayer;
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

export function YoutubePlayer({
  videoId,
  seekRef,
}: {
  videoId: string;
  seekRef: MutableRefObject<(seconds: number) => void>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YtPlayer | null = null;
    let ready = false;
    let pending: number | null = null;

    const jump = (seconds: number) => {
      player?.seekTo(seconds, true);
      player?.playVideo();
    };

    seekRef.current = (seconds: number) => {
      if (ready && player) jump(seconds);
      else pending = seconds;
    };

    void loadYoutubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      host.replaceChildren();
      const mount = document.createElement("div");
      mount.className = "h-full w-full";
      host.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            ready = true;
            if (pending != null) {
              jump(pending);
              pending = null;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      seekRef.current = () => {};
      player?.destroy();
    };
  }, [videoId, seekRef]);

  return <div ref={hostRef} className="aspect-video w-full bg-black" />;
}
