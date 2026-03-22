import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

/** Extracts plain text from a note body (BlockNote JSON or legacy HTML). */
export function bodyToPlainText(body: string): string {
  if (!body) return "";
  try {
    const blocks = JSON.parse(body);
    if (!Array.isArray(blocks)) throw new Error();
    const texts: string[] = [];
    function extractText(node: unknown) {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (n.type === "text" && typeof n.text === "string") texts.push(n.text);
      if (Array.isArray(n.content)) n.content.forEach(extractText);
      if (Array.isArray(n.children)) n.children.forEach(extractText);
    }
    blocks.forEach(extractText);
    return texts.join(" ");
  } catch {
    // Legacy HTML
    return body.replace(/<[^>]+>/g, "");
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
