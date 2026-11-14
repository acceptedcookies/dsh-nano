#!/usr/bin/env bash
# probe.sh — one-shot Kitesurf health probe for the authenticated dsh host.
# Run inside an authenticated Harness page (page.fetch) or with the dsh-auth
# cookie jar:   ./probe.sh [https://dsh-dev.local]
# Prints status, phase, engine liveness, targets and generated hints.
set -euo pipefail
BASE="${1:-https://dsh-dev.local}"
JAR="${DSH_COOKIE_JAR:-}"

req() { # req <path> [method] [json-body]
  local path="$1" method="${2:-GET}" body="${3:-}"
  if [ -n "$JAR" ]; then
    curl -sS -b "$JAR" -X "$method" -H 'content-type: application/json' \
      ${body:+--data "$body"} "$BASE$path"
  else
    echo "(no \$DSH_COOKIE_JAR — use page.fetch inside the page instead)" >&2
    return 1
  fi
}

echo "=== /status ==="
req /nano-kitesurf/status
echo
echo "=== /diagnostics?limit=10 (hints) ==="
req '/nano-kitesurf/diagnostics?limit=10'
echo
echo "=== /operations?errorsOnly=true ==="
req '/nano-kitesurf/operations?errorsOnly=true'
echo
echo "=== /ports ==="
req /nano-kitesurf/ports
echo
