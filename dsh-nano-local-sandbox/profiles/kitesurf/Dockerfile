# Kitesurf's workerd binary is glibc (interpreter /lib/ld-linux-aarch64.so.1).
# Alpine 3.22 plus gcompat fails at process start:
#   Error relocating workerd: __res_init: symbol not found
# celld's own published image is Debian 12, not Alpine. This image follows that.
#
# linux-prefix is produced on the host from profile.yaml build.npmPrefix;
# it is not committed. The build driver also supplies build.base as the ARG,
# so the profile remains the only recipe authority.
# Build from a context that contains linux-prefix/, entrypoint.sh, and mcp-bridge.mjs.
ARG KITESURF_BASE_IMAGE
FROM ${KITESURF_BASE_IMAGE}

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini python3 python3-pyte \
  && rm -rf /var/lib/apt/lists/*

COPY linux-prefix /opt/npm-global
COPY entrypoint.sh /entrypoint.sh
COPY --chown=node:node --chmod=644 mcp-bridge.mjs /mcp-bridge.mjs
# Terminal broker helpers and the host-owned health writer: baked root-owned
# and not user-writable. The PTY worker itself drops to the node user inside
# the PTY child; public-health.mjs runs only via `container exec --user 0:0`.
COPY --chown=root:root --chmod=0555 pty-entry.mjs pty-worker.py public-health.mjs relay-credential.mjs /opt/dnls/
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

# AGENT_BROWSER_CDP points at the bridge's /cdp relay, not the engine directly:
# every engine connection owns a private page at this pin, so a direct socket
# would land the agent in its own about:blank while the human sees another.
ENV PATH="/opt/npm-global/node_modules/.bin:${PATH}" \
    DNLS_HOME=/opt/kitesurf \
    DNLS_PORT=8787 \
    DNLS_MCP_PORT=8791 \
    AGENT_BROWSER_CDP=ws://127.0.0.1:8791/cdp \
    KITESURF_CDP_UPSTREAM=ws://127.0.0.1:8787/devtools/browser

EXPOSE 8787 8791
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
