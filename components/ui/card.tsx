import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Badge } from "./badge";
import { Icon } from "./icon";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
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
  className,
}: {
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  /** Square course glyph. Defaults to the course initial. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-neutral-900 text-heading-2 font-semibold text-white">
          {icon ?? title.charAt(0)}
        </span>
        <div className="min-w-0">
          <h3 className="text-heading-3 font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-body text-neutral-500">
        <span className="inline-flex items-center gap-2">
          <Icon name="bar-chart" variant="filled" size={18} />
          {level}
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="clock" size={18} />
          {duration}
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="folder" size={18} />
          {modules}
        </span>
      </div>
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
