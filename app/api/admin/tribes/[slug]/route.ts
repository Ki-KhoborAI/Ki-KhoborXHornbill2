import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminMutation,
  requireAdminSession,
} from "../../../../../lib/admin/auth/guard";
import {
  AdminTribeError,
  adminTribeErrorStatus,
  archiveAdminTribe,
  deleteAdminTribePermanently,
  getAdminTribeBySlug,
  updateAdminTribe,
  updateAdminTribeStatus,
} from "../../../../../lib/admin/tribes";
import {
  AdminStatusUpdateSchema,
  AdminTribeWriteSchema,
} from "../../../../../lib/admin/content/schemas";

function jsonError(error: unknown): NextResponse {
  if (error instanceof AdminTribeError) {
    return NextResponse.json(
      { error: error.message },
      { status: adminTribeErrorStatus(error) }
    );
  }

  console.error(
    "[AdminTribes] Unexpected error:",
    error instanceof Error ? error.message : error
  );
  return NextResponse.json(
    { error: "Unable to process tribe request." },
    { status: 503 }
  );
}

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Fetch a single tribe by slug.
 */
export async function GET(req: Request, context: RouteContext) {
  const session = await requireAdminSession(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const tribe = await getAdminTribeBySlug(decodeURIComponent(slug));
    return NextResponse.json({ tribe }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Update tribe fields and/or status.
 * Status-only payloads use AdminStatusUpdateSchema.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid tribe payload." },
        { status: 400 }
      );
    }

    const keys = Object.keys(body as Record<string, unknown>);
    const statusOnly =
      keys.length === 1 &&
      Object.prototype.hasOwnProperty.call(body, "status");

    if (statusOnly) {
      const parsed = AdminStatusUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid status update." },
          { status: 400 }
        );
      }
      const tribe = await updateAdminTribeStatus(
        decoded,
        parsed.data.status,
        session.username
      );
      return NextResponse.json({ tribe }, { status: 200 });
    }

    // Full updates must include write fields; validate shape early for clearer 400s.
    const preview = AdminTribeWriteSchema.safeParse({
      ...(body as object),
      name:
        typeof (body as { name?: unknown }).name === "string"
          ? (body as { name: string }).name
          : "placeholder",
    });
    if (!preview.success && typeof (body as { name?: unknown }).name !== "string") {
      return NextResponse.json(
        { error: "Tribe name is required for full updates." },
        { status: 400 }
      );
    }

    const tribe = await updateAdminTribe(decoded, body, session.username);
    return NextResponse.json({ tribe }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Soft-delete (archive) by default.
 * Pass ?permanent=1 to permanently delete draft/archived tribes only.
 */
export async function DELETE(req: Request, context: RouteContext) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";

    const tribe = permanent
      ? await deleteAdminTribePermanently(decoded, session.username)
      : await archiveAdminTribe(decoded, session.username);

    return NextResponse.json({ tribe }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}
