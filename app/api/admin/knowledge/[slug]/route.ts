import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminMutation,
  requireAdminSession,
} from "../../../../../lib/admin/auth/guard";
import {
  AdminKnowledgeError,
  adminKnowledgeErrorStatus,
  archiveAdminKnowledge,
  deleteAdminKnowledgePermanently,
  getAdminKnowledgeBySlug,
  updateAdminKnowledge,
  updateAdminKnowledgeStatus,
} from "../../../../../lib/admin/knowledge";
import {
  AdminStatusUpdateSchema,
  KnowledgeCategorySchema,
} from "../../../../../lib/admin/content/schemas";
import type { KnowledgeCategory } from "../../../../../lib/importer/schemas";

function jsonError(error: unknown): NextResponse {
  if (error instanceof AdminKnowledgeError) {
    return NextResponse.json(
      { error: error.message },
      { status: adminKnowledgeErrorStatus(error) }
    );
  }

  console.error(
    "[AdminKnowledge] Unexpected error:",
    error instanceof Error ? error.message : error
  );
  return NextResponse.json(
    { error: "Unable to process knowledge request." },
    { status: 503 }
  );
}

function parseCategoryParam(
  value: string | null
): KnowledgeCategory | undefined | NextResponse {
  if (!value) return undefined;
  const parsed = KnowledgeCategorySchema.safeParse(value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid category filter." },
      { status: 400 }
    );
  }
  return parsed.data;
}

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const session = await requireAdminSession(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const categoryOrError = parseCategoryParam(
      new URL(req.url).searchParams.get("category")
    );
    if (categoryOrError instanceof NextResponse) return categoryOrError;

    const item = await getAdminKnowledgeBySlug(decodeURIComponent(slug), {
      expectedCategory: categoryOrError,
    });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const categoryOrError = parseCategoryParam(
      new URL(req.url).searchParams.get("category")
    );
    if (categoryOrError instanceof NextResponse) return categoryOrError;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid knowledge payload." },
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
      const item = await updateAdminKnowledgeStatus(
        decoded,
        parsed.data.status,
        session.username,
        { lockCategory: categoryOrError }
      );
      return NextResponse.json({ item }, { status: 200 });
    }

    if (typeof (body as { title?: unknown }).title !== "string") {
      return NextResponse.json(
        { error: "Knowledge title is required for full updates." },
        { status: 400 }
      );
    }

    const item = await updateAdminKnowledge(decoded, body, session.username, {
      lockCategory: categoryOrError,
    });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const url = new URL(req.url);
    const permanent = url.searchParams.get("permanent") === "1";
    const categoryOrError = parseCategoryParam(url.searchParams.get("category"));
    if (categoryOrError instanceof NextResponse) return categoryOrError;

    const item = permanent
      ? await deleteAdminKnowledgePermanently(decoded, session.username, {
          lockCategory: categoryOrError,
        })
      : await archiveAdminKnowledge(decoded, session.username, {
          lockCategory: categoryOrError,
        });

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}
