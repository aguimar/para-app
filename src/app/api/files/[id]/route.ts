import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { readFile } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attachment = await db.attachment.findUnique({
    where: { id },
    include: { note: { include: { workspace: true } } },
  });

  if (!attachment || attachment.note.workspace.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(attachment.storedAs);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
