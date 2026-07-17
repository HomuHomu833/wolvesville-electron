#!/usr/bin/env bash
# Ad-hoc signs a macOS .app with entitlements via ldid. Unlike codesign, ldid
# keeps restricted entitlements (disable-library-validation, etc.) without an
# Apple cert — needed so the app can load the unsigned Discord SDK dylib.
# Usage: scripts/mac-sign.sh <path-to-.app> <entitlements.plist>
set -euo pipefail

APP="${1:?usage: mac-sign.sh <app> <entitlements>}"
ENT="${2:?usage: mac-sign.sh <app> <entitlements>}"

if ! command -v ldid >/dev/null 2>&1; then
  echo "error: ldid not found (install with: brew install ldid)" >&2
  exit 1
fi

echo "Signing Mach-O binaries in $APP with entitlements $ENT"

# Sign every Mach-O (helpers, framework, .node, dylibs, main exe).
find "$APP" -type f -print0 | while IFS= read -r -d '' f; do
  if file "$f" | grep -q "Mach-O"; then
    ldid -S"$ENT" "$f" || true
  fi
done

# Re-sign the top-level executable(s) last.
for exe in "$APP/Contents/MacOS/"*; do
  [ -f "$exe" ] && ldid -S"$ENT" "$exe"
done

echo "Done."
