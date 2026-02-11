import fs from "fs";
import path from "path";
import { MoonItem, StoredMoonItem } from "./types";
import { ensureDir, writeBase64File } from "./utils";

const ROOT_DIR = path.resolve("compendium");
const INDEX_FILE = path.join(ROOT_DIR, "index.json");

interface Index {
  nextId: number;
  items: Record<number, string>;
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
  
  // Save to compendium/data/ directory
  const fullPath = path.join(ROOT_DIR, "data", item.path);
  
  // Create directory structure
  ensureDir(path.dirname(fullPath));
  
  // Write main content as JSON (or plaintext if markdown)
  // If it's a markdown file, store it as markdown
  // If it's supposed to be JSON metadata, convert accordingly
  if (item.path.endsWith('.json')) {
    fs.writeFileSync(fullPath, JSON.stringify(item, null, 2), "utf-8");
  } else {
    // For .md files, save as JSON with the full item structure
    const jsonPath = fullPath.replace(/\.[^.]+$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(item, null, 2), "utf-8");
  }

  // Attachments - only create if there are actually attachments
  if (item.attachments && Object.keys(item.attachments).length > 0) {
    // Store attachments in compendium/attachments/{id}/
    const attachmentDir = path.join(ROOT_DIR, "attachments", String(finalId));
    ensureDir(attachmentDir);

    for (const [name, base64] of Object.entries(item.attachments)) {
      writeBase64File(path.join(attachmentDir, name), base64);
    }
  }

  // Store the RELATIVE path to the JSON file in the index
  const jsonPath = item.path.endsWith('.json') ? fullPath : fullPath.replace(/\.[^.]+$/, '.json');
  const relativePath = path.relative(ROOT_DIR, jsonPath);
  index.items[finalId] = relativePath;
  saveIndex(index);

  return finalId;
}

export function getItem(id: number): StoredMoonItem | null {
  const index = loadIndex();
  const relativePath = index.items[id];
  if (!relativePath) return null;
  
  // Convert relative path to absolute
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;

  // Read the JSON file
  const jsonContent = fs.readFileSync(fullPath, "utf-8");
  const itemData = JSON.parse(jsonContent);
  
  // Attachments are stored in compendium/attachments/{id}/
  const attachmentDir = path.join(ROOT_DIR, "attachments", String(id));

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
    name: itemData.name,
    path: itemData.path,
    metadata: itemData.metadata || {},
    content: itemData.content,
    attachments: attachments || itemData.attachments || {},
  };
}

export function unpublishItem(id: number): boolean {
  const index = loadIndex();
  const relativePath = index.items[id];
  if (!relativePath) return false;
  
  // Convert relative path to absolute
  const fullPath = path.join(ROOT_DIR, relativePath);

  // Delete the JSON file
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true });
  }
  
  // Delete attachments from compendium/attachments/{id}/
  const attachmentDir = path.join(ROOT_DIR, "attachments", String(id));
  if (fs.existsSync(attachmentDir)) {
    fs.rmSync(attachmentDir, { recursive: true, force: true });
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

  // If normalized starts with compendium/, remove it for matching against index paths
  const prefix = "compendium/";
  const normalizedPath = normalized.startsWith(prefix)
      ? normalized.slice(prefix.length)
      : normalized;

  for (const [id, fullPath] of Object.entries(index.items)) {
    if (fullPath.endsWith(normalizedPath)) {
      return getItem(Number(id));
    }
  }

  return null;
}