#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${1:-.}"
bash "$DIR/check-tokens.sh" "$ROOT"
echo
bash "$DIR/check-globals.sh" "$ROOT"
