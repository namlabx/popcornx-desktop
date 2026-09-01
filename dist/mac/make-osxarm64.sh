#!/usr/bin/env bash
# dist/mac/make-osxarm64.sh
# Build a proper macOS ARM64 .app bundle for Popcorn Time
# Usage: bash dist/mac/make-osxarm64.sh <nwVersion> <buildDir> <appName> <version> [downloadUrl]
#
# Key difference from gulp dist:
#  - Downloads arm64-specific NW.js binary directly (nwjs-sdk-v*-osx-arm64.zip)
#  - Packages with `ditto` to preserve macOS .app symlinks (gulp-zip breaks them,
#    causing "damaged" errors when macOS tries to open the extracted app)

set -euo pipefail

NW_VERSION="${1:-0.86.0}"
BUILD_DIR="${2:-build}"
APP_NAME="${3:-Popcorn-Time}"
APP_VERSION="${4:-0.6.0}"
DOWNLOAD_URL="${5:-https://popcorn-time.serv00.net/nw/}"
DOWNLOAD_URL="${DOWNLOAD_URL%/}" # Strip trailing slash if present
PLATFORM="osxarm64"
NW_FLAVOR="sdk"
NW_TARBALL="nwjs-${NW_FLAVOR}-v${NW_VERSION}-osx-arm64.zip"
CACHE_DIR="cache/nwjs-${NW_FLAVOR}-v${NW_VERSION}-osx-arm64"
APP_DIR="${BUILD_DIR}/${APP_NAME}/${PLATFORM}"
RELEASE_APP="${APP_DIR}/nwjs.app"
FINAL_APP="${APP_DIR}/${APP_NAME}.app"
ZIP_NAME="${APP_NAME}-${APP_VERSION}-${PLATFORM}.zip"
ZIP_OUT="${BUILD_DIR}/${ZIP_NAME}"

echo "=== Building ${APP_NAME} for ${PLATFORM} (NW.js v${NW_VERSION}) ==="
echo "    Version: ${APP_VERSION}"
echo "    Mirror:  ${DOWNLOAD_URL}"

# --- Step 1: Get NW.js osx-arm64 binary ---
if [ -d "${CACHE_DIR}" ] && [ -d "${CACHE_DIR}/nwjs.app" ]; then
  echo "[cache hit] Using cached NW.js at ${CACHE_DIR}"
else
  echo "[download] Fetching ${NW_TARBALL} from ${DOWNLOAD_URL}/v${NW_VERSION}/ ..."
  mkdir -p "$(dirname "${CACHE_DIR}")"
  TMP_ZIP="$(mktemp /tmp/nwjs-arm64.XXXXXX).zip"
  curl -fSL --retry 3 --retry-delay 5 \
    "${DOWNLOAD_URL}/v${NW_VERSION}/${NW_TARBALL}" -o "${TMP_ZIP}"
  echo "[download] Extracting..."
  TMP_EXTRACT="$(mktemp -d /tmp/nwjs-extract.XXXXXX)"
  unzip -q "${TMP_ZIP}" -d "${TMP_EXTRACT}"
  EXTRACTED_DIR="$(ls "${TMP_EXTRACT}" | head -1)"
  # Use ditto to preserve any existing symlinks in nwjs
  ditto "${TMP_EXTRACT}/${EXTRACTED_DIR}" "${CACHE_DIR}"
  rm -rf "${TMP_ZIP}" "${TMP_EXTRACT}"
  echo "[download] Cached to ${CACHE_DIR}"
fi

# --- Step 2: Set up app directory ---
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}"

# Copy nwjs.app using ditto (preserves symlinks & resource forks)
echo "[step 2] Copying nwjs.app to ${APP_DIR}..."
ditto "${CACHE_DIR}/nwjs.app" "${RELEASE_APP}"

# --- Step 3: Inject app source files into app.nw ---
APP_NW_DIR="${RELEASE_APP}/Contents/Resources/app.nw"
mkdir -p "${APP_NW_DIR}"

echo "[step 3] Injecting app source into app.nw..."
# Source files
cp -r src "${APP_NW_DIR}/"
cp package.json "${APP_NW_DIR}/"
[ -f README.md ]    && cp README.md    "${APP_NW_DIR}/" || true
[ -f CHANGELOG.md ] && cp CHANGELOG.md "${APP_NW_DIR}/" || true
[ -f LICENSE.txt ]  && cp LICENSE.txt  "${APP_NW_DIR}/" || true
[ -f git.json ]     && cp git.json     "${APP_NW_DIR}/" || true

# Copy prod node_modules using yarn list
echo "[step 3] Copying node_modules (prod)..."
mkdir -p "${APP_NW_DIR}/node_modules"

# Export the target dir for the Node.js script
export APP_NW_MOD_DEST="${APP_NW_DIR}/node_modules"
node - << 'NODEEOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dest = process.env.APP_NW_MOD_DEST;

let mods = [];
try {
  const out = execSync('yarn list --prod --json', { maxBuffer: 1024 * 1024 * 20 }).toString();
  const data = JSON.parse(out);
  mods = data.data.trees.map(obj => obj.name.replace(/@[\d.]+$/, ''));
} catch(e) {
  console.error('yarn list failed, copying all node_modules:', e.message);
  mods = fs.readdirSync('node_modules').filter(n => !n.startsWith('.') && n !== '.bin');
}
mods.push('cheerio');
mods = [...new Set(mods)];

let copied = 0;
for (const mod of mods) {
  const src = path.join('node_modules', mod);
  if (fs.existsSync(src)) {
    try {
      execSync('ditto ' + JSON.stringify(src) + ' ' + JSON.stringify(path.join(dest, mod)));
      copied++;
    } catch(e) { /* skip on error */ }
  }
}
console.log('Copied ' + copied + '/' + mods.length + ' modules');
NODEEOF

# --- Step 4: Replace icon ---
if [ -f "src/app/images/butter.icns" ]; then
  echo "[step 4] Applying custom icon..."
  cp "src/app/images/butter.icns" "${RELEASE_APP}/Contents/Resources/app.icns"
fi

# --- Step 5: Rename nwjs.app -> APP_NAME.app ---
echo "[step 5] Renaming nwjs.app -> ${APP_NAME}.app..."
mv "${RELEASE_APP}" "${FINAL_APP}"

# Update Info.plist bundle name
PLIST="${FINAL_APP}/Contents/Info.plist"
if command -v plutil &>/dev/null && [ -f "${PLIST}" ]; then
  plutil -replace CFBundleName        -string "${APP_NAME}" "${PLIST}" 2>/dev/null || true
  plutil -replace CFBundleDisplayName -string "${APP_NAME}" "${PLIST}" 2>/dev/null || true
fi

# --- Step 6: Zip with ditto (preserves symlinks + xattrs, no "damaged" errors) ---
mkdir -p "${BUILD_DIR}"
rm -f "${ZIP_OUT}"
echo "[step 6] Creating ${ZIP_OUT} with ditto..."
# -c -k = create zip  --keepParent = include parent folder in zip
ditto -c -k --keepParent --sequesterRsrc "${FINAL_APP}" "${ZIP_OUT}"

echo ""
echo "=== Done! ==="
ls -lh "${ZIP_OUT}"
