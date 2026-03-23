import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "/app/uploads";

async function ensureDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveFile(buffer: Buffer, storedAs: string): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(UPLOADS_DIR, storedAs), buffer);
}

export async function readFile(storedAs: string): Promise<Buffer> {
  return fs.readFile(path.join(UPLOADS_DIR, storedAs));
}

export async function deleteFile(storedAs: string): Promise<void> {
  await fs.unlink(path.join(UPLOADS_DIR, storedAs)).catch(() => {});
}
