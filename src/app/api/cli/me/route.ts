import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireCliSession } from "@/lib/cli-api";

export async function GET() {
  const session = await requireCliSession();

  const user = await db.user.findUnique({
    where: { id: session.claims.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const workspaces = await db.workspace.findMany({
    where: { userId: session.claims.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ user, workspaces });
}
