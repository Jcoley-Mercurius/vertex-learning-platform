import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

/**
 * Field specs: height 44px, radius 12px, border 1px solid #E2E8F0,
 * padding 0 16px, focus border color #FB923C.
 */

const field =
  "h-11 w-full rounded-md border border-neutral-200 bg-white px-4 text-body-lg " +
  "text-neutral-900 transition-colors outline-none " +
  "placeholder:text-neutral-500 focus:border-primary-400";

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Keyboard hint rendered at the trailing edge. Pass null to hide it. */
  shortcut?: string | null;
};

export function SearchInput({
  className,
  shortcut = "⌘ K",
  placeholder = "Search anything...",
  type = "search",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        size={20}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-900"
      />
      <input
        type={type}
        placeholder={placeholder}
        className={cn(field, "pl-11", shortcut ? "pr-20" : undefined)}
        {...props}
      />
      {shortcut ? (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-xs border border-neutral-200 bg-white px-2 py-1 text-small font-medium text-neutral-500"
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
      <select className={cn(field, "appearance-none pr-11")} {...props}>
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
