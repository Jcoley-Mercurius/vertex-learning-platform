import { Icon, iconNames, type IconName } from "@/components/ui";

/** Outcome icons are authored from the Icon set, but content can still drift. */
function outcomeIcon(icon: string | null): IconName {
  return iconNames.includes(icon as IconName) ? (icon as IconName) : "target";
}

export type LearningOutcome = {
  _key: string;
  icon: string | null;
  title: string | null;
  description: string | null;
};

/**
 * The "What you'll learn" band: a bordered card holding a two-up grid of
 * outcomes. The icon is authored in Sanity from the same list the Icon
 * component implements, so it maps straight across.
 */
export function LearningOutcomes({ outcomes }: { outcomes: LearningOutcome[] }) {
  if (outcomes.length === 0) return null;

  return (
    <section className="mt-14 rounded-lg border border-neutral-200 bg-white p-7">
      <h2 className="font-display text-heading-1 font-medium text-neutral-900">
        What you&rsquo;ll learn
      </h2>

      <ul className="mt-6 grid gap-6 md:grid-cols-2">
        {outcomes.map((outcome) => (
          <li
            key={outcome._key}
            className="flex items-start gap-6 rounded-md border border-neutral-200 p-6"
          >
            <Icon
              name={outcomeIcon(outcome.icon)}
              size={34}
              className="mt-1 shrink-0 text-primary-500"
            />
            <div className="min-w-0">
              <h3 className="font-display text-heading-2 font-medium text-neutral-900">
                {outcome.title}
              </h3>
              {outcome.description ? (
                <p className="mt-2 text-body-lg leading-[1.7] text-neutral-500">
                  {outcome.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
