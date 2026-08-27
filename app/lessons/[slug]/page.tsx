import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  LessonContent,
  LessonHero,
  LessonNav,
  LessonPlayer,
  LessonSidebar,
  LessonTabs,
  type AdjacentLesson,
  type LessonResource,
  type SidebarModule,
} from "@/components/lesson";
import { SiteHeader, ViewTracker, type CourseGlyphName } from "@/components/site";
import { Breadcrumbs } from "@/components/ui";
import { lessonLabel } from "@/lib/format";
import { parseVideoUrl, startSecondsFromParam } from "@/lib/video";
import { urlFor } from "@/sanity/lib/image";
import { LESSON_BY_SLUG_QUERY, LESSON_SLUGS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";

/**
 * The lesson page: the curriculum rail beside the lesson itself, with the video
 * playing on the site through the provider's own embed (AGENTS.md section 7).
 *
 * Read only. Everything is fetched server side with the private read token, and
 * the client components below receive plain props. Module numbers, the
 * `Lesson 5.1` label, and the previous/next links are all derived from the
 * course's curriculum order — none of them is stored.
 *
 * The page itself never reads the session, so it stays prerendered and renders
 * the progress zero state; the sidebar overlays the signed-in learner's
 * completion marks after hydration, and the player writes new progress through
 * `/api/progress`.
 */

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: LESSON_SLUGS_QUERY,
    perspective: "published",
    stega: false,
  });

  return (data ?? []).filter(Boolean).map((slug) => ({ slug }));
}

async function getLesson(slug: string) {
  const { data } = await sanityFetch({
    query: LESSON_BY_SLUG_QUERY,
    params: { slug },
    perspective: "published",
    stega: false,
  });

  return data;
}

export async function generateMetadata({
  params,
}: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLesson(slug);

  if (!lesson) return { title: "Lesson not found — Vertex" };

  return {
    title: `${lesson.title} — Vertex`,
    description: lesson.summary ?? undefined,
  };
}

export default async function LessonPage({
  params,
  searchParams,
}: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const { t } = await searchParams;
  const lesson = await getLesson(slug);

  /* A lesson with no owning course has no curriculum, so no label, breadcrumbs
     or navigation can be derived for it. */
  if (!lesson?.course) notFound();

  const course = lesson.course;
  const courseTitle = course.title ?? "Untitled course";
  const courseHref = course.slug ? `/courses/${course.slug}` : "/courses";
  const lessonTitle = lesson.title ?? "Untitled lesson";
  const durationSeconds = lesson.durationSeconds ?? 0;

  /* The curriculum, flattened once: the sidebar, the label, the breadcrumbs and
     the previous/next links all read positions out of the same walk. */
  const modules = (course.modules ?? []).map((module, moduleIndex) => ({
    _key: module._key,
    title: module.title ?? "Untitled module",
    moduleIndex,
    lessons: (module.lessons ?? []).map((item, lessonIndex) => ({
      _id: item._id,
      title: item.title ?? "Untitled lesson",
      slug: item.slug,
      durationSeconds: item.durationSeconds ?? 0,
      moduleIndex,
      lessonIndex,
    })),
  }));

  const flat = modules.flatMap((module) => module.lessons);
  const position = flat.findIndex((item) => item._id === lesson._id);
  const current = position >= 0 ? flat[position] : null;

  const label = current ? lessonLabel(current.moduleIndex, current.lessonIndex) : "Lesson";
  const moduleTitle = current ? modules[current.moduleIndex].title : null;

  const adjacent = (index: number): AdjacentLesson | null => {
    const item = flat[index];
    if (!item?.slug) return null;
    return {
      title: item.title,
      href: `/lessons/${item.slug}`,
      durationSeconds: item.durationSeconds,
    };
  };

  const previous = position > 0 ? adjacent(position - 1) : null;
  const next = position >= 0 && position < flat.length - 1 ? adjacent(position + 1) : null;

  /* The server-rendered zero state. `LessonSidebar` overlays the learner's own
     completions on top of this once `useProgress()` has loaded. */
  const sidebarModules: SidebarModule[] = modules.map((module) => ({
    _key: module._key,
    title: module.title,
    durationSeconds: module.lessons.reduce((total, item) => total + item.durationSeconds, 0),
    current: module.moduleIndex === current?.moduleIndex,
    completed: false,
    lessons: module.lessons.map((item) => ({
      _id: item._id,
      title: item.title,
      href: item.slug ? `/lessons/${item.slug}` : null,
      durationSeconds: item.durationSeconds,
      current: item._id === lesson._id,
      completed: false,
    })),
  }));

  const video = parseVideoUrl(lesson.videoUrl);
  const startSeconds = startSecondsFromParam(t, durationSeconds);

  const poster = lesson.poster?.asset
    ? urlFor(lesson.poster).width(1280).height(720).fit("crop").auto("format").url()
    : null;

  const resources: LessonResource[] = (lesson.resources ?? []).map((resource) => ({
    _key: resource._key,
    type: resource.type ?? null,
    title: resource.title ?? null,
    description: resource.description ?? null,
    url: resource.url ?? null,
  }));

  const analytics = {
    lessonId: lesson._id,
    lessonTitle,
    lessonLabel: label,
    courseTitle,
  };

  return (
    <>
      <SiteHeader />

      <ViewTracker
        event="lesson_viewed"
        properties={{
          lesson_id: lesson._id,
          lesson_title: lessonTitle,
          lesson_label: label,
          lesson_slug: slug,
          module_title: moduleTitle,
          course_id: course._id,
          course_title: courseTitle,
          course_slug: course.slug ?? null,
          free_preview: lesson.freePreview ?? false,
          duration_seconds: durationSeconds,
          has_video: video !== null,
          /* Arrived from a search result's "watch from 4:20". */
          deep_linked: startSeconds > 0,
          start_seconds: startSeconds,
        }}
      />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[936px] gap-9 px-6 pt-8 pb-16 lg:grid-cols-[17rem_1fr] lg:gap-9 lg:px-6">
          <aside className="lg:border-r lg:border-neutral-200 lg:pr-6">
            <LessonSidebar
              courseTitle={courseTitle}
              courseHref={courseHref}
              glyph={(course.glyph as CourseGlyphName | null) ?? "nextjs"}
              percentComplete={0}
              modules={sidebarModules}
            />
          </aside>

          <div className="min-w-0">
            <Breadcrumbs
              items={[
                { label: "All Courses", href: "/courses" },
                { label: courseTitle, href: courseHref },
                ...(moduleTitle ? [{ label: moduleTitle }] : []),
                { label: lessonTitle },
              ]}
              className="text-body"
            />

            <LessonHero
              lessonId={lesson._id}
              courseTitle={courseTitle}
              label={label}
              title={lessonTitle}
              summary={lesson.summary ?? null}
              durationSeconds={durationSeconds}
              level={course.level ?? null}
              studentCount={lesson.studentCount ?? null}
              freePreview={lesson.freePreview ?? false}
            />

            <LessonPlayer
              video={video}
              posterUrl={poster}
              posterLqip={lesson.poster?.asset?.metadata?.lqip ?? null}
              posterAlt={lesson.poster?.alt ?? lessonTitle}
              title={lessonTitle}
              startSeconds={startSeconds}
              durationSeconds={durationSeconds}
              analytics={analytics}
            />

            <LessonTabs
              lessonId={lesson._id}
              lessonTitle={lessonTitle}
              content={
                <LessonContent
                  summary={lesson.summary ?? null}
                  notes={lesson.notes ?? null}
                  keyPoints={(lesson.keyPoints ?? []).filter(Boolean)}
                  proTip={lesson.proTip ?? null}
                  resources={resources}
                />
              }
            />

            <LessonNav previous={previous} next={next} />
          </div>
        </div>
      </main>
    </>
  );
}
