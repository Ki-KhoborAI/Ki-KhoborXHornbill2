import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminMutation,
  requireAdminSession,
} from "../../../../lib/admin/auth/guard";
import {
  AdminKnowledgeError,
  adminKnowledgeErrorStatus,
  createAdminKnowledge,
  listAdminKnowledge,
} from "../../../../lib/admin/knowledge";
import {
  AdminContentStatusSchema,
  KnowledgeCategorySchema,
  type AdminContentStatus,
} from "../../../../lib/admin/content/schemas";
import type { KnowledgeCategory } from "../../../../lib/importer/schemas";

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

/**
 * List knowledge items from the configured admin database.
 * Optional filters: status, category.
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

    const categoryOrError = parseCategoryParam(url.searchParams.get("category"));
    if (categoryOrError instanceof NextResponse) return categoryOrError;

    const items = await listAdminKnowledge({
      status,
      category: categoryOrError,
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Create a knowledge item (always starts as draft).
 * Optional ?category= locks the category for festivals/morungs modules.
 */
export async function POST(req: Request) {
  const session = await requireAdminMutation(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const categoryOrError = parseCategoryParam(
      new URL(req.url).searchParams.get("category")
    );
    if (categoryOrError instanceof NextResponse) return categoryOrError;

    const body = await req.json().catch(() => null);
    const item = await createAdminKnowledge(body, session.username, {
      lockCategory: categoryOrError,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
