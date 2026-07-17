#!/usr/bin/env bash
# Ad-hoc signs a packaged macOS .app and embeds entitlements using ldid.
#
# We use ldid instead of Apple's codesign because the build has no Apple
# Developer certificate, and codesign strips "restricted" entitlements
# (disable-library-validation, allow-dyld-environment-variables) from an ad-hoc
# signature. ldid embeds them verbatim, which is what lets the app load the
# unsigned Discord SDK dylib and run JIT.
#
# Usage: scripts/mac-sign.sh <path-to-.app> <entitlements.plist>
set -euo pipefail

APP="${1:?usage: mac-sign.sh <app> <entitlements>}"
ENT="${2:?usage: mac-sign.sh <app> <entitlements>}"

if ! command -v ldid >/dev/null 2>&1; then
  echo "error: ldid not found (install with: brew install ldid)" >&2
  exit 1
fi

echo "Signing Mach-O binaries in $APP with entitlements $ENT"

# Sign every Mach-O binary (helpers, framework, .node, dylibs, main exe).
# Entitlements on libraries are ignored, so applying them everywhere is safe.
find "$APP" -type f -print0 | while IFS= read -r -d '' f; do
  if file "$f" | grep -q "Mach-O"; then
    ldid -S"$ENT" "$f" || true
  fi
done

# Re-sign the top-level executable(s) last so the bundle seal is outermost.
for exe in "$APP/Contents/MacOS/"*; do
  [ -f "$exe" ] && ldid -S"$ENT" "$exe"
done

echo "Done."
