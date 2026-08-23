import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "video" | "lesson" | "popular";

const tones: Record<BadgeTone, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-accent-indigo-bg text-accent-indigo",
  popular: "bg-primary-100 text-primary-500",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "video", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 text-small font-bold uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
