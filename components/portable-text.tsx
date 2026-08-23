import Image from "next/image";
import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextProps,
} from "@portabletext/react";

import { urlFor } from "@/sanity/lib/image";
import { cn } from "@/components/ui";

type PortableTextImage = {
  alt?: string;
  asset?: { _id?: string; url?: string; metadata?: { lqip?: string } };
};

/**
 * Notes and bios are stored as Portable Text, so every block is styled here with
 * the design system tokens rather than a typography plugin. The plugin's defaults
 * reach for Tailwind's built-in gray scale, which `globals.css` resets away.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-body-lg text-neutral-700 [&:not(:first-child)]:mt-4">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="font-display text-heading-1 text-neutral-900 [&:not(:first-child)]:mt-8">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-heading-3 font-semibold text-neutral-900 [&:not(:first-child)]:mt-6">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary-500 pl-4 text-body-lg text-neutral-700 italic [&:not(:first-child)]:mt-6">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-5 text-body-lg text-neutral-700">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-body-lg text-neutral-700">{children}</ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-neutral-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded-xs bg-neutral-100 px-1.5 py-0.5 font-mono text-body text-neutral-900">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : undefined;
      if (!href) return <>{children}</>;
      const external = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          className="text-primary-500 underline underline-offset-2 hover:text-primary-400"
          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }: { value: PortableTextImage }) => {
      if (!value?.asset) return null;
      return (
        <figure className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
          <Image
            src={urlFor(value).width(1200).fit("max").auto("format").url()}
            alt={value.alt ?? ""}
            width={1200}
            height={675}
            className="h-auto w-full"
            placeholder={value.asset.metadata?.lqip ? "blur" : undefined}
            blurDataURL={value.asset.metadata?.lqip}
          />
        </figure>
      );
    },
    codeBlock: ({ value }: { value: { language?: string; code?: string } }) => {
      if (!value?.code) return null;
      return (
        <pre className="mt-6 overflow-x-auto rounded-md bg-neutral-900 p-4 text-body text-white">
          <code>{value.code}</code>
        </pre>
      );
    },
  },
};

export function PortableText({
  value,
  className,
}: {
  value: PortableTextProps["value"];
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn(className)}>
      <PortableTextRenderer value={value} components={components} />
    </div>
  );
}
