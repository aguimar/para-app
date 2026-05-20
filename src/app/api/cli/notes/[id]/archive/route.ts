import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireCliSession();
  const { id } = await context.params;

  const note = await db.note.findUnique({
    where: { id },
    select: { id: true, workspace: { select: { userId: true } } },
  });
  if (!note || note.workspace.userId !== session.claims.userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await db.note.update({
    where: { id: note.id },
    data: {
      category: "ARCHIVE",
      projectId: null,
      areaId: null,
      resourceId: null,
      groupId: null,
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

  return NextResponse.json({ note: updated });
}
