export interface MoonItem {
  name: string;
  path: string; // e.g. data/cryptography/rsa.json
  metadata: Record<string, any>;
  content: string;
  attachments?: Record<string, string>; // base64
}

export interface StoredMoonItem extends MoonItem {
  id: number;
}
