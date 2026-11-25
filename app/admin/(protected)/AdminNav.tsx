"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/tribes", label: "Tribes" },
  { href: "/admin/knowledge", label: "Knowledge" },
  { href: "/admin/festivals", label: "Festivals" },
  { href: "/admin/morungs", label: "Morungs" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin modules" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item && item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
