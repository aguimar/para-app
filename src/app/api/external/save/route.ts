import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { saveFile } from "@/lib/storage";
import { randomUUID } from "crypto";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const NOTE_CATEGORIES = new Set(["INBOX", "PROJECT", "AREA", "RESOURCE", "ARCHIVE"]);

function ext(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "text/plain": "txt",
    "text/markdown": "md",
    "video/mp4": "mp4",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "application/json": "json",
  };
  return map[mimeType] ?? "bin";
}

export async function POST(req: NextRequest) {
  // 1. Authenticate with AGENT_API_KEY
  const authHeader = req.headers.get("authorization")?.trim();
  const agentKey = process.env.AGENT_API_KEY;
  if (!agentKey) {
    return NextResponse.json(
      { error: "Agent API Key (AGENT_API_KEY) is not configured on the server" },
      { status: 500 }
    );
  }

  const expectedHeader = `Bearer ${agentKey}`;
  if (authHeader !== expectedHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let title = "";
  let bodyContent = "";
  let url = "";
  let category = "INBOX";
  let tags: string[] = ["openclaw"];
  let phone = "";
  let email = "";
  
  let fileBuffer: Buffer | null = null;
  let fileName = "";
  let fileType = "";
  let fileSize = 0;

  // 2. Parse payload based on content type
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      bodyContent = (formData.get("body") as string) || "";
      url = (formData.get("url") as string) || "";
      category = (formData.get("category") as string) || "INBOX";
      phone = (formData.get("phone") as string) || "";
      email = (formData.get("email") as string) || "";
      
      const file = formData.get("file") as File | null;
      if (file) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
        fileName = file.name;
        fileType = file.type;
        fileSize = file.size;
      }

      const tagsRaw = formData.get("tags") as string | null;
      if (tagsRaw) {
        try {
          tags = JSON.parse(tagsRaw);
        } catch {
          tags = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    } catch (err) {
      return NextResponse.json({ error: "Failed to parse multipart form data" }, { status: 400 });
    }
  } else {
    // Default to JSON
    try {
      const json = await req.json();
      title = json.title || "";
      bodyContent = json.body || "";
      url = json.url || "";
      category = json.category || "INBOX";
      phone = json.phone || "";
      email = json.email || "";

      if (Array.isArray(json.tags)) {
        tags = json.tags;
      } else if (typeof json.tags === "string") {
        tags = json.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }

      // Handle base64 encoded file payload in JSON
      if (json.file && typeof json.file === "object") {
        const fileObj = json.file as { base64: string; name: string; type: string };
        if (fileObj.base64 && fileObj.name && fileObj.type) {
          fileBuffer = Buffer.from(fileObj.base64, "base64");
          fileName = fileObj.name;
          fileType = fileObj.type;
          fileSize = fileBuffer.length;
        }
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse JSON body" }, { status: 400 });
    }
  }

  // Ensure title has a fallback if empty
  if (!title.trim()) {
    title = url ? "Saved Link" : fileBuffer ? `Saved File (${fileName})` : "New Note";
  }

  // 3. User Routing: Resolve target user & workspace
  let user = null;

  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    user = await db.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: cleanPhone ? { contains: cleanPhone } : undefined },
        ].filter(Boolean) as never[],
      },
      include: {
        workspaces: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    });
  }

  if (!user && email) {
    user = await db.user.findUnique({
      where: { email },
      include: {
        workspaces: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    });
  }

  // Fallback: If no identifiers provided or user not found, check if there is exactly 1 user in DB
  if (!user) {
    const userCount = await db.user.count();
    if (userCount === 1) {
      user = await db.user.findFirst({
        include: {
          workspaces: { orderBy: { createdAt: "asc" }, take: 1 },
        },
      });
    }
  }

  if (!user || user.workspaces.length === 0) {
    return NextResponse.json(
      { error: "User or workspace not found (unable to route message)" },
      { status: 404 }
    );
  }

  const workspaceId = user.workspaces[0].id;
  const categoryMapped = NOTE_CATEGORIES.has(category.toUpperCase())
    ? (category.toUpperCase() as never)
    : ("INBOX" as never);

  // 4. Formulate the note's body HTML
  let bodyHTML = bodyContent ? `<p>${bodyContent.replace(/\n/g, "<br/>")}</p>` : "";
  if (url) {
    const linkHTML = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`;
    bodyHTML = bodyHTML ? `${bodyHTML}${linkHTML}` : linkHTML;
  }

  // 5. Create Note
  try {
    const note = await db.note.create({
      data: {
        workspaceId,
        title: title.trim(),
        body: bodyHTML,
        category: categoryMapped,
        tags,
      },
    });

    // 6. Handle File Attachment
    if (fileBuffer) {
      if (fileSize > MAX_SIZE) {
        return NextResponse.json(
          { error: "File exceeds 20MB limit, note was saved without attachment" },
          { status: 400 }
        );
      }

      const storedAs = `${randomUUID()}.${ext(fileType)}`;
      await saveFile(fileBuffer, storedAs);

      await db.attachment.create({
        data: {
          filename: fileName,
          storedAs,
          size: fileSize,
          mimeType: fileType,
          noteId: note.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      noteId: note.id,
      title: note.title,
      category: note.category,
      hasAttachment: !!fileBuffer,
    }, { status: 201 });

  } catch (err: unknown) {
    console.error("[external-save-api] Error saving note:", err);
    return NextResponse.json({ error: "Internal Database Error" }, { status: 500 });
  }
}
