"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import posthog from "posthog-js";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";

import type { Notification, NotificationKind } from "@/lib/notifications";
import { Icon, buttonClassName, cn, type IconName } from "@/components/ui";

/**
 * The header bell and its panel.
 *
 * The feed is derived server side per request (`lib/notifications.ts`), so this
 * component stores nothing: it fetches once when a session exists, renders what
 * it got, and posts a single "mark read" when the learner asks.
 *
 * A signed-out visitor makes no request at all — the fetch is gated on Clerk
 * reporting a session, exactly as the progress provider is. Browsing is public,
 * a notification feed is not.
 *
 * There is no design reference for this panel, so it is assembled from the
 * shipped vocabulary rather than a new treatment (AGENTS.md section 3).
 */

const KIND_ICONS: Record<NotificationKind, IconName> = {
  "new-course": "star",
  "new-lessons": "layers",
  "resume-course": "play-circle",
  "course-completed": "check-circle",
  "bookmark-reminder": "bookmark",
};

const focusRing =
  "rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400";

/** "3 days ago", from an ISO timestamp. Coarse on purpose: this is a glance. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return `${Math.round(days / 30)}mo ago`;
}

/** A feed, tagged with the learner it was fetched for. */
type Feed = {
  userId: string;
  notifications: Notification[];
  unreadCount: number;
};

export function NotificationsBell() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);

  /* Signing out is handled by deriving rather than by resetting state in an
     effect: a bell with no session simply has no feed, and a feed tagged with
     another learner's id is not this learner's. */
  const current = feed && feed.userId === userId ? feed : null;
  const notifications = isSignedIn ? (current?.notifications ?? null) : null;
  const unread = current?.unreadCount ?? 0;

  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /* The learner the feed has been requested for. Guards React's development
     double mount and any re-render of the header. */
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      /* Ready to fetch again if this browser signs back in. */
      requested.current = null;
      return;
    }

    if (requested.current === userId) return;
    requested.current = userId;

    let active = true;

    fetch("/api/notifications")
      .then((response) => (response.ok ? response.json() : { notifications: [], unreadCount: 0 }))
      .then((data: { notifications: Notification[]; unreadCount: number }) => {
        if (!active) return;
        setFeed({
          userId,
          notifications: data.notifications ?? [],
          unreadCount: data.unreadCount ?? 0,
        });
      })
      .catch(() => {
        /* The bell is an overlay on a header that has already rendered; a failed
           fetch leaves an empty feed rather than breaking the page. */
        if (active) setFeed({ userId, notifications: [], unreadCount: 0 });
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, userId]);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  /* Escape closes and returns focus; a click outside just closes. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [close, open]);

  const markRead = () => {
    setFeed((state) =>
      state === null
        ? state
        : {
            ...state,
            notifications: state.notifications.map((item) => ({ ...item, read: true })),
            unreadCount: 0,
          },
    );

    void fetch("/api/notifications", { method: "POST" }).catch(() => {
      /* A dropped read-state write is not worth interrupting anyone for; the
         next open posts it again. */
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          const next = !open;
          setOpen(next);

          if (next) {
            posthog.capture("notifications_opened", {
              unread_count: unread,
              total_count: notifications?.length ?? 0,
              signed_in: Boolean(isSignedIn),
            });
          }
        }}
        className={cn(
          focusRing,
          "relative text-neutral-900 transition-colors hover:text-primary-500",
          open && "text-primary-500",
        )}
      >
        <Icon name="bell" variant={unread > 0 ? "filled" : "outline"} size={24} />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[0.625rem] leading-none font-medium text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-3rem))] overflow-hidden",
            "rounded-lg border border-neutral-200 bg-white shadow-lg",
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
            <h2 className="text-body-lg font-medium text-neutral-900">Notifications</h2>
            {isSignedIn && unread > 0 ? (
              <button
                type="button"
                onClick={markRead}
                className={cn(
                  focusRing,
                  "text-body text-primary-500 transition-colors hover:text-primary-600",
                )}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {!isSignedIn ? (
            <div className="px-5 py-8 text-center">
              <p className="text-body text-neutral-700">
                Sign in to see your notifications.
              </p>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className={buttonClassName({ size: "md", className: "mt-5 w-full justify-center" })}
                >
                  Sign in
                </button>
              </SignInButton>
            </div>
          ) : notifications === null ? (
            <p className="px-5 py-8 text-center text-body text-neutral-500">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-body text-neutral-700">You are all caught up.</p>
              <p className="mt-2 text-small text-neutral-500">
                Start a course and updates will show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-neutral-200 overflow-y-auto">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      posthog.capture("notification_clicked", {
                        kind: item.kind,
                        was_unread: !item.read,
                      });
                    }}
                    className={cn(
                      "flex gap-3 px-5 py-4 transition-colors hover:bg-neutral-50",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400",
                      !item.read && "bg-primary-100/40",
                    )}
                  >
                    <Icon
                      name={KIND_ICONS[item.kind]}
                      size={20}
                      className="mt-0.5 shrink-0 text-primary-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-body font-medium text-neutral-900">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-small text-neutral-500">
                          {relativeTime(item.timestamp)}
                        </span>
                      </span>
                      <span className="mt-1 block text-body text-neutral-700">{item.body}</span>
                    </span>
                    {!item.read ? (
                      <span
                        aria-hidden
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
