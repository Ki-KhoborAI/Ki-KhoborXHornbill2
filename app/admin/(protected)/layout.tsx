import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  getAdminAuthConfig,
  isAdminAuthConfigured,
} from "../../../lib/admin/auth/config";
import { verifyAdminSessionToken } from "../../../lib/admin/auth/session";
import AdminLogoutButton from "./LogoutButton";
import AdminNav from "./AdminNav";

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-sm text-white/50">
          Checking session…
        </div>
      }
    >
      <ProtectedAdminShell>{children}</ProtectedAdminShell>
    </Suspense>
  );
}

async function ProtectedAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  // Request-time cookie read — must run before any auth branching so Cache
  // Components cannot prerender a static unauthenticated redirect.
  const cookieStore = await cookies();

  if (!isAdminAuthConfigured()) {
    redirect("/admin/login");
  }

  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const config = getAdminAuthConfig();
  const session = token
    ? await verifyAdminSessionToken(token, config)
    : null;

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r border-white/10 px-4 py-6 md:block">
          <Link href="/admin" className="block px-3">
            <p className="text-xs font-semibold tracking-[0.12em]">
              KI-KHOBOR <span className="text-white/50">×</span> ADMIN
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Content console
            </p>
          </Link>
          <div className="mt-8">
            {/* AdminNav uses usePathname and needs Suspense under dynamic admin slugs. */}
            <Suspense
              fallback={
                <nav
                  aria-label="Admin modules"
                  className="space-y-1"
                  aria-busy="true"
                >
                  {["Overview", "Tribes", "Knowledge", "Festivals", "Morungs"].map(
                    (label) => (
                      <div
                        key={label}
                        className="rounded-lg px-3 py-2 text-sm text-white/35"
                      >
                        {label}
                      </div>
                    )
                  )}
                </nav>
              }
            >
              <AdminNav />
            </Suspense>
          </div>
          <div className="mt-10 border-t border-white/10 px-3 pt-4 text-[11px] text-white/40">
            Signed in as {session.username}
            <div className="mt-3">
              <AdminLogoutButton />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b0b]/95 px-4 py-3 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em]">
                  KI-KHOBOR <span className="text-white/50">×</span> ADMIN
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                  {session.username}
                </p>
              </div>
              <AdminLogoutButton />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm">
              <MobileAdminLinks />
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileAdminLinks() {
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/tribes", label: "Tribes" },
    { href: "/admin/knowledge", label: "Knowledge" },
    { href: "/admin/festivals", label: "Festivals" },
    { href: "/admin/morungs", label: "Morungs" },
  ];

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:border-white/30 hover:text-white"
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
