import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";

const TITLE_THRESHOLD = 120;

const AI_MODELS = [
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4o-mini",
];

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

  // Debug: log payload to diagnose forwarded messages
  console.log("[evolution-webhook]", JSON.stringify({ key: data?.key, messageType: data?.messageType, message: data?.message }, null, 2));

  if (!data?.key) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  // Only process messages sent by the user themselves
  if (!data.key.fromMe) {
    return NextResponse.json({ ignored: "not from me" }, { status: 200 });
  }

  // Extract phone number from remoteJid (e.g. "558588645679@s.whatsapp.net")
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

  let title: string;
  let body: string;

  if (text.length <= TITLE_THRESHOLD) {
    title = text;
    body = "";
  } else {
    title = await generateTitle(text);
    body = `<p>${text}</p>`;
  }

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
