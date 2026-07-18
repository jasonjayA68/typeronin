import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/shared/components/ui/sonner";
import { AppProviders } from "@/shared/providers/app-providers";

import "./globals.css";

/**
 * Inter is no longer the body face — Yu Gothic is (see --font-sans). It stays
 * as the Latin fallback for platforms carrying neither Yu Gothic nor a JP
 * gothic, so those users get our typeface rather than a generic system sans.
 *
 * preload: false because it now sits last in the stack: Windows and macOS
 * resolve earlier families and would never paint a glyph with it, so preloading
 * would download it for everyone to serve almost no one. Browsers still fetch
 * it on demand where it is actually used.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Discipline. Precision. Mastery. Train your typing the way a swordsman trains: " +
  "deliberate practice, honest measurement, and rank earned one keystroke at a time.";

export const metadata: Metadata = {
  title: {
    default: "Samurai Script — Master Your Keyboard Like a Samurai Masters the Sword",
    template: "%s · Samurai Script",
  },
  description: DESCRIPTION,
  applicationName: "Samurai Script",
  openGraph: {
    type: "website",
    siteName: "Samurai Script",
    title: "Samurai Script — Master Your Keyboard Like a Samurai Masters the Sword",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Samurai Script",
    description: "Master your keyboard like a samurai masters the sword.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#101214" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Next 16 no longer overrides scroll-behavior on navigation unless asked.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cinzel.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>
          {children}
          <Toaster position="bottom-right" />
        </AppProviders>
      </body>
    </html>
  );
}
