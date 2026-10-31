import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";
import type { Metadata } from "next";
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
   <body className="min-h-full flex flex-col">
  <ServiceWorkerRegistration />
  {children}
  <BottomNav />
</body>
    </html>
  );
}