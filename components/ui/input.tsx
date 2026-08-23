import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

/**
 * Field specs: height 44px, radius 12px, border 1px solid #E2E8F0,
 * padding 0 16px, focus border color #FB923C.
 */

const field =
  "w-full rounded-md border border-neutral-200 bg-white px-4 " +
  "text-neutral-900 transition-colors outline-none " +
  "placeholder:text-neutral-500 focus:border-primary-400";

/** `hero` is the oversized field the home page leads with. */
export type SearchInputSize = "md" | "hero";

const searchSizes: Record<
  SearchInputSize,
  { field: string; icon: number; iconOffset: string; kbd: string; kbdOffset: string }
> = {
  md: {
    field: "h-11 pl-11 text-body-lg",
    icon: 20,
    iconOffset: "left-4",
    kbd: "px-2 py-1 text-small",
    kbdOffset: "right-3",
  },
  hero: {
    field: "h-16 pl-14 text-heading-3 sm:h-22 sm:pl-16",
    icon: 24,
    iconOffset: "left-5 sm:left-6",
    kbd: "px-3 py-2 text-body",
    kbdOffset: "right-4 sm:right-5",
  },
};

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** Keyboard hint rendered at the trailing edge. Pass null to hide it. */
  shortcut?: string | null;
  size?: SearchInputSize;
};

export function SearchInput({
  className,
  shortcut = "⌘ K",
  placeholder = "Search anything...",
  type = "search",
  size = "md",
  ...props
}: SearchInputProps) {
  const spec = searchSizes[size];

  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        size={spec.icon}
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-900",
          spec.iconOffset,
        )}
      />
      <input
        type={type}
        placeholder={placeholder}
        className={cn(field, spec.field, shortcut ? "pr-20" : undefined)}
        {...props}
      />
      {shortcut ? (
        <kbd
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-xs",
            "border border-neutral-200 bg-white font-medium text-neutral-500",
            spec.kbd,
            spec.kbdOffset,
          )}
        >
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(field, "h-11 appearance-none pr-11 text-body-lg")} {...props}>
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={20}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-900"
      />
    </div>
  );
}
