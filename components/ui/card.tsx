import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Badge } from "./badge";
import { Icon } from "./icon";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Element to render. Use `article` when the card is standalone content. */
  as?: "div" | "article";
};

export function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 text-body text-neutral-500">
      {children}
    </div>
  );
}

export function CourseCard({
  title,
  description,
  level,
  duration,
  modules,
  icon,
  orientation = "inline",
  href,
  footer,
  className,
}: {
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  /** Square course glyph. Defaults to the course initial. */
  icon?: ReactNode;
  /** `stacked` puts the glyph above a display-face title, as the home page shows it. */
  orientation?: "inline" | "stacked";
  /** When set, the whole card becomes a link to the course. */
  href?: string;
  /**
   * Rendered under the meta row. The catalog puts the signed-in learner's
   * progress bar here; it is a slot rather than a value because the card itself
   * is server-rendered and knows nothing about the session.
   */
  footer?: ReactNode;
  className?: string;
}) {
  const stacked = orientation === "stacked";

  const glyph = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        icon
          ? "h-18 w-18"
          : "h-12 w-12 rounded-sm bg-neutral-900 text-heading-2 font-semibold text-white",
      )}
    >
      {icon ?? title.charAt(0)}
    </span>
  );

  const body = (
    <>
      {stacked ? (
        <>
          {glyph}
          <h3 className="mt-8 font-display text-heading-2 font-medium text-neutral-900">
            {title}
          </h3>
          <p className="mt-3 text-body text-neutral-500">{description}</p>
        </>
      ) : (
        <div className="flex items-start gap-4">
          {glyph}
          <div className="min-w-0">
            <h3 className="text-heading-3 font-semibold text-neutral-900">{title}</h3>
            <p className="mt-1 text-body text-neutral-500">{description}</p>
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-2 text-body text-neutral-500",
          stacked
            ? "mt-auto border-t border-neutral-200 pt-4"
            : "mt-6",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="bar-chart" variant="filled" size={18} />
          {level}
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="clock" size={18} />
          {duration}
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name={stacked ? "file" : "folder"} size={18} />
          {modules}
        </span>
      </div>
      {footer}
    </>
  );

  const cardClassName = cn(
    stacked ? "flex h-full flex-col p-8" : undefined,
    href ? "relative transition-shadow hover:shadow-md" : undefined,
    className,
  );

  if (href) {
    /* The title link is stretched over the card, so the whole card is one target. */
    return (
      <Card as="article" className={cardClassName}>
        <Link
          href={href}
          className={cn(
            "after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none",
            "focus-visible:after:outline-2 focus-visible:after:outline-offset-2",
            "focus-visible:after:outline-primary-400",
          )}
        >
          <span className="sr-only">{title}</span>
        </Link>
        {body}
      </Card>
    );
  }

  return (
    <Card as={stacked ? "article" : "div"} className={cardClassName}>
      {body}
    </Card>
  );
}

export function LessonVideoCard({
  title,
  description,
  lessonLabel,
  clipLength,
  watchFrom,
  className,
}: {
  title: string;
  description: string;
  lessonLabel: string;
  clipLength: string;
  /** Timestamp label for the watch action, e.g. "12:45". */
  watchFrom: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Badge tone="video">Video</Badge>
      <h3 className="mt-3 text-heading-3 font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-body text-neutral-500">{description}</p>
      <CardFooter>
        <span>
          {lessonLabel} &middot; {clipLength}
        </span>
        <span className="inline-flex items-center gap-2 font-medium text-primary-500">
          <Icon name="play-circle" size={18} />
          Watch from {watchFrom}
        </span>
      </CardFooter>
    </Card>
  );
}

export function LessonCard({
  title,
  description,
  moduleLabel,
  className,
}: {
  title: string;
  description: string;
  moduleLabel: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Badge tone="lesson">Lesson</Badge>
      <h3 className="mt-3 text-heading-3 font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-body text-neutral-500">{description}</p>
      <CardFooter>
        <span>{moduleLabel}</span>
        <span className="inline-flex items-center gap-2 font-medium text-primary-500">
          View lesson
          <Icon name="external-link" size={18} />
        </span>
      </CardFooter>
    </Card>
  );
}

export function ResourceCard({
  title,
  description,
  fileType,
  fileSize,
  className,
}: {
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-4">
        <Icon name="file-text" size={28} className="mt-1 text-neutral-900" />
        <div className="min-w-0">
          <h3 className="text-heading-3 font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      <CardFooter>
        <span>
          {fileType} &middot; {fileSize}
        </span>
        <Icon name="external-link" size={18} className="text-primary-500" />
      </CardFooter>
    </Card>
  );
}
