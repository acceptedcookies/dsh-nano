# Kitesurf's workerd binary is glibc (interpreter /lib/ld-linux-aarch64.so.1).
# Alpine 3.22 plus gcompat fails at process start:
#   Error relocating workerd: __res_init: symbol not found
# celld's own published image is Debian 12, not Alpine. This image follows that.
#
# The builder VM's npm registry connection stalls, so linux-prefix is produced
# on the host and is not committed:
#   npm install --prefix linux-prefix --os=linux --cpu=arm64 wrangler@4 agent-browser@0.42.0
# Build from a context that contains linux-prefix/, entrypoint.sh, and mcp-bridge.mjs.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

COPY linux-prefix /opt/npm-global
COPY entrypoint.sh /entrypoint.sh
COPY --chown=node:node --chmod=644 mcp-bridge.mjs /mcp-bridge.mjs
# linux-prefix is npm-installed --ignore-scripts on the host, so
# agent-browser's bundled binaries arrive without their exec bits and the
# node user cannot chmod root-owned files — set them while still root.
RUN chmod 755 /entrypoint.sh \
  && chmod 755 /opt/npm-global/node_modules/agent-browser/bin/agent-browser-linux-* \
  && ln -sf /opt/npm-global/node_modules/.bin/wrangler /usr/local/bin/wrangler \
  && ln -sf /opt/npm-global/node_modules/.bin/agent-browser /usr/local/bin/agent-browser \
  && mkdir -p /tmp/kitesurf-state && chown -R node:node /tmp/kitesurf-state

# Run unprivileged: the image reads a read-only host mount; a compromised
# process must not be able to write the checkout or run as root.
USER node

ENV PATH="/opt/npm-global/node_modules/.bin:${PATH}" \
    KITESURF_HOME=/opt/kitesurf \
    KITESURF_PORT=8787 \
    KITESURF_MCP_PORT=8791 \
    AGENT_BROWSER_CDP=ws://127.0.0.1:8787/devtools/browser

EXPOSE 8787 8791
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
