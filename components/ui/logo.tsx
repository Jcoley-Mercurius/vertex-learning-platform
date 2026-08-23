import { cn } from "./cn";

export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      className={cn("shrink-0 text-primary-500", className)}
      aria-hidden
    >
      <path d="M1.5 3h21L12 22.5 1.5 3Zm5.9 4 4.6 8.4L16.6 7H7.4Z" />
    </svg>
  );
}

export function Logo({
  className,
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <span className="text-heading-2 font-semibold tracking-tight text-neutral-900">
        Vertex
      </span>
    </span>
  );
}
