#!/usr/bin/env bash
set -euo pipefail

#
# Prepares the Node.js project for Android packaging.
# Copies the server code to nodejs-assets/nodejs-project/
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${SERVER_DIR:-$(cd "${ROOT_DIR}/.." && pwd)}"
OUTPUT_DIR="${ROOT_DIR}/nodejs-assets/nodejs-project"

echo "=== UniFi Voucher Android - Node.js Project Preparation ==="
echo ""
echo "Server source: ${SERVER_DIR}"
echo "Output directory: ${OUTPUT_DIR}"
echo ""

# Check if server exists
if [[ ! -f "${SERVER_DIR}/server.js" ]]; then
    echo "[ERROR] server.js not found in ${SERVER_DIR}"
    echo "Make sure you're running this script from the android-wrapper directory"
    echo "and the parent directory contains the UniFi Voucher server code."
    exit 1
fi

# Clean previous build
echo "[1/5] Cleaning previous build..."
rm -rf "${OUTPUT_DIR:?}/node_modules"
rm -rf "${OUTPUT_DIR:?}/public/dist"

# Ensure output directory exists
mkdir -p "${OUTPUT_DIR}"

# Copy server files
echo "[2/5] Copying server files..."
rsync -av --delete \
    --exclude='.git' \
    --exclude='.github' \
    --exclude='android-wrapper' \
    --exclude='node_modules' \
    --exclude='.docs' \
    --exclude='dist' \
    --exclude='.options.json' \
    --exclude='*.md' \
    --exclude='docker-compose*.yml' \
    --exclude='Dockerfile' \
    --exclude='.gitignore' \
    --exclude='.dockerignore' \
    --exclude='crowdin.yml' \
    "${SERVER_DIR}/" "${OUTPUT_DIR}/"

# Keep main.js (our entry point)
cp "${ROOT_DIR}/nodejs-assets/nodejs-project/main.js" "${OUTPUT_DIR}/main.js" 2>/dev/null || true

# Install dependencies
echo "[3/5] Installing production dependencies..."
pushd "${OUTPUT_DIR}" >/dev/null
npm ci --omit=dev
popd >/dev/null

# Build CSS
echo "[4/5] Building CSS..."
pushd "${OUTPUT_DIR}" >/dev/null
npm run build
popd >/dev/null

# Cleanup unnecessary files
echo "[5/5] Cleaning up..."
pushd "${OUTPUT_DIR}" >/dev/null

# Remove dev files from node_modules
find node_modules -type f -name "*.md" -delete 2>/dev/null || true
find node_modules -type f -name "*.ts" -delete 2>/dev/null || true
find node_modules -type f -name "*.map" -delete 2>/dev/null || true
find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true

popd >/dev/null

# Calculate size
SIZE=$(du -sh "${OUTPUT_DIR}" | cut -f1)

echo ""
echo "=== Preparation Complete ==="
echo ""
echo "Output: ${OUTPUT_DIR}"
echo "Size: ${SIZE}"
echo ""
echo "Next steps:"
echo "1. Open the android-wrapper project in Android Studio"
echo "2. Build the APK: ./gradlew assembleDebug"
echo "3. Install on device: adb install app/build/outputs/apk/debug/app-debug.apk"
echo ""
