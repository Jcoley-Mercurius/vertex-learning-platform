import Link from "next/link";
import { AccentBars, CourseGlyph, SiteHeader, type CourseGlyphName } from "@/components/site";
import { CourseCard, Icon, SearchInput, buttonClassName } from "@/components/ui";

/**
 * Placeholder catalog. Sanity is not wired yet — this is the seam a GROQ query
 * replaces, so the shape mirrors the course fields the model will return.
 */
const courses: Array<{
  slug: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  glyph: CourseGlyphName;
}> = [
  {
    slug: "nextjs-for-production",
    title: "Next.js for Production",
    description: "Build scalable, high-performance web applications with Next.js.",
    level: "Intermediate",
    duration: "18h 24m",
    modules: "12 modules",
    glyph: "nextjs",
  },
  {
    slug: "docker-essentials",
    title: "Docker Essentials",
    description: "Containerize applications and streamline your development workflow.",
    level: "Beginner",
    duration: "10h 12m",
    modules: "8 modules",
    glyph: "docker",
  },
  {
    slug: "typescript-deep-dive",
    title: "TypeScript Deep Dive",
    description: "Go beyond the basics and write safer, more expressive code.",
    level: "Intermediate",
    duration: "14h 36m",
    modules: "10 modules",
    glyph: "typescript",
  },
];

export default function Home() {
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
                <li key={course.slug} className="flex">
                  <CourseCard
                    orientation="stacked"
                    href={`/courses/${course.slug}`}
                    title={course.title}
                    description={course.description}
                    level={course.level}
                    duration={course.duration}
                    modules={course.modules}
                    icon={<CourseGlyph name={course.glyph} />}
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

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
