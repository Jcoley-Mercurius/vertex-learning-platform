import { Icon, type IconName } from "@/components/ui";

/**
 * The stats row at the top of My Learning: how much the learner has underway,
 * finished, and watched.
 *
 * Every number here is derived from the learner's progress against the
 * curriculum — nothing about progress is stored (AGENTS.md section 7).
 */
export function LearningSummary({
  stats,
}: {
  stats: { icon: IconName; value: string; label: string }[];
}) {
  return (
    <dl className="mt-8 grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-neutral-200 bg-white px-6 py-5 shadow-sm"
        >
          <dt className="flex items-center gap-2 text-body text-neutral-500">
            <Icon name={stat.icon} size={18} className="text-primary-500" />
            {stat.label}
          </dt>
          <dd className="mt-2 font-display text-heading-1 font-medium text-neutral-900">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
