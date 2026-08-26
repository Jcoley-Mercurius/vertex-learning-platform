"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 *
 * Watch depth is reported twice over: `video_milestone_reached` as the learner
 * passes 25/50/75%, and one `video_watch_ended` when they leave. The milestones
 * alone would hide everyone who stops between two of them — the closing event is
 * what makes watch depth a distribution rather than three buckets.
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
  durationSeconds,
  analytics,
}: {
  /** `null` when the lesson's URL is not a supported provider. */
  video: ParsedVideo | null;
  posterUrl: string | null;
  posterLqip: string | null;
  posterAlt: string;
  title: string;
  startSeconds: number;
  /** The lesson's authored runtime, reported alongside the player's own. */
  durationSeconds: number;
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
  /* The furthest point reached, kept outside React state so the closing capture
     can read it during unmount without re-rendering on every tick. */
  const depthRef = useRef({ seconds: 0, duration: 0, completed: false });
  /* One `video_watch_ended` per visit, whichever of pagehide or unmount wins. */
  const endedRef = useRef(false);

  /* Every video event carries the same lesson identity plus how it was entered:
     `deep_linked` is a search result's "watch from 4:20", the one resume-shaped
     behaviour the app has today. */
  const context = useMemo(
    () => ({
      ...analytics,
      video_provider: video?.provider ?? null,
      duration_seconds: durationSeconds,
      start_seconds: startSeconds,
      deep_linked: startSeconds > 0,
    }),
    [analytics, durationSeconds, startSeconds, video?.provider],
  );

  /**
   * The closing watch-depth event. Fires once, on whichever of pagehide or
   * unmount comes first, so leaving mid-video is still measured.
   */
  const endWatch = useCallback(() => {
    if (endedRef.current) return;

    const player = playerRef.current;
    if (player) {
      const currentTime = player.getCurrentTime();
      const currentDuration = player.getDuration();
      if (currentTime && currentDuration) {
        depthRef.current = {
          seconds: Math.max(depthRef.current.seconds, currentTime),
          duration: currentDuration,
          completed: depthRef.current.completed,
        };
      }
    }

    const { seconds, duration, completed } = depthRef.current;
    if (!seconds || !duration) return;

    endedRef.current = true;

    posthog.capture("video_watch_ended", {
      ...context,
      seconds_watched: Math.round(seconds),
      percent_watched: Math.min(100, Math.round((seconds / duration) * 100)),
      completed,
    });
  }, [context]);

  /* Milestones are checked on a timer: the IFrame API reports state changes,
     not position, so there is nothing else to hang watch depth off. */
  const trackProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const duration = player.getDuration();
    if (!duration) return;

    const seconds = player.getCurrentTime();
    const percent = (seconds / duration) * 100;

    depthRef.current = {
      // Furthest reached, so scrubbing backwards does not erase watch depth.
      seconds: Math.max(depthRef.current.seconds, seconds),
      duration,
      completed: depthRef.current.completed,
    };

    for (const milestone of MILESTONES) {
      if (percent >= milestone && !reachedRef.current.includes(milestone)) {
        reachedRef.current.push(milestone);
        posthog.capture("video_milestone_reached", {
          ...context,
          percent: milestone,
          seconds_watched: Math.round(seconds),
        });
      }
    }
  }, [context]);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(trackProgress, 5000);
    return () => window.clearInterval(interval);
  }, [playing, trackProgress]);

  /* pagehide covers closing the tab or a hard navigation, where unmount cleanup
     is not guaranteed to run. */
  useEffect(() => {
    window.addEventListener("pagehide", endWatch);
    return () => window.removeEventListener("pagehide", endWatch);
  }, [endWatch]);

  useEffect(() => {
    return () => {
      endWatch();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [endWatch]);

  const play = useCallback(async () => {
    if (!video) return;

    setPlaying(true);
    posthog.capture("video_played", context);

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
            const runtime = playerRef.current?.getDuration() ?? 0;
            depthRef.current = {
              seconds: runtime || depthRef.current.seconds,
              duration: runtime || depthRef.current.duration,
              completed: true,
            };
            /* Until progress has a backend, finishing the video is the closest
               thing the app has to a completed lesson. */
            posthog.capture("video_completed", context);
          }
        },
      },
    });
  }, [context, startSeconds, video]);

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
