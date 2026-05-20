import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireCliSession();
  const { id } = await context.params;

  const note = await db.note.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      projectId: true,
      areaId: true,
      resourceId: true,
      workspace: { select: { userId: true } },
    },
  });
  if (!note || note.workspace.userId !== session.claims.userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    note: {
      id: note.id,
      title: note.title,
      category: note.category,
      projectId: note.projectId,
      areaId: note.areaId,
      resourceId: note.resourceId,
    },
  });
}
