import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

const MOVE_CATEGORIES = new Set(["PROJECT", "AREA", "RESOURCE", "ARCHIVE"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireCliSession();
  const { id } = await context.params;

  let body: {
    category?: unknown;
    project_id?: unknown;
    area_id?: unknown;
    resource_id?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (typeof body.category !== "string" || !MOVE_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const note = await db.note.findUnique({
    where: { id },
    select: { id: true, workspaceId: true, workspace: { select: { userId: true } } },
  });
  if (!note || note.workspace.userId !== session.claims.userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: Record<string, string | null> = {
    category: body.category,
    projectId: null,
    areaId: null,
    resourceId: null,
    groupId: null,
  };

  if (body.category === "PROJECT") {
    if (typeof body.project_id !== "string" || !body.project_id) {
      return NextResponse.json({ error: "invalid project_id" }, { status: 400 });
    }
    const project = await db.project.findUnique({
      where: { id: body.project_id },
      select: { id: true, workspaceId: true, workspace: { select: { userId: true } } },
    });
    if (!project || project.workspace.userId !== session.claims.userId || project.workspaceId !== note.workspaceId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    data.projectId = project.id;
  }

  if (body.category === "AREA") {
    if (typeof body.area_id !== "string" || !body.area_id) {
      return NextResponse.json({ error: "invalid area_id" }, { status: 400 });
    }
    const area = await db.area.findUnique({
      where: { id: body.area_id },
      select: { id: true, workspaceId: true, workspace: { select: { userId: true } } },
    });
    if (!area || area.workspace.userId !== session.claims.userId || area.workspaceId !== note.workspaceId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    data.areaId = area.id;
  }

  if (body.category === "RESOURCE") {
    if (typeof body.resource_id !== "string" || !body.resource_id) {
      return NextResponse.json({ error: "invalid resource_id" }, { status: 400 });
    }
    const resource = await db.resource.findUnique({
      where: { id: body.resource_id },
      select: { id: true, workspaceId: true, workspace: { select: { userId: true } } },
    });
    if (!resource || resource.workspace.userId !== session.claims.userId || resource.workspaceId !== note.workspaceId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    data.resourceId = resource.id;
  }

  const updated = await db.note.update({
    where: { id: note.id },
    data: data as never,
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
