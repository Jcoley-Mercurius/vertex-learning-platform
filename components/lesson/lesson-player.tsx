"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

import { Icon } from "@/components/ui";
import { formatTimestamp, type ParsedVideo } from "@/lib/video";

/**
 * The lesson video, playing on the page. Playback is the provider's own player
 * inside the frame the reference draws (AGENTS.md section 7) — the mockup's
 * control strip is deliberately not reproduced, and the learner is never sent
 * out to YouTube.
 *
 * The poster is a click-to-play facade, so nothing is requested from YouTube
 * until the learner plays. The click then mounts the IFrame API player, which
 * is also what reports watch depth to PostHog.
 */

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

/** Resolves once the IFrame API is on the page. Shared across every caller. */
let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  apiPromise ??= new Promise<YouTubeApi>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YouTubeApi);
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

/** Watch-depth milestones, in percent. */
const MILESTONES = [25, 50, 75];

export function LessonPlayer({
  video,
  posterUrl,
  posterLqip,
  posterAlt,
  title,
  startSeconds,
  analytics,
}: {
  /** `null` when the lesson's URL is not a supported provider. */
  video: ParsedVideo | null;
  posterUrl: string | null;
  posterLqip: string | null;
  posterAlt: string;
  title: string;
  startSeconds: number;
  analytics: {
    lessonId: string;
    lessonTitle: string;
    lessonLabel: string;
    courseTitle: string;
  };
}) {
  const [playing, setPlaying] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const reachedRef = useRef<number[]>([]);

  /* Milestones are checked on a timer: the IFrame API reports state changes,
     not position, so there is nothing else to hang watch depth off. */
  const trackProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const duration = player.getDuration();
    if (!duration) return;

    const percent = (player.getCurrentTime() / duration) * 100;

    for (const milestone of MILESTONES) {
      if (percent >= milestone && !reachedRef.current.includes(milestone)) {
        reachedRef.current.push(milestone);
        posthog.capture("video_progress", { ...analytics, percent: milestone });
      }
    }
  }, [analytics]);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(trackProgress, 5000);
    return () => window.clearInterval(interval);
  }, [playing, trackProgress]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const play = useCallback(async () => {
    if (!video) return;

    setPlaying(true);
    posthog.capture("video_played", { ...analytics, start_seconds: startSeconds });

    const api = await loadYouTubeApi();
    const mount = mountRef.current;
    if (!mount) return;

    playerRef.current = new api.Player(mount, {
      videoId: video.id,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        start: startSeconds,
        origin: window.location.origin,
      },
      events: {
        onStateChange: (event) => {
          if (event.data === api.PlayerState.ENDED) {
            posthog.capture("video_completed", analytics);
          }
        },
      },
    });
  }, [analytics, startSeconds, video]);

  return (
    <div className="mt-8 overflow-hidden rounded-lg bg-neutral-900 shadow-md">
      <div className="relative aspect-video w-full">
        {playing ? (
          /* The API replaces this node with the provider's iframe. */
          <div className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full">
            <div ref={mountRef} className="h-full w-full" />
          </div>
        ) : (
          <>
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={posterAlt}
                fill
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover"
                placeholder={posterLqip ? "blur" : undefined}
                blurDataURL={posterLqip ?? undefined}
                priority
              />
            ) : null}

            {video ? (
              <button
                type="button"
                onClick={play}
                aria-label={
                  startSeconds > 0
                    ? `Play ${title} from ${formatTimestamp(startSeconds)}`
                    : `Play ${title}`
                }
                className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-colors hover:bg-neutral-900/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
                  <Icon name="play" variant="filled" size={28} className="ml-1" />
                </span>
                {startSeconds > 0 ? (
                  <span className="absolute bottom-5 left-5 rounded-xs bg-neutral-900/80 px-2 py-1 text-body text-white">
                    Starts at {formatTimestamp(startSeconds)}
                  </span>
                ) : null}
              </button>
            ) : (
              <p className="absolute inset-x-0 bottom-0 bg-neutral-900/80 px-5 py-4 text-body text-white">
                This lesson&rsquo;s video is hosted by a provider that is not supported yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
