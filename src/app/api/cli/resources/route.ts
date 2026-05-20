import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

export async function GET(request: Request) {
  const session = await requireCliSession();
  const workspaceId = new URL(request.url).searchParams.get("workspace_id") ?? undefined;

  const resources = await db.resource.findMany({
    where: {
      workspace: { userId: session.claims.userId },
      ...(workspaceId ? { workspaceId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, icon: true },
  });

  return NextResponse.json({ resources });
}
