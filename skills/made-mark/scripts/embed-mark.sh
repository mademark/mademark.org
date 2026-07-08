#!/usr/bin/env bash
# Embed a Made Mark XMP assertion into an image, video, or PDF deliverable.
#
# Usage:
#   embed-mark.sh <file> <mark-slug> [model] [provider] [source-license]
#
#   mark-slug: human-made | human-designed-ai-made | ai-made
#
# Requires ExifTool (https://exiftool.org). Install:
#   macOS:   brew install exiftool
#   Debian:  apt-get install libimage-exiftool-perl
#
# Writes to the same https://mademark.org/ns/ namespace documented at
# https://mademark.org/downloads/ under "For developers" (XMP block), using
# a "made:" prefix instead of the spec doc's illustrative "mm:" — see
# mademark.exiftool.config for why. Any XMP-aware tool resolves this by
# namespace URI, not prefix string, so it reads back the same either way.

set -euo pipefail

file="${1:-}"
mark="${2:-}"
model="${3:-}"
provider="${4:-}"
license="${5:-}"

if [[ -z "$file" || -z "$mark" ]]; then
  echo "Usage: embed-mark.sh <file> <mark-slug> [model] [provider] [source-license]" >&2
  exit 1
fi

if [[ ! -f "$file" ]]; then
  echo "error: file not found: $file" >&2
  exit 1
fi

case "$mark" in
  human-made|human-designed-ai-made|ai-made) ;;
  *)
    echo "error: mark-slug must be one of human-made, human-designed-ai-made, ai-made" >&2
    exit 1
    ;;
esac

if ! command -v exiftool >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: exiftool not found.

Install it, then re-run this script:
  macOS:   brew install exiftool
  Debian:  apt-get install libimage-exiftool-perl

Until it's installed, the mark cannot be embedded in the file itself.
Fall back to noting the mark in a caption, filename, or accompanying text
as described in SKILL.md.
EOF
  exit 2
fi

mark_url="https://mademark.org/marks/${mark}"
config="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mademark.exiftool.config"

args=(
  -config "$config"
  -overwrite_original
  "-XMP-mademark:Mark=${mark_url}"
)
[[ -n "$model" ]]    && args+=("-XMP-mademark:Model=${model}")
[[ -n "$provider" ]] && args+=("-XMP-mademark:Provider=${provider}")
[[ -n "$license" ]]  && args+=("-XMP-mademark:SourceLicense=${license}")

exiftool "${args[@]}" "$file"

echo "Embedded Made Mark XMP (${mark}) into: ${file}"
echo "Verify with: exiftool -config \"${config}\" -XMP-mademark:all \"${file}\""
