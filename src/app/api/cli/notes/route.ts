import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

const NOTE_CATEGORIES = new Set(["INBOX", "PROJECT", "AREA", "RESOURCE", "ARCHIVE"]);

export async function GET(request: Request) {
  const session = await requireCliSession();
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspace_id") ?? undefined;
  const query = params.get("query") ?? undefined;
  const category = params.get("category") ?? undefined;

  const notes = await db.note.findMany({
    where: {
      workspace: { userId: session.claims.userId },
      ...(workspaceId ? { workspaceId } : {}),
      ...(category ? { category: category as never } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { body: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      projectId: true,
      areaId: true,
      resourceId: true,
    },
  });

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const session = await requireCliSession();

  let body: { workspace_id?: unknown; title?: unknown; category?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (typeof body.workspace_id !== "string" || !body.workspace_id) {
    return NextResponse.json({ error: "invalid workspace_id" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "invalid title" }, { status: 400 });
  }

  const category =
    typeof body.category === "string" && NOTE_CATEGORIES.has(body.category)
      ? body.category
      : "INBOX";

  const workspace = await db.workspace.findUnique({
    where: { id: body.workspace_id },
    select: { id: true, userId: true },
  });
  if (!workspace || workspace.userId !== session.claims.userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const note = await db.note.create({
    data: {
      workspaceId: workspace.id,
      title: body.title.trim(),
      category: category as never,
    },
    select: {
      id: true,
      title: true,
      category: true,
      projectId: true,
      areaId: true,
      resourceId: true,
    },
  });

  return NextResponse.json({ note });
}
