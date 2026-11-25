import { timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";

/**
 * Verify a candidate password against a bcrypt hash.
 * Returns false for empty inputs or compare failures.
 */
export async function verifyAdminPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (!password || !passwordHash) return false;
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}

/**
 * Timing-safe username comparison (UTF-8 bytes).
 */
export function usernamesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) {
    // Dummy compare to avoid short-circuiting solely on length checks.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
