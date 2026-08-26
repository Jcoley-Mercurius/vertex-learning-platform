import type { PortableTextProps } from "@portabletext/react";

import { PortableText } from "@/components/portable-text";
import { Icon } from "@/components/ui";

export type LessonResource = {
  _key: string;
  type: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
};

/** The resource icon follows the stored `type`, the only hint the schema gives. */
const resourceIcons: Record<string, "file-text" | "code" | "file" | "folder"> = {
  pdf: "file-text",
  code: "code",
  documentation: "file-text",
  download: "folder",
  link: "file",
};

/**
 * The `Lesson Content` panel: Overview, "In this lesson you will:", the Pro Tip
 * panel and Resources — every section omitted when the lesson has no data for
 * it, rather than stubbed out.
 */
export function LessonContent({
  summary,
  notes,
  keyPoints,
  proTip,
  resources,
}: {
  summary: string | null;
  notes: PortableTextProps["value"] | null;
  keyPoints: string[];
  proTip: string | null;
  resources: LessonResource[];
}) {
  const hasOverview = Boolean(notes) || Boolean(summary);

  return (
    <div className="pt-9">
      {hasOverview ? (
        <section>
          <h2 className="font-display text-heading-2 font-medium text-neutral-900">Overview</h2>
          <div className="mt-4">
            {notes ? (
              <PortableText value={notes} />
            ) : (
              <p className="text-body-lg leading-[1.9] text-neutral-700">{summary}</p>
            )}
          </div>
        </section>
      ) : null}

      {keyPoints.length > 0 ? (
        <section className="mt-9 border-t border-neutral-200 pt-9">
          <h3 className="text-body-lg font-semibold text-neutral-900">In this lesson you will:</h3>
          <ul className="mt-5 space-y-4">
            {keyPoints.map((point) => (
              <li key={point} className="flex items-start gap-4">
                <Icon
                  name="check-circle"
                  size={20}
                  className="mt-0.5 shrink-0 text-primary-500"
                />
                <span className="text-body-lg text-neutral-700">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {proTip ? (
        <section className="mt-8 rounded-lg bg-primary-100 p-6">
          <div className="flex items-start gap-4">
            <Icon name="lightbulb" size={24} className="mt-0.5 shrink-0 text-primary-500" />
            <div className="min-w-0">
              <h3 className="font-display text-heading-3 font-medium text-neutral-900">Pro Tip</h3>
              <p className="mt-2 text-body-lg leading-[1.8] text-neutral-700">{proTip}</p>
            </div>
          </div>
        </section>
      ) : null}

      {resources.length > 0 ? (
        <section className="mt-9 border-t border-neutral-200 pt-9">
          <h2 className="font-display text-heading-2 font-medium text-neutral-900">Resources</h2>
          {/* Width-aware rather than viewport-aware: the lesson column is much
              narrower than the page, so a viewport breakpoint would keep forcing
              two columns at widths where a resource title has no room to wrap
              cleanly. auto-fit drops to one card per row instead. */}
          <ul className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-5">
            {resources.map((resource) => (
              <li key={resource._key}>
                <ResourceLink resource={resource} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * The reference's resource card: an icon tile, a two-line title, a short
 * description and the external-link glyph. The shipped `ResourceCard` is not
 * reused because it requires a file type and size the `resource` schema does
 * not store.
 */
function ResourceLink({ resource }: { resource: LessonResource }) {
  const icon = resourceIcons[resource.type ?? "link"] ?? "file";
  const title = resource.title ?? "Untitled resource";

  /* The title row and the description are separate blocks rather than one text
     column beside the icon: at this column width, sharing the row with the icon
     tile squeezed the copy to a word a line.

     The title carries `break-words` but deliberately not `text-balance`. The two
     together let the balancer settle on an extremely narrow measure — it is free
     to break mid-word, so it does — which is what shattered a title like "Claude
     API documentation" into one character per line.

     The external-link glyph sits with the description rather than in the title
     row, as the reference draws it, so the title gets the full width beside the
     icon. */
  const body = (
    <>
      <span className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary-100 text-primary-500">
          <Icon name={icon} size={20} />
        </span>
        <span className="min-w-0 flex-1 text-body-lg leading-snug font-medium break-words text-neutral-900">
          {title}
        </span>
      </span>

      {resource.description || resource.url ? (
        <span className="mt-3 flex items-end justify-between gap-3">
          <span className="min-w-0 flex-1 text-body break-words text-neutral-500">
            {resource.description}
          </span>
          {/* Only a card that actually links out gets the glyph. */}
          {resource.url ? (
            <Icon name="external-link" size={18} className="shrink-0 text-primary-500" />
          ) : null}
        </span>
      ) : null}
    </>
  );

  const shell = "block h-full rounded-lg border border-neutral-200 bg-white p-5";

  if (!resource.url) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`${shell} transition-colors hover:border-primary-300 hover:bg-primary-100/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400`}
    >
      {body}
    </a>
  );
}
