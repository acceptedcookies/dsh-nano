#!/usr/bin/env bash
# probe.sh — one-shot Kitesurf health probe for the authenticated dsh host.
# The host's base URL is YOUR deployment's: pass it explicitly. Never ship a
# hard-coded hostname — every profile/dev machine serves a different origin.
#   ./probe.sh <your-dsh-base-url>        e.g. ./probe.sh http://127.0.0.1:3083
# Run inside an authenticated Harness page (page.fetch) or with the dsh-auth
# cookie jar:   DSH_COOKIE_JAR=<jar> ./probe.sh <base-url>
# Prints status, phase, engine liveness, targets and generated hints.
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "usage: $0 <dsh-base-url>   # your deployment's host:port, no default" >&2
  exit 2
fi
BASE="$1"
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
req /nano-local-sandbox/status
echo
echo "=== /diagnostics?limit=10 (hints) ==="
req '/nano-local-sandbox/diagnostics?limit=10'
echo
echo "=== /diagnostics errorCatalog ==="
req '/nano-local-sandbox/diagnostics?catalog=1'
echo
echo "=== /ports ==="
req /nano-local-sandbox/ports
echo
