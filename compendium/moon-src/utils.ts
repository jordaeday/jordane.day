import fs from "fs";
import path from "path";

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeBase64File(filePath: string, base64: string) {
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(filePath, buffer);
}