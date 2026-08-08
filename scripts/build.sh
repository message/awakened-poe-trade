#!/usr/bin/env bash
# Builds renderer and main from a clean clone.
# Usage: ./scripts/build.sh
# Optional: CSC_NAME="Certificate name" ./scripts/build.sh  (code-signing for main's package step)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> renderer: npm ci"
cd "$ROOT_DIR/renderer"
npm ci

echo "==> renderer: npm run make-index-files"
npm run make-index-files

echo "==> renderer: npm run build"
npm run build

echo "==> main: npm ci"
cd "$ROOT_DIR/main"
npm ci

echo "==> main: npm run build"
npm run build

echo "==> main: npm run package"
echo "    (set CSC_NAME=\"Certificate name\" to sign the build; without it, packaging still runs but is unsigned)"
npm run package

echo "==> Build complete."
