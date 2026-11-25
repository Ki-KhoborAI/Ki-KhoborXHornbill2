"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error || "Unable to sign in.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151515] p-6"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Ki-Khobor Admin
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-white/55">
          Restricted access for festival content administration.
        </p>

        <label className="mt-6 block text-xs uppercase tracking-[0.15em] text-white/45">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-white/40"
            required
          />
        </label>

        <label className="mt-4 block text-xs uppercase tracking-[0.15em] text-white/45">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-white/40"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
