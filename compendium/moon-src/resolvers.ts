const COMPENDIUM_CONTENT_PREFIX = "compendium/data";

export function publicPathToLogicalPath(urlPath: string): string {
  const cleaned = urlPath
    .replace(/^\/+/, "")
    .replace(/\.md$/, "")
    .replace(/\.json$/, "")
    .trim();

  if (!cleaned) {
    return `${COMPENDIUM_CONTENT_PREFIX}/index.json`;
  }

  return `${COMPENDIUM_CONTENT_PREFIX}/${cleaned}.json`;
}

export function logicalPathToPublicPath(logicalPath: string): string {
  return (
    "/" +
    logicalPath
      .replace(new RegExp(`^${COMPENDIUM_CONTENT_PREFIX}/`), "")
      .replace(/\.json$/, "")
  );
}