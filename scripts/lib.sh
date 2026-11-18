#!/usr/bin/env bash
# Shared search helper: prefer ripgrep, fall back to grep -RE.
resolve_search() {
  if command -v rg >/dev/null 2>&1; then
    echo rg
  elif [[ -x /opt/homebrew/bin/rg ]]; then
    echo /opt/homebrew/bin/rg
  elif [[ -x /usr/local/bin/rg ]]; then
    echo /usr/local/bin/rg
  else
    echo grep
  fi
}
