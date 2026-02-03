import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

/**
 *  Attachment handling
 */
export async function processAttachments(data: string): Promise<{ id: string; size: number }> {
  const decoded = decodeBase64(data);

  if (decoded.length === 0) {
    throw new Error("Invalid attachment data");
  }

  const id = randomUUID();
  const filePath = attachmentPath(id);

  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, decoded);

  return { id, size: decoded.length };
}

const decodeBase64 = (data: string): Buffer => {
  const cleaned = data.includes(',')
    ? data.slice(data.indexOf(',') + 1)
    : data;

  return Buffer.from(cleaned, 'base64');
}

const ATTACHMENTS_ROOT = "compendium/attachments";

// Returns file path in format attachments/ab/cd/abcd1234...
function attachmentPath(id: string): string {
  return path.join(ATTACHMENTS_ROOT, id.slice(0, 2), id.slice(2, 4), `${id);
}

async function ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
}

