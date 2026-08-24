import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Icon, Logo, buttonClassName, cn } from "@/components/ui";

const links = [
  { label: "Courses", href: "/courses" },
  { label: "My Learning", href: "/my-learning" },
];

const focusRing =
  "rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400";

/**
 * The site header from the home reference: logo, primary links, notification bell,
 * and the account controls. The bell is presentational for now — notifications have
 * no backend. The avatar slot holds Clerk's UserButton when signed in, and the sign
 * in / sign up buttons when signed out.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex min-h-24 w-full max-w-[936px] flex-wrap items-center gap-x-14 gap-y-4 px-6 py-4">
        <Link href="/" className={focusRing} aria-label="Vertex home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex items-center gap-10">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    focusRing,
                    "text-body-lg font-medium text-neutral-900 transition-colors hover:text-primary-500",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <button
            type="button"
            aria-label="Notifications"
            className={cn(
              focusRing,
              "text-neutral-900 transition-colors hover:text-primary-500",
            )}
          >
            <Icon name="bell" size={24} />
          </button>

          <Show when="signed-out">
            <div className="flex flex-shrink-0 items-center gap-3">
              <SignInButton mode="modal">
                <button type="button" className={buttonClassName({ variant: "tertiary", size: "md", className: "whitespace-nowrap" })}>
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" className={buttonClassName({ variant: "primary", size: "md", className: "whitespace-nowrap" })}>
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </Show>

          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-12 w-12",
                  userButtonTrigger:
                    "rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
