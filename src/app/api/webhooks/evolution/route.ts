import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";

export async function POST(req: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Missing EVOLUTION_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const apikey = headerPayload.get("apikey");
  if (apikey !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const data = payload.data;

  if (!data?.key) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  // Only process messages sent by the user themselves
  if (!data.key.fromMe) {
    return NextResponse.json({ ignored: "not from me" }, { status: 200 });
  }

  // Extract phone number from remoteJid (e.g. "5585988645679@s.whatsapp.net")
  const remoteJid = data.key.remoteJid as string;
  const phone = remoteJid.replace(/@.*$/, "");

  // Look up user by phone number
  const user = await db.user.findUnique({
    where: { phone },
    include: {
      workspaces: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!user || user.workspaces.length === 0) {
    return NextResponse.json({ ignored: "unknown phone" }, { status: 200 });
  }

  // Extract text content
  const text =
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    null;

  if (!text) {
    return NextResponse.json({ ignored: "no text content" }, { status: 200 });
  }

  const workspaceId = user.workspaces[0].id;
  const title = text.length > 200 ? text.slice(0, 200) + "\u2026" : text;
  const body = text.length > 200 ? `<p>${text}</p>` : "";

  const note = await db.note.create({
    data: {
      workspaceId,
      title,
      body,
      category: "INBOX",
      tags: ["whatsapp"],
    },
  });

  return NextResponse.json({ created: note.id }, { status: 201 });
}
