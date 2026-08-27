import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { SanityLive } from "@/sanity/lib/live";
import { PostHogIdentify } from "@/components/site";
import { ProgressProvider } from "@/components/progress";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vertex",
  description:
    "A learning platform with search that takes you to the exact moment a topic is taught.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <PostHogIdentify />
          {/* Fetches the signed-in learner's progress once and shares it, so the
              prerendered pages below can overlay completion marks without any of
              them reading the session on the server. */}
          <ProgressProvider>{children}</ProgressProvider>
        </ClerkProvider>
        {/* Keeps content rendered from Sanity up to date without a refresh. */}
        <SanityLive />
      </body>
    </html>
  );
}