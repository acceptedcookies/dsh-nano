#!/bin/sh
# Kitesurf's own dev server is workerd, started by wrangler.
# Set CELLD_BUCKET to hand the same port to celld instead. celld implements
# worker_loaders, which the engine requires. This image does not download celld.
set -eu

home="${KITESURF_HOME:-/opt/kitesurf}"
port="${KITESURF_PORT:-8787}"

# Supervise the MCP bridge: if it crashes, restart rather than leaving the
# published 8791 port dead while the engine keeps running.
( while :; do MCP_BRIDGE_DEBUG="${MCP_BRIDGE_DEBUG:-}" node /mcp-bridge.mjs; echo "mcp-bridge exited — restarting in 2s" >&2; sleep 2; done ) &

if [ -n "${CELLD_BUCKET:-}" ]; then
  if ! command -v celld >/dev/null 2>&1; then
    echo "celld: CELLD_BUCKET is set but the celld binary is not in this image" >&2
    exit 1
  fi
  echo "celld: ${CELLD_BUCKET}" >&2
  exec celld --bucket "$CELLD_BUCKET" --listen "0.0.0.0:${port}"
fi

config="$home/packages/engine/wrangler.jsonc"
if [ ! -f "$config" ]; then
  echo "kitesurf: $config is missing. Mount a built checkout at $home." >&2
  exit 1
fi

cd "$home/packages/engine"
# The checkout bind-mount is read-only, so wrangler's persistent state goes
# to the writable container filesystem instead of .wrangler/ in the mount.
state="${KITESURF_STATE_DIR:-/var/lib/kitesurf-state}"
mkdir -p "$state"
exec wrangler dev --env local -c wrangler.jsonc --port "$port" --ip 0.0.0.0 --persist-to "$state"
