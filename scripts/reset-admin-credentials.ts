/**
 * Interactive local admin credential reset.
 *
 * Updates .env.local only (never committed).
 * You type the username/password in your own terminal.
 *
 * Usage:
 *   npx tsx scripts/reset-admin-credentials.ts
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { hash } from "bcryptjs";

const ENV_LOCAL = ".env.local";
const BCRYPT_ROUNDS = 10;

const KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "JWT_SECRET",
  "APP_ORIGIN",
  "ADMIN_SESSION_TTL",
] as const;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(contents: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = stripQuotes(line.slice(eq + 1));
    map.set(key, value);
  }
  return map;
}

/**
 * Format env values for Next.js (@next/env expands $VAR).
 * Bcrypt hashes must escape each $ as \$ so the digest survives loadEnvConfig.
 */
function formatEnvValue(key: string, value: string): string {
  if (key === "ADMIN_PASSWORD_HASH") {
    const normalized = value.replace(/\\\$/g, "$");
    return normalized.replace(/\$/g, "\\$");
  }
  if (value.includes(" ") || value.includes("#") || value.includes("'")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function upsertEnvLocal(updates: Record<string, string>): void {
  const existing = existsSync(ENV_LOCAL)
    ? readFileSync(ENV_LOCAL, "utf8")
    : "";
  const lines = existing.length > 0 ? existing.split(/\r?\n/) : [];
  const seen = new Set<string>();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}=${formatEnvValue(key, updates[key]!)}`;
    }
    return line;
  });

  for (const key of Object.keys(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${formatEnvValue(key, updates[key]!)}`);
    }
  }

  const body = `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
  writeFileSync(ENV_LOCAL, body, "utf8");
}

async function prompt(
  rl: ReturnType<typeof createInterface>,
  label: string,
  fallback?: string
): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  if (answer) return answer;
  if (fallback) return fallback;
  return "";
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    console.log("");
    console.log("Ki-Khobor admin credential reset");
    console.log("Writes only to .env.local (gitignored).");
    console.log("Password will be visible as you type in this terminal.");
    console.log("");

    const existing = existsSync(ENV_LOCAL)
      ? parseEnvFile(readFileSync(ENV_LOCAL, "utf8"))
      : new Map<string, string>();

    const username = await prompt(
      rl,
      "Admin username",
      existing.get("ADMIN_USERNAME") || "admin"
    );
    if (!username) {
      throw new Error("Username is required.");
    }

    const password = await prompt(rl, "New admin password");
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const confirm = await prompt(rl, "Confirm password");
    if (password !== confirm) {
      throw new Error("Passwords do not match.");
    }

    const appOrigin = await prompt(
      rl,
      "APP_ORIGIN",
      existing.get("APP_ORIGIN") || "http://localhost:3000"
    );
    if (!appOrigin) {
      throw new Error("APP_ORIGIN is required.");
    }

    const keepJwt = existing.get("JWT_SECRET")?.trim();
    let jwtSecret = keepJwt;
    if (keepJwt) {
      const rotate = (
        await prompt(rl, "Rotate JWT_SECRET? (y/N)", "N")
      ).toLowerCase();
      if (rotate === "y" || rotate === "yes") {
        jwtSecret = randomBytes(48).toString("base64url");
      }
    } else {
      jwtSecret = randomBytes(48).toString("base64url");
    }

    const sessionTtl = await prompt(
      rl,
      "ADMIN_SESSION_TTL",
      existing.get("ADMIN_SESSION_TTL") || "8h"
    );

    console.log("");
    console.log("Hashing password…");
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
      throw new Error("Failed to produce a valid bcrypt hash.");
    }

    const updates: Record<string, string> = {
      ADMIN_USERNAME: username,
      ADMIN_PASSWORD_HASH: passwordHash,
      JWT_SECRET: jwtSecret!,
      APP_ORIGIN: appOrigin,
      ADMIN_SESSION_TTL: sessionTtl || "8h",
    };

    upsertEnvLocal(updates);

    // Verify the written hash is a bcrypt digest (allow Next.js \$ escapes).
    const written = parseEnvFile(readFileSync(ENV_LOCAL, "utf8"));
    const storedHash = (written.get("ADMIN_PASSWORD_HASH") ?? "")
      .trim()
      .replace(/\\\$/g, "$");
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedHash)) {
      throw new Error(
        "ADMIN_PASSWORD_HASH in .env.local is not a bcrypt hash after write. Check the file was not edited manually."
      );
    }

    console.log("");
    console.log("Updated .env.local keys:");
    for (const key of KEYS) {
      console.log(`  - ${key}`);
    }
    console.log(`  (ADMIN_PASSWORD_HASH length=${storedHash.length}, bcrypt=yes)`);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Restart the Next.js dev server (stop and run npm run dev).");
    console.log("  2. Open http://localhost:3000/admin/login");
    console.log(`  3. Sign in with username: ${username}`);
    console.log("");
    console.log("Password hash and JWT secret were not printed.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(
    "Admin reset failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
