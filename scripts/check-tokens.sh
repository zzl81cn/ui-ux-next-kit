#!/usr/bin/env bash
# Scan hardcoded colors, inline styles, !important, Tailwind arbitrary values.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "$DIR/lib.sh"
ROOT="${1:-.}"
cd "$ROOT"
TOOL="$(resolve_search)"

echo "=== ui-ux-next-audit: check-tokens ==="
echo "cwd: $(pwd)"
echo "search: $TOOL"
echo

if [[ "$TOOL" != "grep" ]]; then
  EX=(--glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/.next/**')
  echo "--- hardcoded #hex / rgb(a) ---"
  "$TOOL" -n --count-matches '#[0-9a-fA-F]{3,8}\b|rgba?\(' --glob '*.{tsx,jsx,vue,css,less,scss}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -40 || true
  echo; echo "sample:"; "$TOOL" -n '#[0-9a-fA-F]{3,8}\b|rgba?\(' --glob '*.{tsx,jsx,vue,css,less,scss}' "${EX[@]}" . 2>/dev/null | head -30 || true
  echo; echo "--- inline style ---"
  "$TOOL" -n --count-matches 'style=\{\{|:style=' --glob '*.{tsx,jsx,vue}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -30 || true
  echo; echo "--- !important ---"
  "$TOOL" -n --count-matches '!important' --glob '*.{css,less,scss,tsx,jsx,vue}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -30 || true
  echo; echo "--- Tailwind arbitrary ---"
  "$TOOL" -n --count-matches '[a-z]+-\[[^\]]+\]' --glob '*.{tsx,jsx,vue}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -20 || true
else
  echo "(ripgrep not installed; using grep -RE. Prefer: brew install ripgrep)"
  echo "--- hardcoded #hex / rgb(a) sample ---"
  grep -REn --include='*.css' --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.less' --include='*.scss' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next \
    '#[0-9a-fA-F]{3,8}|rgba?\(' . 2>/dev/null | head -40 || true
  echo; echo "--- inline style sample ---"
  grep -REn --include='*.tsx' --include='*.jsx' --include='*.vue' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
    'style=\{\{|:style=' . 2>/dev/null | head -30 || true
  echo; echo "--- !important sample ---"
  grep -REn --include='*.css' --include='*.less' --include='*.scss' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
    '!important' . 2>/dev/null | head -30 || true
fi
echo; echo "Done. Exclude Token definition files when interpreting counts."
