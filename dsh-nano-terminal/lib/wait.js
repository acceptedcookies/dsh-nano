// src/host/wait.js
var POLL_MS = 200;
function waitFor(rec, registry, bus, { output = null, children = null, timeoutMs = 18e4 } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const seen = /* @__PURE__ */ new Set();
    const finish = (reason, extra = {}) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(poll);
      unsub();
      resolve({ reason, turn: rec.turn, ...extra });
    };
    const unsub = bus.subscribe((ev) => {
      if (ev.type !== "snapshot") {
        if (ev.addr === rec.addr && ev.type === "finished") return finish("exit");
        if (ev.addr === rec.addr && ev.type === "status") {
          if (ev.status?.state !== "working" && rec.status?.state !== "working") return finish("status");
          if (ev.status?.state !== "working") return finish("status");
        }
        if (ev.addr === rec.addr && ev.type === "message") return finish("message");
        if (children && (ev.type === "status" || ev.type === "finished" || ev.type === "message")) {
          checkChildren();
        }
        return;
      }
    });
    const checkChildren = () => {
      if (!children) return;
      const kids = registry.childrenOf(rec);
      if (children === "all") {
        if (kids.length && kids.every((k) => k.exited || k.status?.state !== "working")) finish("children");
      } else if (children === "any") {
        for (const k of kids) {
          if (seen.has(k.id)) continue;
          if (k.exited || k.status?.state && k.status.state !== "working") {
            seen.add(k.id);
            finish("children", { child: k.addr });
          }
        }
      }
    };
    const poll = setInterval(() => {
      if (done) return;
      if (rec.exited) return finish("exit");
      if (rec.status && rec.status.state !== "working") return finish("status");
      if (output) {
        const text = rec.screenText(60, "detection");
        if (text.includes(output)) return finish("output");
      }
      checkChildren();
    }, POLL_MS);
    poll.unref?.();
    const timer = setTimeout(() => finish("timeout"), timeoutMs);
    timer.unref?.();
    if (rec.exited) return finish("exit");
    if (rec.status && rec.status.state !== "working") return finish("status");
    checkChildren();
  });
}
var NAMED_KEYS = {
  enter: "\r",
  esc: "\x1B",
  tab: "	",
  backspace: "\x7F",
  "ctrl+c": "",
  "ctrl+d": "",
  "ctrl+z": "",
  "ctrl+u": "",
  up: "\x1B[A",
  down: "\x1B[B",
  right: "\x1B[C",
  left: "\x1B[D",
  f1: "\x1BOP",
  f2: "\x1BOQ",
  f3: "\x1BOR",
  f4: "\x1BOS",
  f5: "\x1B[15~",
  f6: "\x1B[17~",
  f7: "\x1B[18~",
  f8: "\x1B[19~",
  f9: "\x1B[20~",
  f10: "\x1B[21~",
  f11: "\x1B[23~",
  f12: "\x1B[24~"
};
export {
  NAMED_KEYS,
  waitFor
};
