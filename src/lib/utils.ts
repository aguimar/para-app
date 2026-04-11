import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: Date | string, locale = "pt-BR"): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return locale === "pt-BR" ? "Hoje" : "Today";
  }
  if (days === 1) {
    return locale === "pt-BR" ? "Ontem" : "Yesterday";
  }
  if (days < 7) {
    return locale === "pt-BR" ? `há ${days} dias` : `${days} days ago`;
  }
  return formatDate(date, locale);
}

export function plural(count: number, one: string, other: string): string {
  return `${count} ${count === 1 ? one : other}`;
}

/** Extracts plain text from a note body (BlockNote JSON or legacy HTML). */
export function bodyToPlainText(body: string): string {
  if (!body) return "";
  try {
    const blocks = JSON.parse(body);
    if (!Array.isArray(blocks)) throw new Error();
    const texts: string[] = [];
    const extractText = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (n.type === "text" && typeof n.text === "string") texts.push(n.text);
      if (Array.isArray(n.content)) n.content.forEach(extractText);
      if (Array.isArray(n.children)) n.children.forEach(extractText);
    };
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

export type NoteContact = {
  googleId: string;
  name: string;
  email: string;
};

export function extractContactsFromBody(bodyJson: string): NoteContact[] {
  try {
    const blocks = JSON.parse(bodyJson);
    if (!Array.isArray(blocks)) return [];

    const contacts: NoteContact[] = [];
    const seen = new Set<string>();

    const walkInline = (node: any) => {
      if (
        node?.type === "mention" &&
        typeof node.props?.googleId === "string" &&
        node.props.googleId
      ) {
        if (!seen.has(node.props.googleId)) {
          seen.add(node.props.googleId);
          contacts.push({
            googleId: node.props.googleId,
            name: node.props.name ?? "",
            email: node.props.email ?? "",
          });
        }
      }
    };

    const walkBlock = (block: any) => {
      if (Array.isArray(block.content)) block.content.forEach(walkInline);
      if (Array.isArray(block.children)) block.children.forEach(walkBlock);
    };

    blocks.forEach(walkBlock);
    return contacts;
  } catch {
    return [];
  }
}
