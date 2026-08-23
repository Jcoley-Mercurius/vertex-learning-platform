import { cn } from "./cn";

export function ProgressBar({
  value,
  showLabel = true,
  className,
  label = "complete",
}: {
  /** Percentage complete, 0-100. */
  value: number;
  showLabel?: boolean;
  className?: string;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className="h-full rounded-full bg-primary-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="shrink-0 text-body text-neutral-500">
          <span className="font-semibold text-neutral-900">{pct}%</span> {label}
        </span>
      ) : null}
    </div>
  );
}
