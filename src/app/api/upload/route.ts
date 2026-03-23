import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { saveFile } from "@/lib/storage";
import { randomUUID } from "crypto";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
]);

function ext(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "text/plain": "txt",
    "text/markdown": "md",
  };
  return map[mimeType] ?? "bin";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const noteId = formData.get("noteId") as string | null;

  if (!file || !noteId) {
    return NextResponse.json({ error: "Missing file or noteId" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  // Verify the note belongs to this user
  const note = await db.note.findUnique({
    where: { id: noteId },
    include: { workspace: true },
  });
  if (!note || note.workspace.userId !== userId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const storedAs = `${randomUUID()}.${ext(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await saveFile(buffer, storedAs);

  const attachment = await db.attachment.create({
    data: {
      filename: file.name,
      storedAs,
      size: file.size,
      mimeType: file.type,
      noteId,
    },
  });

  return NextResponse.json(attachment);
}
