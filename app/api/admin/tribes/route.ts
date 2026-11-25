import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminMutation,
  requireAdminSession,
} from "../../../../lib/admin/auth/guard";
import {
  AdminTribeError,
  adminTribeErrorStatus,
  createAdminTribe,
  listAdminTribes,
} from "../../../../lib/admin/tribes";
import {
  AdminContentStatusSchema,
  type AdminContentStatus,
} from "../../../../lib/admin/content/schemas";

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

/**
 * List tribes from the configured admin database.
 */
export async function GET(req: Request) {
  const session = await requireAdminSession(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    let status: AdminContentStatus | undefined;
    if (statusParam) {
      const parsed = AdminContentStatusSchema.safeParse(statusParam);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid status filter." },
          { status: 400 }
        );
      }
      status = parsed.data;
    }

    const tribes = await listAdminTribes({ status });
    return NextResponse.json({ tribes }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Create a tribe (always starts as draft).
 */
export async function POST(req: Request) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const body = await req.json().catch(() => null);
    const tribe = await createAdminTribe(body, session.username);
    return NextResponse.json({ tribe }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
