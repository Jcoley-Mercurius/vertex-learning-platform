"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";

import { useProgress } from "@/components/progress";
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
 * It is also where progress is written. Position goes to `/api/progress` at
 * most every 15 seconds and once more on the way out, and reaching the end of
 * the video is what marks the lesson complete (AGENTS.md section 7). The
 * browser holds no token — the route does the write.
 *
 * Watch depth is reported twice over: `video_milestone_reached` as the learner
 * passes 25/50/75%, and one `video_watch_ended` when they leave. The milestones
 * alone would hide everyone who stops between two of them — the closing event is
 * what makes watch depth a distribution rather than three buckets.
 */

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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

/**
 * How often a resume position is written. The player already ticks every 5s for
 * milestones; writing on every tick would be three Sanity writes a minute per
 * learner to move a number by five seconds.
 */
const PROGRESS_WRITE_INTERVAL_MS = 15_000;

/**
 * A stored position below this is not worth resuming from — it is the first few
 * seconds of a video the learner has effectively not started.
 */
const MIN_RESUME_SECONDS = 15;

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
  const { save, byLesson } = useProgress();
  const [playing, setPlaying] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const reachedRef = useRef<number[]>([]);
  /* The furthest point reached, kept outside React state so the closing capture
     can read it during unmount without re-rendering on every tick. */
  const depthRef = useRef({ seconds: 0, duration: 0, completed: false });
  /* One `video_watch_ended` per visit, whichever of pagehide or unmount wins. */
  const endedRef = useRef(false);
  /* The second the mounted player was last sent to, so a new deep link into a
     lesson that is already playing can be told apart from a re-render. */
  const seekedToRef = useRef(startSeconds);
  /* When a resume position was last written, and whether completion already
     went out for this visit, so the ENDED handler cannot write twice. */
  const savedAtRef = useRef(0);
  const savedCompleteRef = useRef(false);
  /* The second playback actually began, frozen when the learner pressed play. */
  const beginRef = useRef(0);

  /* Where playback would begin if the learner pressed play now. A search
     result's `?t=` always wins — they asked for that exact moment — and
     otherwise the lesson picks up from where they stopped (AGENTS.md section 7).
     A finished lesson starts over rather than resuming at its own last second.

     This tracks the learner's progress, so it changes *while the video plays*:
     the position written at 0:20 is itself past the resume threshold. Nothing
     downstream of playback may depend on it — see `beginRef`. */
  const stored = byLesson.get(analytics.lessonId);
  const resumeSeconds =
    stored && !stored.completed && stored.positionSeconds >= MIN_RESUME_SECONDS
      ? Math.min(stored.positionSeconds, durationSeconds || stored.positionSeconds)
      : 0;
  const nextStartSeconds = startSeconds > 0 ? startSeconds : resumeSeconds;

  /* Every video event carries the same lesson identity plus how it was entered:
     `deep_linked` is a search result's "watch from 4:20", `resumed` is the
     learner returning to where they stopped.

     Deliberately independent of the learner's live progress. This memo feeds
     `endWatch`, which the teardown effect depends on, so a value that changed
     mid-playback would re-run that effect — and its cleanup destroys the
     player. That is exactly what used to end a video around twenty seconds in. */
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
   * Writes the resume position, throttled. `force` is the way out of the page:
   * the last position of a visit has to go out even if the interval has not
   * elapsed, or a learner who watches for ten seconds and leaves resumes at zero.
   */
  const savePosition = useCallback(
    (seconds: number, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - savedAtRef.current < PROGRESS_WRITE_INTERVAL_MS) return;

      savedAtRef.current = now;
      void save({ lessonId: analytics.lessonId, positionSeconds: Math.round(seconds) });
    },
    [analytics.lessonId, save],
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

    /* The last position of the visit. `save` sends it with `keepalive`, so it
       survives the document going away underneath it. */
    savePosition(seconds, { force: true });

    posthog.capture("video_watch_ended", {
      ...context,
      /* Where this playback actually began, which is not the URL's `?t=` when
         the learner resumed. Read from the ref so the capture stays independent
         of the live progress state. */
      start_seconds: beginRef.current,
      resumed: startSeconds === 0 && beginRef.current > 0,
      seconds_watched: Math.round(seconds),
      percent_watched: Math.min(100, Math.round((seconds / duration) * 100)),
      completed,
    });
  }, [context, savePosition, startSeconds]);

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

    savePosition(seconds);

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
  }, [context, savePosition]);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(trackProgress, 5000);
    return () => window.clearInterval(interval);
  }, [playing, trackProgress]);

  /* A second search result for the same lesson is a client-side navigation: the
     page re-renders with a new `?t=`, but this component and its player survive,
     so `playerVars.start` never runs again. Seek the live player instead. */
  useEffect(() => {
    const player = playerRef.current;

    if (!player || startSeconds === seekedToRef.current) return;

    seekedToRef.current = startSeconds;
    player.seekTo(startSeconds, true);
  }, [startSeconds]);

  /* The latest `endWatch`, reachable from effects that must not re-run when it
     changes. Its identity moves with the analytics context, and the teardown
     below destroys the player — so depending on it directly would end playback
     the moment anything in that context changed. */
  const endWatchRef = useRef(endWatch);

  useEffect(() => {
    endWatchRef.current = endWatch;
  });

  /* pagehide covers closing the tab or a hard navigation, where unmount cleanup
     is not guaranteed to run. */
  useEffect(() => {
    const onPageHide = () => endWatchRef.current();

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  /* Unmount only. Empty deps are load-bearing: this cleanup tears the player
     down, so it must run when the learner leaves the lesson and at no other
     time. */
  useEffect(() => {
    return () => {
      endWatchRef.current();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const play = useCallback(async () => {
    if (!video) return;

    /* Frozen for this playback: from here on the resume position is history, and
       the learner's own progress writes must not move it. */
    const begin = nextStartSeconds;
    beginRef.current = begin;

    setPlaying(true);
    seekedToRef.current = begin;
    posthog.capture("video_played", {
      ...context,
      start_seconds: begin,
      resumed: startSeconds === 0 && begin > 0,
    });

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
        start: begin,
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
            posthog.capture("video_completed", context);

            /* Reaching the end is what completes a lesson (AGENTS.md section 7).
               `lesson_completed` is captured by the route, not here, so it fires
               on the transition rather than on every replay. */
            if (!savedCompleteRef.current) {
              savedCompleteRef.current = true;
              savedAtRef.current = Date.now();
              void save({
                lessonId: analytics.lessonId,
                positionSeconds: Math.round(runtime || durationSeconds),
                completed: true,
              });
            }
          }
        },
      },
    });
  }, [analytics.lessonId, context, durationSeconds, nextStartSeconds, save, startSeconds, video]);

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
                  nextStartSeconds > 0
                    ? `Play ${title} from ${formatTimestamp(nextStartSeconds)}`
                    : `Play ${title}`
                }
                className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-colors hover:bg-neutral-900/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
                  <Icon name="play" variant="filled" size={28} className="ml-1" />
                </span>
                {nextStartSeconds > 0 ? (
                  <span className="absolute bottom-5 left-5 rounded-xs bg-neutral-900/80 px-2 py-1 text-body text-white">
                    {startSeconds > 0 ? "Starts at" : "Resumes at"}{" "}
                    {formatTimestamp(nextStartSeconds)}
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
