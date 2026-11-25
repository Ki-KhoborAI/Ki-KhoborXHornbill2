/**
 * Origin validation for state-changing admin auth requests.
 * Prefers configured APP_ORIGIN. Does not trust X-Forwarded-Host.
 */

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the allowed application origin.
 * Prefer APP_ORIGIN. In development only, fall back to the request URL origin
 * (never from client-controlled forwarded host headers).
 */
export function resolveAllowedOrigin(
  req: Request,
  configuredAppOrigin: string | null
): string | null {
  if (configuredAppOrigin) {
    return normalizeOrigin(configuredAppOrigin);
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Local/dev: derive from the request URL constructed by the runtime, not Host headers.
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}

export function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim();
  if (origin) return normalizeOrigin(origin);

  const referer = req.headers.get("referer")?.trim();
  if (referer) return normalizeOrigin(referer);

  return null;
}

/**
 * Returns true when the request Origin/Referer matches the allowed app origin.
 */
export function isTrustedAuthOrigin(
  req: Request,
  configuredAppOrigin: string | null
): boolean {
  const allowed = resolveAllowedOrigin(req, configuredAppOrigin);
  if (!allowed) return false;

  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return false;

  return requestOrigin === allowed;
}
