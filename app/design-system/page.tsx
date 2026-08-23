import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Badge,
  Breadcrumbs,
  Button,
  CourseCard,
  Icon,
  LessonCard,
  LessonVideoCard,
  Logo,
  Navbar,
  Pagination,
  ProgressBar,
  ResourceCard,
  SearchInput,
  Select,
  StatusIndicator,
  type ButtonVariant,
  type IconName,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Design System — Vertex",
  description:
    "A unified design language for Vertex learning platform. Clean, modern and focused on clarity, consistency and intuitive learning experiences.",
};

function Panel({
  number,
  title,
  children,
  className,
}: {
  number: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-neutral-200 bg-white p-6 sm:p-8 ${className ?? ""}`}
    >
      <h2 className="flex items-center gap-4 text-small font-bold tracking-[0.15em] uppercase">
        <span className="text-primary-500">{number}</span>
        <span className="text-neutral-900">{title}</span>
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-body-lg font-semibold text-neutral-900">{children}</h3>
  );
}

const primaryColors = [
  { name: "Primary 500", hex: "#F97316", className: "bg-primary-500" },
  { name: "Primary 400", hex: "#FB923C", className: "bg-primary-400" },
  { name: "Primary 300", hex: "#FDBA74", className: "bg-primary-300" },
  { name: "Primary 200", hex: "#FED7AA", className: "bg-primary-200" },
  { name: "Primary 100", hex: "#FFEEE5", className: "bg-primary-100" },
];

const neutralColors = [
  { name: "Neutral 900", hex: "#0F172A", className: "bg-neutral-900" },
  { name: "Neutral 700", hex: "#334155", className: "bg-neutral-700" },
  { name: "Neutral 500", hex: "#64748B", className: "bg-neutral-500" },
  { name: "Neutral 300", hex: "#CBD5E1", className: "bg-neutral-300" },
  { name: "Neutral 200", hex: "#E2E8F0", className: "bg-neutral-200" },
  { name: "Neutral 100", hex: "#F1F5F9", className: "bg-neutral-100" },
  { name: "Neutral 50", hex: "#FAFAFC", className: "bg-neutral-50" },
  { name: "White", hex: "#FFFFFF", className: "bg-white" },
];

const typeScale = [
  { style: "Display 1", font: "Playfair Display", size: "48 / 56", weight: "Bold", use: "Page titles", className: "font-display text-display-1 font-bold" },
  { style: "Display 2", font: "Playfair Display", size: "36 / 44", weight: "Bold", use: "Section titles", className: "font-display text-display-2 font-bold" },
  { style: "Heading 1", font: "Inter", size: "28 / 36", weight: "Semi Bold", use: "Card titles", className: "text-heading-1 font-semibold" },
  { style: "Heading 2", font: "Inter", size: "22 / 30", weight: "Semi Bold", use: "Sub section", className: "text-heading-2 font-semibold" },
  { style: "Heading 3", font: "Inter", size: "18 / 26", weight: "Medium", use: "Small titles", className: "text-heading-3 font-medium" },
  { style: "Body Large", font: "Inter", size: "16 / 24", weight: "Regular", use: "Body copy", className: "text-body-lg" },
  { style: "Body", font: "Inter", size: "14 / 20", weight: "Regular", use: "Supporting text", className: "text-body" },
  { style: "Small", font: "Inter", size: "12 / 16", weight: "Regular", use: "Captions, meta", className: "text-small" },
];

const spacingScale = [
  { px: 4, rem: "0.25rem" },
  { px: 8, rem: "0.5rem" },
  { px: 12, rem: "0.75rem" },
  { px: 16, rem: "1rem" },
  { px: 24, rem: "1.5rem" },
  { px: 32, rem: "2rem" },
  { px: 40, rem: "2.5rem" },
  { px: 48, rem: "3rem" },
  { px: 64, rem: "4rem" },
];

const radii = [
  { label: "4px", token: "xs", className: "rounded-xs" },
  { label: "8px", token: "sm", className: "rounded-sm" },
  { label: "12px", token: "md", className: "rounded-md" },
  { label: "16px", token: "lg", className: "rounded-lg" },
  { label: "24px", token: "xl", className: "rounded-xl" },
  { label: "Full", token: "circle", className: "rounded-full" },
];

const shadows = [
  { name: "Sm", spec: ["0 1px 2px 0", "rgba(15, 23, 42, 0.05)"], className: "shadow-sm" },
  { name: "Md", spec: ["0 4px 12px -2px", "rgba(15, 23, 42, 0.08)"], className: "shadow-md" },
  { name: "Lg", spec: ["0 12px 24px -4px", "rgba(15, 23, 42, 0.10)"], className: "shadow-lg" },
  { name: "Xl", spec: ["0 20px 40px -8px", "rgba(15, 23, 42, 0.12)"], className: "shadow-xl" },
];

const iconRow: IconName[] = [
  "bell",
  "search",
  "play-circle",
  "file-text",
  "bookmark",
  "bar-chart",
  "clock",
  "user",
  "chevron-right",
];

const buttonColumns: { variant: ButtonVariant; label: string; children: ReactNode }[] = [
  { variant: "primary", label: "Primary", children: "Get Started" },
  { variant: "secondary", label: "Secondary", children: "Explore Courses" },
  {
    variant: "tertiary",
    label: "Tertiary",
    children: (
      <>
        View Lesson
        <Icon name="external-link" size={18} />
      </>
    ),
  },
  {
    variant: "text",
    label: "Text",
    children: (
      <>
        Watch Video
        <Icon name="play-circle" size={18} />
      </>
    ),
  },
];

/** Static classes that pin each variant to its hover appearance, for the spec sheet. */
const hoverPreview: Record<ButtonVariant, string> = {
  primary: "bg-[#ea580c]",
  secondary: "bg-primary-100",
  tertiary: "bg-neutral-100",
  text: "text-[#ea580c]",
};

const principles = [
  { icon: "eye", title: "Clarity First", body: "Every element should communicate clearly." },
  { icon: "grid", title: "Consistency", body: "Use components and patterns consistently across the platform." },
  { icon: "target", title: "Focus & Calm", body: "Remove noise and help learners focus on what matters." },
  { icon: "accessibility", title: "Accessible", body: "Design with accessibility and inclusivity in mind." },
] satisfies { icon: IconName; title: string; body: string }[];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-4">
        {/* Masthead + 01 Colors */}
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
            <Logo markSize={32} />
            <h1 className="mt-8 font-display text-display-1 font-bold text-neutral-900">
              Design System
            </h1>
            <p className="mt-4 max-w-sm text-body-lg text-neutral-500">
              A unified design language for Vertex learning platform. Clean, modern and
              focused on clarity, consistency and intuitive learning experiences.
            </p>
            <p className="mt-8 text-small font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Version 1.0 &nbsp;&middot;&nbsp; May 2025
            </p>
          </section>

          <Panel number="01" title="Colors">
            <SubLabel>Primary</SubLabel>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {primaryColors.map((c) => (
                <li key={c.name}>
                  <div className={`h-16 rounded-sm shadow-sm ${c.className}`} />
                  <p className="mt-3 text-body text-neutral-900">{c.name}</p>
                  <p className="text-body text-neutral-500">{c.hex}</p>
                </li>
              ))}
            </ul>

            <SubLabel>
              <span className="mt-8 block">Neutral</span>
            </SubLabel>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {neutralColors.map((c) => (
                <li key={c.name}>
                  <div
                    className={`h-16 rounded-sm border border-neutral-200 ${c.className}`}
                  />
                  <p className="mt-3 text-small text-neutral-900">{c.name}</p>
                  <p className="text-small text-neutral-500">{c.hex}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* 02 Typography + 03 Type scale */}
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Panel number="02" title="Typography">
            <div className="grid gap-8">
              <div className="flex items-center gap-8">
                <span className="font-display text-[64px] leading-none font-bold text-neutral-900">
                  Ag
                </span>
                <div>
                  <p className="text-heading-3 font-medium text-neutral-900">
                    Playfair Display
                  </p>
                  <p className="mt-1 text-body text-neutral-500">
                    Elegant &nbsp;&middot;&nbsp; Readable &nbsp;&middot;&nbsp; Timeless
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-[64px] leading-none font-semibold text-neutral-900">
                  Ag
                </span>
                <div>
                  <p className="text-heading-3 font-medium text-neutral-900">Inter</p>
                  <p className="mt-1 text-body text-neutral-500">
                    Clean &nbsp;&middot;&nbsp; Modern &nbsp;&middot;&nbsp; Highly legible
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel number="03" title="Type Scale">
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-body-lg text-neutral-500">
                    <th scope="col" className="pb-4 font-normal">Style</th>
                    <th scope="col" className="pb-4 font-normal">Font</th>
                    <th scope="col" className="pb-4 font-normal">Size / Line Height</th>
                    <th scope="col" className="pb-4 font-normal">Weight</th>
                    <th scope="col" className="pb-4 font-normal">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {typeScale.map((row) => (
                    <tr key={row.style} className="align-middle">
                      <th scope="row" className="py-2 pr-6 text-left">
                        <span
                          className={`${row.className} text-neutral-900`}
                          style={{ fontSize: "20px", lineHeight: "28px" }}
                        >
                          {row.style}
                        </span>
                      </th>
                      <td className="py-2 pr-6 text-body-lg text-neutral-500">{row.font}</td>
                      <td className="py-2 pr-6 text-body-lg text-neutral-500">{row.size}</td>
                      <td className="py-2 pr-6 text-body-lg text-neutral-500">{row.weight}</td>
                      <td className="py-2 text-body-lg text-neutral-500">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* 04 Spacing + 05 Radius & shadows */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel number="04" title="Spacing System">
            <p className="text-body-lg text-neutral-900">Base unit: 4px</p>
            <ul className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-6">
              {spacingScale.map((s) => (
                <li key={s.px} className="text-center">
                  <div
                    className="mx-auto rounded-xs bg-primary-200"
                    style={{ width: s.px, height: s.px }}
                  />
                  <p className="mt-3 text-body font-semibold text-neutral-900">{s.px}</p>
                  <p className="text-small text-neutral-500">({s.rem})</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel number="05" title="Radius & Shadows">
            <SubLabel>Radius</SubLabel>
            <ul className="mt-4 flex flex-wrap gap-6">
              {radii.map((r) => (
                <li key={r.token} className="text-center">
                  <div
                    className={`h-14 w-14 border border-neutral-300 bg-white ${r.className}`}
                  />
                  <p className="mt-3 text-body text-neutral-900">{r.label}</p>
                  <p className="text-small text-neutral-500">({r.token})</p>
                </li>
              ))}
            </ul>

            <SubLabel>
              <span className="mt-8 block">Shadows</span>
            </SubLabel>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {shadows.map((s) => (
                <li
                  key={s.name}
                  className={`rounded-sm border border-neutral-100 bg-white p-4 ${s.className}`}
                >
                  <p className="text-heading-3 font-semibold text-neutral-900">{s.name}</p>
                  <p className="mt-3 text-small text-neutral-500">{s.spec[0]}</p>
                  <p className="text-small text-neutral-500">{s.spec[1]}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* 06 Icons + 07 Buttons + 08 Inputs */}
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr_1fr]">
          <Panel number="06" title="Icons">
            <SubLabel>Outline Style</SubLabel>
            <ul className="mt-4 flex flex-wrap gap-4 text-neutral-900">
              {iconRow.map((name) => (
                <li key={name}>
                  <Icon name={name} title={name} />
                </li>
              ))}
            </ul>

            <SubLabel>
              <span className="mt-8 block">Filled Style</span>
            </SubLabel>
            <ul className="mt-4 flex flex-wrap gap-4 text-neutral-900">
              {iconRow.map((name) => (
                <li key={name}>
                  <Icon name={name} variant="filled" title={`${name} filled`} />
                </li>
              ))}
            </ul>

            <SubLabel>
              <span className="mt-8 block">Icon Specs</span>
            </SubLabel>
            <ul className="mt-4 list-disc pl-5 text-body-lg text-neutral-500 marker:text-neutral-300">
              <li>24x24px grid</li>
              <li>2px stroke width (outline)</li>
              <li>Rounded line caps</li>
              <li>Consistent optical balance</li>
            </ul>
          </Panel>

          <Panel number="07" title="Buttons">
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="text-body-lg text-neutral-500">
                    <th scope="col" className="pb-4 font-normal" />
                    {buttonColumns.map((col) => (
                      <th key={col.variant} scope="col" className="pb-4 pr-4 font-normal">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["Default", "Hover", "Disabled"] as const).map((state) => (
                    <tr key={state}>
                      <th
                        scope="row"
                        className="py-2 pr-6 text-left text-body-lg font-normal text-neutral-900"
                      >
                        {state}
                      </th>
                      {buttonColumns.map((col) => (
                        <td key={col.variant} className="py-2 pr-4">
                          <Button
                            variant={col.variant}
                            disabled={state === "Disabled"}
                            className={
                              state === "Hover" ? hoverPreview[col.variant] : undefined
                            }
                          >
                            {col.children}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubLabel>
              <span className="mt-8 block">Button Specs</span>
            </SubLabel>
            <ul className="mt-4 list-disc pl-5 text-body-lg text-neutral-500 marker:text-neutral-300">
              <li>Height: 44px (default)</li>
              <li>Padding: 0 16px (lg), 0 12px (md)</li>
              <li>Radius: 12px</li>
              <li>Font: Inter Medium (14&ndash;16px)</li>
            </ul>
          </Panel>

          <Panel number="08" title="Inputs">
            <label htmlFor="ds-search" className="block text-body-lg text-neutral-500">
              Search / Text Input
            </label>
            <SearchInput id="ds-search" className="mt-4" />

            <label
              htmlFor="ds-sort"
              className="mt-8 block text-body-lg text-neutral-500"
            >
              Select
            </label>
            <Select id="ds-sort" className="mt-4" defaultValue="relevant">
              <option value="relevant">Most Relevant</option>
              <option value="recent">Most Recent</option>
              <option value="duration">Shortest First</option>
            </Select>

            <SubLabel>
              <span className="mt-8 block">Field Specs</span>
            </SubLabel>
            <ul className="mt-4 list-disc pl-5 text-body-lg text-neutral-500 marker:text-neutral-300">
              <li>Height: 44px</li>
              <li>Radius: 12px</li>
              <li>Border: 1px solid #E2E8F0</li>
              <li>Padding: 0 16px</li>
              <li>Focus: Border color #FB923C</li>
            </ul>
          </Panel>
        </div>

        {/* 09 Badges + 10 Status + 11 Progress */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel number="09" title="Badges / Tags">
            <ul className="flex flex-wrap gap-10">
              {(
                [
                  { label: "Video", tone: "video" },
                  { label: "Lesson", tone: "lesson" },
                  { label: "Popular", tone: "popular" },
                ] as const
              ).map((b) => (
                <li key={b.tone}>
                  <p className="text-body text-neutral-500">{b.label}</p>
                  <Badge tone={b.tone} className="mt-3">
                    {b.label}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel number="10" title="Status / Indicators">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-4">
              {(["in-progress", "completed", "now-playing", "locked"] as const).map((s) => (
                <li key={s}>
                  <StatusIndicator status={s} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel number="11" title="Progress Bar">
            <ProgressBar value={35} />
          </Panel>
        </div>

        {/* 12 Cards */}
        <Panel number="12" title="Cards">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="mb-3 text-body text-neutral-500">Course Card</p>
              <CourseCard
                title="Next.js for Production"
                description="Build scalable, high-performance web applications with Next.js."
                level="Intermediate"
                duration="18h 24m"
                modules="12 modules"
                icon="N"
              />
            </div>
            <div>
              <p className="mb-3 text-body text-neutral-500">Lesson Card (Video)</p>
              <LessonVideoCard
                title="Data Fetching in Server Components"
                description="Learn how to fetch data on the server using async/await and Next.js best practices."
                lessonLabel="Lesson 5.1"
                clipLength="12:45"
                watchFrom="12:45"
              />
            </div>
            <div>
              <p className="mb-3 text-body text-neutral-500">Lesson Card (Lesson)</p>
              <LessonCard
                title="Data Fetching & Caching"
                description="Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance."
                moduleLabel="Module 5"
              />
            </div>
            <div>
              <p className="mb-3 text-body text-neutral-500">Resource Card</p>
              <ResourceCard
                title="Caching and Revalidation Guide"
                description="Deep dive into Next.js caching strategies."
                fileType="PDF"
                fileSize="1.2 MB"
              />
            </div>
          </div>
        </Panel>

        {/* 13 Navigation */}
        <Panel number="13" title="Navigation">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            <Navbar
              links={[
                { label: "Courses", href: "/courses", active: true },
                { label: "My Learning", href: "/my-learning" },
              ]}
            />
            <div>
              <p className="mb-3 text-body text-neutral-500">Breadcrumbs</p>
              <Breadcrumbs
                items={[
                  { label: "All Courses", href: "/courses" },
                  { label: "Next.js for Production", href: "/courses/nextjs-for-production" },
                  { label: "Data Fetching & Caching" },
                ]}
              />
            </div>
            <div>
              <p className="mb-3 text-body text-neutral-500">Pagination</p>
              <Pagination pages={[1, 2, 3, "...", 8]} current={1} />
            </div>
          </div>
        </Panel>

        {/* 14 Principles */}
        <Panel number="14" title="Principles">
          <ul className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {principles.map((p) => (
              <li key={p.title} className="flex items-start gap-4">
                <Icon name={p.icon} size={28} className="mt-1 text-neutral-900" />
                <div>
                  <p className="text-body-lg font-semibold text-neutral-900">{p.title}</p>
                  <p className="mt-1 text-body text-neutral-500">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
