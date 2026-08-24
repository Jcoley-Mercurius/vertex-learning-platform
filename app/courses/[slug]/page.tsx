import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CourseCurriculum,
  CourseHero,
  CourseProgress,
  LearningOutcomes,
  type CurriculumModule,
} from "@/components/course";
import { AccentBars, SiteHeader } from "@/components/site";
import { Breadcrumbs } from "@/components/ui";
import { COURSE_BY_SLUG_QUERY, COURSE_SLUGS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";

/**
 * The course detail page. Read only: everything is fetched server side with the
 * private read token, and the one client component below it receives plain
 * props (AGENTS.md section 5).
 *
 * Nothing numbered here is stored. Module numbers, lesson labels and every
 * duration are derived from the order and contents of the curriculum.
 */

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: COURSE_SLUGS_QUERY,
    perspective: "published",
    stega: false,
  });

  return (data ?? []).filter(Boolean).map((slug) => ({ slug }));
}

async function getCourse(slug: string) {
  const { data } = await sanityFetch({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
    perspective: "published",
    stega: false,
  });

  return data;
}

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) return { title: "Course not found — Vertex" };

  return {
    title: `${course.title} — Vertex`,
    description: course.summary ?? undefined,
  };
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) notFound();

  const title = course.title ?? "Untitled course";

  const modules: CurriculumModule[] = (course.modules ?? []).map((module) => {
    const lessons = (module.lessons ?? []).map((lesson) => ({
      _id: lesson._id,
      title: lesson.title ?? "Untitled lesson",
      href: lesson.slug ? `/lessons/${lesson.slug}` : null,
      durationSeconds: lesson.durationSeconds ?? 0,
      freePreview: lesson.freePreview ?? false,
    }));

    return {
      _key: module._key,
      title: module.title ?? "Untitled module",
      summary: module.summary,
      durationSeconds: lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0),
      lessons,
    };
  });

  /* Where "Continue Learning" goes. With no progress recorded yet, that is the
     first lesson of the first module. */
  const firstLesson = modules.flatMap((module) => module.lessons).find((lesson) => lesson.href);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[936px] px-6 pt-10">
          <Breadcrumbs
            items={[{ label: "All Courses", href: "/courses" }, { label: title }]}
          />

          <CourseHero
            title={title}
            summary={course.summary}
            glyph={course.glyph}
            level={course.level}
            popular={course.popular ?? false}
            moduleCount={course.moduleCount}
            durationSeconds={course.durationSeconds}
            studentCount={course.studentCount}
            primaryHref={firstLesson?.href ?? undefined}
            primaryLabel="Start Learning"
          />

          <LearningOutcomes outcomes={course.learningOutcomes ?? []} />

          <CourseCurriculum modules={modules} durationSeconds={course.durationSeconds} />
        </div>

        <section className="relative mt-12">
          {/* The bar graphic bleeds off the bottom of the page, behind the band. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
            <AccentBars />
          </div>

          <div className="relative mx-auto w-full max-w-[936px] px-6 pb-24">
            <CourseProgress
              progress={null}
              href={firstLesson?.href ?? undefined}
              label="Start Learning"
            />
          </div>
        </section>
      </main>
    </>
  );
}
