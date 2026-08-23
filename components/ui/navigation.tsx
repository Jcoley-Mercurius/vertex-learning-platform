import Link from "next/link";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Logo } from "./logo";

export type NavLink = { label: string; href: string; active?: boolean };

export function Navbar({
  links,
  className,
}: {
  links: NavLink[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Main"
      className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", className)}
    >
      <Link href="/" className="rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400">
        <Logo />
      </Link>
      <ul className="flex items-center gap-8">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              className={cn(
                "rounded-xs text-body-lg font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400",
                link.active
                  ? "text-primary-500"
                  : "text-neutral-900 hover:text-primary-500",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-body-lg">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {last || !item.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "text-neutral-500" : "text-neutral-900"}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-xs text-neutral-900 transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400"
                >
                  {item.label}
                </Link>
              )}
              {last ? null : (
                <Icon name="chevron-right" size={16} className="text-neutral-300" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Page entries: a number, or "..." for a gap. */
export type PageItem = number | "...";

export function Pagination({
  pages,
  current,
  className,
}: {
  pages: PageItem[];
  current: number;
  className?: string;
}) {
  const cell =
    "flex h-9 min-w-9 items-center justify-center rounded-xs px-2 text-body-lg transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400";

  return (
    <nav aria-label="Pagination" className={className}>
      <ol className="flex items-center gap-1">
        <li>
          <button
            type="button"
            aria-label="Previous page"
            disabled={current <= 1}
            className={cn(cell, "text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-300 disabled:hover:bg-transparent")}
          >
            <Icon name="chevron-left" size={18} />
          </button>
        </li>
        {pages.map((page, i) =>
          page === "..." ? (
            <li key={`gap-${i}`} aria-hidden className={cn(cell, "text-neutral-500")}>
              &hellip;
            </li>
          ) : (
            <li key={page}>
              <button
                type="button"
                aria-current={page === current ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={cn(
                  cell,
                  page === current
                    ? "border border-primary-500 text-primary-500"
                    : "text-neutral-900 hover:bg-neutral-100",
                )}
              >
                {page}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label="Next page"
            className={cn(cell, "text-neutral-900 hover:bg-neutral-100")}
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      </ol>
    </nav>
  );
}
