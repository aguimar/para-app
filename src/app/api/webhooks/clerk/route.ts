import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } =
      event.data;
    const email = email_addresses[0]?.email_address ?? "";
    const name = [first_name, last_name].filter(Boolean).join(" ") || email;
    const baseSlug = slugify(name || "my-brain");
    const slug = `${baseSlug}-${id.slice(-6)}`;

    await db.user.upsert({
      where: { email },
      update: { id, name, imageUrl: image_url },
      create: {
        id,
        email,
        name,
        imageUrl: image_url,
        workspaces: {
          create: {
            name: "My Second Brain",
            slug,
          },
        },
      },
    });
  }

  if (event.type === "user.deleted") {
    const { id } = event.data;
    if (id) await db.user.delete({ where: { id } }).catch(() => null);
  }

  return new Response(null, { status: 200 });
}
