import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { saveFile } from "@/lib/storage";
import { randomUUID } from "crypto";

const TITLE_THRESHOLD = 120;

const AI_MODELS = [
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4o-mini",
];

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "application/pdf": "pdf",
};

async function generateTitle(text: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return text.slice(0, 120) + "\u2026";

  for (const model of AI_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://para-app.local",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You generate short note titles. Given a message, reply with ONLY a concise title (max 80 chars) that captures the essence. Same language as the input. No quotes, no prefix.",
            },
            { role: "user", content: text.slice(0, 1000) },
          ],
          max_tokens: 60,
          temperature: 0.3,
        }),
      });

      if (res.status === 429 || res.status === 404) continue;
      if (!res.ok) continue;

      const data = await res.json();
      const title = data.choices?.[0]?.message?.content?.trim();
      if (title) return title;
    } catch {
      continue;
    }
  }

  return text.slice(0, 120) + "\u2026";
}

/** Download media from Evolution API using the base64 endpoint */
async function downloadMedia(
  instance: string,
  messageData: Record<string, unknown>
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const evoUrl = process.env.EVOLUTION_SERVER_URL;
  const evoKey = process.env.EVOLUTION_API_KEY;
  if (!evoUrl || !evoKey) return null;

  try {
    const res = await fetch(
      `${evoUrl}/chat/getBase64FromMediaMessage/${instance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evoKey,
        },
        body: JSON.stringify({
          message: messageData,
          convertToMp4: false,
        }),
      }
    );

    if (!res.ok) {
      console.log("[evolution-webhook] media download failed:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const base64: string = json.base64;
    const mimeType: string = json.mimetype || "application/octet-stream";

    console.log("[evolution-webhook] media download ok, mimeType:", mimeType, "base64 length:", base64?.length);

    if (!base64) return null;

    const buffer = Buffer.from(base64, "base64");
    return { buffer, mimeType };
  } catch (err) {
    console.log("[evolution-webhook] media download error:", err);
    return null;
  }
}

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
  const instance = payload.instance;

  console.log("[evolution-webhook] event:", JSON.stringify({ messageType: data?.messageType, instance, keyId: data?.key?.id }));

  if (!data?.key) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  // Only process messages sent by the user themselves
  if (!data.key.fromMe) {
    return NextResponse.json({ ignored: "not from me" }, { status: 200 });
  }

  // Extract phone number from remoteJid
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

  const workspaceId = user.workspaces[0].id;

  // Extract text content from various message types
  const msg = data.message ?? {};
  const text =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    null;

  // Detect media messages
  const mediaType = data.messageType as string | undefined;
  const isMedia =
    mediaType === "imageMessage" ||
    mediaType === "videoMessage" ||
    mediaType === "audioMessage" ||
    mediaType === "documentMessage" ||
    mediaType === "documentWithCaptionMessage" ||
    mediaType === "stickerMessage";

  // Must have text or media
  if (!text && !isMedia) {
    return NextResponse.json({ ignored: "no content" }, { status: 200 });
  }

  // Build title and body
  let title: string;
  let body: string;

  if (text && text.length > TITLE_THRESHOLD) {
    title = await generateTitle(text);
    body = `<p>${text}</p>`;
  } else if (text) {
    title = text;
    body = "";
  } else {
    // Media without caption
    const typeLabel = mediaType?.replace("Message", "") ?? "media";
    title = `WhatsApp ${typeLabel}`;
    body = "";
  }

  // Create the note
  const note = await db.note.create({
    data: {
      workspaceId,
      title,
      body,
      category: "INBOX",
      tags: ["whatsapp"],
    },
  });

  // If media, download and attach
  if (isMedia && instance && data.key.id) {
    const media = await downloadMedia(instance, data);
    if (media) {
      const extension = MIME_EXT[media.mimeType] ?? "bin";
      const storedAs = `${randomUUID()}.${extension}`;
      const filename =
        msg.documentMessage?.fileName ??
        msg.documentWithCaptionMessage?.message?.documentMessage?.fileName ??
        `whatsapp-${data.key.id.slice(-8)}.${extension}`;

      await saveFile(media.buffer, storedAs);

      await db.attachment.create({
        data: {
          filename,
          storedAs,
          size: media.buffer.length,
          mimeType: media.mimeType,
          noteId: note.id,
        },
      });
    }
  }

  return NextResponse.json({ created: note.id }, { status: 201 });
}
