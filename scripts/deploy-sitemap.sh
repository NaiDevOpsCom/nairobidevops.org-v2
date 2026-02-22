#!/usr/bin/env bash
# deploy-sitemap.sh — Upload sitemap.xml & robots.txt to cPanel via scp
#
# Uses the same scp approach as the CI deploy.yml pipeline.
#
# Required environment variables:
#   REMOTE_HOST       — Server hostname or IP
#   REMOTE_USER       — SSH username
#   REMOTE_PATH       — Target path (e.g. /home/user/public_html)
#   SSH_KEY_PATH      — Path to SSH private key (default: ~/.ssh/id_rsa)
#   REMOTE_PORT       — SSH port (default: 22)
#
# Usage:
#   export REMOTE_HOST=example.com REMOTE_USER=deploy REMOTE_PATH=/home/deploy/public_html
#   bash scripts/deploy-sitemap.sh
#
# Security: SSH key auth only. Never pass passwords on the command line.

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_rsa}"
REMOTE_PORT="${REMOTE_PORT:-22}"

# ── Validate environment ─────────────────────────────────────────────────────
missing=()
[[ -z "${REMOTE_HOST:-}" ]] && missing+=("REMOTE_HOST")
[[ -z "${REMOTE_USER:-}" ]] && missing+=("REMOTE_USER")
[[ -z "${REMOTE_PATH:-}" ]] && missing+=("REMOTE_PATH")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables: ${missing[*]}"
  echo ""
  echo "Example:"
  echo "  export REMOTE_HOST=your-server.com"
  echo "  export REMOTE_USER=your-user"
  echo "  export REMOTE_PATH=/home/your-user/public_html"
  echo "  bash scripts/deploy-sitemap.sh"
  exit 1
fi

# ── Validate SSH key ─────────────────────────────────────────────────────────
if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "❌ SSH key not found at: $SSH_KEY_PATH"
  echo "   Set SSH_KEY_PATH to your private key location."
  exit 1
fi

# ── Validate local files ─────────────────────────────────────────────────────
files_to_upload=()

if [[ -f "$DIST_DIR/sitemap.xml" ]]; then
  files_to_upload+=("$DIST_DIR/sitemap.xml")
  echo "✅ Found dist/sitemap.xml"
else
  echo "❌ dist/sitemap.xml not found — run 'npm run build' first"
  exit 1
fi

if [[ -f "$DIST_DIR/robots.txt" ]]; then
  files_to_upload+=("$DIST_DIR/robots.txt")
  echo "✅ Found dist/robots.txt"
else
  echo "⚠️  dist/robots.txt not found — skipping (not critical)"
fi

# ── Upload via scp ───────────────────────────────────────────────────────────
echo ""
echo "🚀 Uploading to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}..."
echo ""

SCP_OPTS=(
  -P "$REMOTE_PORT"
  -i "$SSH_KEY_PATH"
  -o "StrictHostKeyChecking=yes"
  -o "ConnectTimeout=30"
)

for file in "${files_to_upload[@]}"; do
  filename=$(basename "$file")
  echo "   📤 ${filename}..."

  if scp "${SCP_OPTS[@]}" "$file" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/${filename}"; then
    echo "   ✅ ${filename} uploaded successfully"
  else
    echo "   ❌ Failed to upload ${filename}"
    exit 1
  fi
done

echo ""
echo "🎉 Sitemap deployment complete!"
echo "   Verify at: https://$(echo "$REMOTE_HOST" | sed 's/[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*/nairobidevops.org/')/sitemap.xml"
