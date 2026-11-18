#!/usr/bin/env bash
# Scan .ant-/.el-/.arco- overrides, native controls, z-index, confirm().
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/lib.sh"
ROOT="${1:-.}"
cd "$ROOT"
TOOL="$(resolve_search)"

echo "=== ui-ux-next-audit: check-globals ==="
echo "cwd: $(pwd)"
echo "search: $TOOL"
echo

if [[ "$TOOL" != "grep" ]]; then
  EX=(--glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/.next/**')
  echo "--- .ant- / .el- / .arco- ---"
  "$TOOL" -n --count-matches '\.ant-|\.el-|\.arco-' --glob '*.{css,less,scss,tsx,vue}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -40 || true
  echo; "$TOOL" -n '\.ant-|\.el-|\.arco-' --glob '*.{css,less,scss,tsx,vue}' "${EX[@]}" . 2>/dev/null | head -25 || true
  echo; echo "--- native table/button/select ---"
  "$TOOL" -n --count-matches '<table|<button|<select' --glob '*.{tsx,jsx,vue}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -30 || true
  echo; echo "--- z-index ---"
  "$TOOL" -n --count-matches 'z-index|zIndex' --glob '*.{css,less,scss,tsx,jsx,vue,ts,js}' "${EX[@]}" . 2>/dev/null | sort -t: -k2 -nr | head -30 || true
  echo; echo "--- confirm / alert ---"
  "$TOOL" -n 'window\.confirm\(|[^.\w]confirm\(|\balert\(' --glob '*.{tsx,jsx,ts,js,vue}' "${EX[@]}" . 2>/dev/null | head -40 || true
else
  echo "(ripgrep not installed; using grep -RE)"
  echo "--- .ant- / .el- / .arco- sample ---"
  grep -REn --include='*.css' --include='*.less' --include='*.scss' --include='*.tsx' --include='*.vue' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
    '\.ant-|\.el-|\.arco-' . 2>/dev/null | head -40 || true
  echo; echo "--- confirm / alert sample ---"
  grep -REn --include='*.js' --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.vue' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
    'window\.confirm\|confirm(\|alert(' . 2>/dev/null | head -40 || true
fi
echo; echo "Done."
