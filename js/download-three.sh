#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p jsm/controls jsm/loaders jsm/libs jsm/curves

download() {
  local url="$1"
  local target="$2"
  echo "Downloading $target"
  curl -L "$url" -o "$target"
}

download_all() {
  local base="$1"
  download "$base/build/three.module.js" "three.module.js" \
    && download "$base/examples/jsm/controls/OrbitControls.js" "jsm/controls/OrbitControls.js" \
    && download "$base/examples/jsm/loaders/FBXLoader.js" "jsm/loaders/FBXLoader.js" \
    && download "$base/examples/jsm/libs/fflate.module.js" "jsm/libs/fflate.module.js" \
    && download "$base/examples/jsm/curves/NURBSCurve.js" "jsm/curves/NURBSCurve.js" \
    && download "$base/examples/jsm/curves/NURBSUtils.js" "jsm/curves/NURBSUtils.js"
}

fix_three_import() {
  local file="$1"
  perl -pi -e "s/from 'three';/from '..\\/..\\/three.module.js';/g; s/from \"three\";/from \"..\\/..\\/three.module.js\";/g" "$file"
}

SOURCE=""
if download_all "https://cdn.jsdelivr.net/npm/three@0.160.1"; then
  SOURCE="jsDelivr"
elif download_all "https://unpkg.com/three@0.160.1"; then
  SOURCE="unpkg"
else
  echo "Download failed from both jsDelivr and unpkg."
  exit 1
fi

fix_three_import "jsm/controls/OrbitControls.js"
fix_three_import "jsm/loaders/FBXLoader.js"
fix_three_import "jsm/curves/NURBSCurve.js"
fix_three_import "jsm/curves/NURBSUtils.js"

echo "Download success from $SOURCE."
echo "Imports fixed for local browser ESM usage."
