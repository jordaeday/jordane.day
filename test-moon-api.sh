#!/usr/bin/env bash

# Moon Server API Test Script
# Make sure to set your API key in .env first!

API_KEY="${MOON_API_KEY:-your-secret-key-change-this}"
BASE_URL="http://localhost:3000"

echo "🌙 Moon Server API Test"
echo "======================="
echo ""

# Test 1: Publish a new document
echo "📝 Test 1: Publishing new document..."
PUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/moon/publish" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test Document",
    "path": "test/hello.md",
    "metadata": {
      "category": "test",
      "tags": ["example", "hello"]
    },
    "content": "# Hello Moon Server\n\nThis is a test document.\n\n## Features\n\n- Markdown rendering\n- Path-based IDs\n- Attachment support",
    "attachments": {}
  }')

echo "Response: $PUBLISH_RESPONSE"
echo ""

# Test 2: Get the published document
echo "📖 Test 2: Getting published document..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/moon/detail/test-hello" \
  -H "x-api-key: $API_KEY")

echo "Response: $GET_RESPONSE"
echo ""

# Test 3: Update the document
echo "✏️  Test 3: Updating document..."
UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/moon/publish/test-hello" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test Document (Updated)",
    "path": "test/hello.md",
    "metadata": {
      "category": "test",
      "tags": ["example", "hello", "updated"]
    },
    "content": "# Hello Moon Server (Updated)\n\nThis document has been updated!\n\n## New Features\n\n- Updates work correctly\n- ID remains the same",
    "attachments": {}
  }')

echo "Response: $UPDATE_RESPONSE"
echo ""

# Test 4: Test without API key (should fail)
echo "🔒 Test 4: Testing authentication (should fail)..."
AUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/moon/detail/test-hello")

echo "Response: $AUTH_RESPONSE"
echo ""

# Test 5: Unpublish the document
echo "🗑️  Test 5: Unpublishing document..."
UNPUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/moon/unpublish/test-hello" \
  -H "x-api-key: $API_KEY")

echo "Response: $UNPUBLISH_RESPONSE"
echo ""

# Test 6: Try to get deleted document (should 404)
echo "❌ Test 6: Getting deleted document (should 404)..."
NOT_FOUND_RESPONSE=$(curl -s -X GET "$BASE_URL/api/moon/detail/test-hello" \
  -H "x-api-key: $API_KEY")

echo "Response: $NOT_FOUND_RESPONSE"
echo ""

echo "✅ Tests complete!"
echo ""
echo "To test the compendium subdomain, you'll need to:"
echo "1. Configure your reverse proxy or hosts file"
echo "2. Add: 127.0.0.1 compendium.localhost to /etc/hosts"
echo "3. Visit: http://compendium.localhost:3000/test/hello"
