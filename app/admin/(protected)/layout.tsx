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
      <header className="border-b border-white/10 px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em]">
              KI-KHOBOR <span className="text-white/50">×</span> ADMIN
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Signed in as {session.username}
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm text-white/70">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
    </div>
  );
}
