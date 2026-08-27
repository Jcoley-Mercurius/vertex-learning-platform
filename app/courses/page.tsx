import type { Metadata } from "next";

import { CourseCardProgress } from "@/components/course";
import { CourseGlyph, SiteHeader, ViewTracker } from "@/components/site";
import { CourseCard } from "@/components/ui";
import { formatDuration, formatLevel, pluralize } from "@/lib/format";
import { COURSES_CATALOG_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";

export const metadata: Metadata = {
  title: "All Courses — Vertex",
  description: "Every course on Vertex, newest thinking first.",
};

/**
 * The catalog. Read only, and deliberately plain: the same card, grid and type
 * the home page's "All Courses" section already uses, at full length.
 */
export default async function CoursesPage() {
  const { data } = await sanityFetch({
    query: COURSES_CATALOG_QUERY,
    perspective: "published",
    stega: false,
  });

  const courses = data ?? [];

  return (
    <>
      <SiteHeader />

      <ViewTracker event="catalog_viewed" properties={{ course_count: courses.length }} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[936px] px-6 pt-10 pb-24">
          <h1 className="font-display text-[2.25rem] leading-[1.15] font-bold text-neutral-900">
            All Courses
          </h1>
          <p className="mt-3 text-body-lg text-neutral-500">
            {courses.length > 0
              ? pluralize(courses.length, "course")
              : "No courses published yet."}
          </p>

          {courses.length > 0 ? (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    /* Renders nothing unless this learner has started the course. */
                    footer={<CourseCardProgress lessonIds={course.lessonIds ?? []} />}
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    </>
  );
}
