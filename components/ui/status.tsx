import { cn } from "./cn";
import { Icon, type IconName } from "./icon";

export type Status = "in-progress" | "completed" | "now-playing" | "locked";

const statuses: Record<
  Status,
  { label: string; icon: IconName; variant: "outline" | "filled"; color: string }
> = {
  "in-progress": {
    label: "In Progress",
    icon: "loader-circle",
    variant: "outline",
    color: "text-primary-500",
  },
  completed: {
    label: "Completed",
    icon: "check-circle",
    variant: "outline",
    color: "text-success",
  },
  "now-playing": {
    label: "Now Playing",
    icon: "play-circle",
    variant: "filled",
    color: "text-primary-500",
  },
  locked: {
    label: "Locked",
    icon: "lock",
    variant: "outline",
    color: "text-neutral-900",
  },
};

export function StatusIndicator({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const { label, icon, variant, color } = statuses[status];

  return (
    <span
      className={cn("inline-flex items-center gap-2 text-body text-neutral-900", className)}
    >
      <Icon name={icon} variant={variant} size={20} className={color} />
      {label}
    </span>
  );
}
