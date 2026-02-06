import fs from "fs";
import path from "path";
import { MoonItem, StoredMoonItem } from "./types";
import { ensureDir, writeBase64File } from "./utils";

const ROOT_DIR = path.resolve("compendium");
const INDEX_FILE = path.join(ROOT_DIR, "index.json");

interface Index {
  nextId: number;
  items: Record<number, string>; // id → absolute item folder
}

function loadIndex(): Index {
  if (!fs.existsSync(INDEX_FILE)) {
    ensureDir(ROOT_DIR);
    const index: Index = { nextId: 1, items: {} };
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    return index;
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
}

function saveIndex(index: Index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

export function publishItem(id: number | undefined, item: MoonItem): number {
  const index = loadIndex();

  const finalId = id ?? index.nextId++;
  const itemDir = path.join(ROOT_DIR, item.path.replace(/\/[^\/]+$/, ""));
  ensureDir(itemDir);

  const fullPath = path.join(ROOT_DIR, item.path);

  // Write main content
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, item.content, "utf-8");

  // Attachments
  if (item.attachments) {
    const attachmentDir = `${fullPath}.attachments`;
    ensureDir(attachmentDir);

    for (const [name, base64] of Object.entries(item.attachments)) {
      writeBase64File(path.join(attachmentDir, name), base64);
    }
  }

  index.items[finalId] = fullPath;
  saveIndex(index);

  return finalId;
}

export function getItem(id: number): StoredMoonItem | null {
  const index = loadIndex();
  const fullPath = index.items[id];
  if (!fullPath || !fs.existsSync(fullPath)) return null;

  const content = fs.readFileSync(fullPath, "utf-8");
  const attachmentDir = `${fullPath}.attachments`;

  let attachments: Record<string, string> | undefined;
  if (fs.existsSync(attachmentDir)) {
    attachments = {};
    for (const file of fs.readdirSync(attachmentDir)) {
      const buf = fs.readFileSync(path.join(attachmentDir, file));
      attachments[file] = buf.toString("base64");
    }
  }

  return {
    id,
    name: path.basename(fullPath),
    path: path.relative(ROOT_DIR, fullPath),
    metadata: {},
    content,
    attachments,
  };
}

export function unpublishItem(id: number): boolean {
  const index = loadIndex();
  const fullPath = index.items[id];
  if (!fullPath) return false;

  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true });
  }
  if (fs.existsSync(`${fullPath}.attachments`)) {
    fs.rmSync(`${fullPath}.attachments`, { recursive: true, force: true });
  }

  delete index.items[id];
  saveIndex(index);
  return true;
}

export function getItemByPath(requestPath: string) {
  const index = loadIndex();

  const normalized = requestPath.endsWith(".json")
    ? requestPath
    : `${requestPath}.json`;

  for (const [id, fullPath] of Object.entries(index.items)) {
    if (fullPath.endsWith(normalized)) {
      return getItem(Number(id));
    }
  }

  return null;
}