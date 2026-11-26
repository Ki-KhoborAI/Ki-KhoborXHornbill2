import { Suspense } from "react";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "../components/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ki-Khobor × Hornbill 2026",
  description:
    "Discover the people, places, stories, and traditions of the Hornbill Festival through Ki-Khobor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Blocks scrolled content from overlapping the iOS status bar. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-black"
          style={{ height: "env(safe-area-inset-top)" }}
        />
        <ServiceWorkerRegistration />
        {children}
        {/*
          BottomNav uses usePathname(). With Cache Components, dynamic routes
          (and not-found fallbacks) require a Suspense boundary around it.
        */}
        <Suspense
          fallback={
            <nav
              aria-label="Main navigation"
              aria-busy="true"
              className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080808]/95"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="mx-auto grid h-[52px] max-w-lg grid-cols-4" />
            </nav>
          }
        >
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
