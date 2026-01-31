# Moon Server Implementation

This project now includes a Moon Server API compliant with the [Moon Server Specification](https://github.com/Dzoukr/MoonServerSpecification).

## Setup

1. **Set your API key** in `.env`:
   ```bash
   MOON_API_KEY=your-secret-key-here
   ```

2. **Start the server**:
   ```bash
   bun run init.ts
   ```

## API Endpoints

All endpoints require the `x-api-key` header with your API key.

### POST /api/moon/publish
Publish new content. Returns `{ id: "generated-id" }`.

**Request:**
```json
{
  "name": "My Article",
  "path": "folder/article.md",
  "metadata": { "category": "blog", "tags": ["example"] },
  "content": "# Markdown content here",
  "attachments": { "image.jpg": "base64..." }
}
```

### POST /api/moon/publish/:id
Update existing content by ID.

### GET /api/moon/detail/:id
Get published content by ID.

### POST /api/moon/unpublish/:id
Delete published content. Returns `{ id: null }`.

## ID Generation

IDs are automatically generated from the `path` field:
- `folder/doc.md` → `folder-doc`
- `my article.md` → `my-article`

## Compendium Subdomain

Published content is served at `compendium.jordane.day` (or `compendium.localhost:3000` for local testing).

**Example:**
- Published at path: `folder/article.md`
- Accessible at: `http://compendium.jordane.day/folder/article.md`

### Local Testing

Add to `/etc/hosts`:
```
127.0.0.1 compendium.localhost
```

Then visit: `http://compendium.localhost:3000/folder/article`

## Storage

- **Data**: `compendium/data/{id}.json` - Full JSON objects
- **Attachments**: `compendium/attachments/{id}/` - Extracted files

## Testing

Run the test script:
```bash
./test-moon-api.sh
```

Or test manually:
```bash
# Publish
curl -X POST http://localhost:3000/api/moon/publish \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"name":"Test","path":"test.md","metadata":{},"content":"# Hello"}'

# Get
curl http://localhost:3000/api/moon/detail/test \
  -H "x-api-key: YOUR_API_KEY"

# Unpublish
curl -X POST http://localhost:3000/api/moon/unpublish/test \
  -H "x-api-key: YOUR_API_KEY"
```

## Integration with Obsidian

This server is compatible with the [Moon Server Obsidian Plugin](https://github.com/Dzoukr/MoonServerObsidianPlugin). Configure the plugin with:
- **Server URL**: `http://your-domain.com/api/moon`
- **API Key**: Your `MOON_API_KEY` value
