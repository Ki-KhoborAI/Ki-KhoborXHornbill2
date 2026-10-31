"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locations } from "../data/locations";

const navItems = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Explore", href: "/explore", icon: "◎" },
  { label: "Events", href: "/events", icon: "▦" },
  { label: "Updates", href: "/updates", icon: "◉" },
  { label: "Ask", href: "/ask", icon: "✳" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const routeLocationId = pathname.match(/^\/experience\/([^/]+)\/?$/)?.[1];
  const routeLocation = routeLocationId
    ? locations[routeLocationId.toLowerCase()]
    : undefined;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {navItems.map((item) => {
          const href =
            item.href === "/ask" && routeLocation
              ? `/ask?location=${encodeURIComponent(routeLocation.id)}`
              : item.href;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === "/explore" &&
                  (pathname === "/experience" ||
                    pathname.startsWith("/experience/")));

          return (
            <Link
              key={item.href}
              href={href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1.5 transition-colors ${
                active
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-5 rounded-full bg-white" />
              )}

              <span
                aria-hidden="true"
                className={`text-base leading-none ${
                  active ? "scale-105" : ""
                }`}
              >
                {item.icon}
              </span>

              <span className="text-[9px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
