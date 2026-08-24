import Link from "next/link";
import { AccentBars, CourseGlyph, SiteHeader } from "@/components/site";
import { CourseCard, Icon, SearchInput, buttonClassName } from "@/components/ui";
import { formatDuration, formatLevel, pluralize } from "@/lib/format";
import { COURSES_CATALOG_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";

/** The reference shows three cards; the rest of the catalog lives behind "View all courses". */
const FEATURED_COURSES = 3;

export default async function Home() {
  /* Published, un-stega'd content: the page is read only and never previews drafts. */
  const { data } = await sanityFetch({
    query: COURSES_CATALOG_QUERY,
    perspective: "published",
    stega: false,
  });
  const courses = (data ?? []).slice(0, FEATURED_COURSES);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-neutral-200 px-10 pt-16 pb-14">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center text-center">
            <p className="inline-flex h-11 items-center rounded-sm border border-neutral-200 bg-white px-5 text-small font-semibold tracking-[0.15em] text-primary-500 uppercase">
              Intelligent Learning
            </p>

            <h1 className="mt-5 max-w-[720px] font-display text-[2.5rem] leading-[1.2] font-bold text-balance text-neutral-900 sm:text-[3.75rem] sm:leading-[74px]">
              Search your learning in plain English.
            </h1>

            <p className="mt-6 max-w-[460px] text-heading-3 text-neutral-700 sm:text-[1.1875rem] sm:leading-[33px]">
              Vertex understands what you want to learn and finds the exact lessons across all
              your courses.
            </p>

            <Link
              href="/courses"
              className={buttonClassName({ size: "hero", className: "mt-10" })}
            >
              Explore Courses
              <Icon name="arrow-right" size={20} />
            </Link>

            <form action="/search" role="search" className="mt-10 w-full max-w-[960px]">
              <label htmlFor="site-search" className="sr-only">
                Ask anything about your learning
              </label>
              <SearchInput
                id="site-search"
                name="q"
                size="hero"
                placeholder="Ask anything about your learning..."
                className="shadow-sm"
              />
            </form>
          </div>
        </section>

        {courses.length > 0 ? (
        <section className="px-10 pt-12 pb-14">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-[1.875rem] leading-[38px] font-bold text-neutral-900">
                All Courses
              </h2>
              <Link
                href="/courses"
                className="inline-flex items-center gap-3 rounded-xs text-body-lg font-medium text-primary-500 transition-colors hover:text-[#ea580c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400"
              >
                View all courses
                <Icon name="arrow-right" size={20} />
              </Link>
            </div>

            <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course._id} className="flex">
                  <CourseCard
                    orientation="stacked"
                    href={`/courses/${course.slug}`}
                    title={course.title ?? "Untitled course"}
                    description={course.summary ?? ""}
                    level={formatLevel(course.level)}
                    duration={formatDuration(course.durationSeconds)}
                    modules={pluralize(course.moduleCount, "module")}
                    icon={<CourseGlyph name={course.glyph ?? "nextjs"} />}
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
        ) : null}

        <section className="overflow-hidden">
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-10">
            <span aria-hidden className="h-px flex-1 bg-neutral-200" />
            <p className="flex items-center gap-4 text-body-lg text-neutral-700">
              <Icon name="star" size={22} className="text-primary-500" />
              New courses and lessons added every week.
            </p>
            <span aria-hidden className="h-px flex-1 bg-neutral-200" />
          </div>
          <AccentBars />
        </section>
      </main>
    </>
  );
}
