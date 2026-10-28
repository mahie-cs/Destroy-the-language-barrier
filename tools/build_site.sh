#!/usr/bin/env bash
# Assembles the files that get published into a folder (default: _site).
# CI runs this; you can run it locally too:  bash tools/build_site.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r index.html manifest.webmanifest sw.js css js data icons "$OUT"/
if [ -d audio ]; then cp -r audio "$OUT"/; fi
BUILD="${GITHUB_SHA:-dev}"
sed -i.bak "s/__BUILD__/${BUILD:0:7}/" "$OUT/sw.js" && rm -f "$OUT/sw.js.bak"
touch "$OUT/.nojekyll"
echo "Built $OUT (build ${BUILD:0:7})"
