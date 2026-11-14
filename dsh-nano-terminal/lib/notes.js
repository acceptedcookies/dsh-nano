// src/host/errors.js
var KIND = Object.freeze({
  NOT_FOUND: "not_found",
  // no such session/address/name
  BLOCKED: "blocked",
  // target reported blocked; send refused (use force)
  FINISHED: "finished",
  // terminal exited; operation needs a live one
  LIVE: "live",
  // operation requires a finished/inactive terminal
  UNAVAILABLE: "unavailable",
  // transiently not usable (recovering/attaching)
  SPAWN_FAILED: "spawn_failed",
  // backend refused to start the program
  CONFLICT: "conflict",
  // request contradicts current state
  STATUS_MISMATCH: "status_mismatch",
  // --if condition not met
  NAME_TAKEN: "name_taken",
  // requested name already bound
  NEEDS_TARGET: "needs_target",
  // ambiguous/unspecified target
  INCOMPATIBLE: "incompatible",
  // protocol/version/capability mismatch
  LIMIT: "limit",
  // resource cap reached (session count, body size)
  INVALID: "invalid"
  // malformed argument
});
function err(kind, message, extra) {
  const e = new Error(message);
  e.kind = kind;
  if (extra) Object.assign(e, extra);
  return e;
}

// src/host/notes.js
var MAX_NOTE = 32 * 1024;
var noteSeq = 0;
function makeEnvelope(fromAddr, body, id = null) {
  const nid = id ?? `n${++noteSeq}`;
  return `<dnt from=${fromAddr} id=${nid}>
${body}
</dnt>
`;
}
async function sendNote(registry, fromRef, toRef, body) {
  if (!body?.trim()) throw err(KIND.INVALID, "empty note");
  if (body.length > MAX_NOTE) throw err(KIND.INVALID, `note exceeds ${MAX_NOTE} bytes`);
  const to = registry.resolve(toRef);
  if (!to) throw err(KIND.NOT_FOUND, `no such terminal '${toRef}'`);
  if (to.exited) throw err(KIND.FINISHED, "target exited");
  if (!to.handle) throw err(KIND.UNAVAILABLE, "target not spawned (attach to wake)");
  const from = registry.resolve(fromRef);
  const fromAddr = from?.addr ?? String(fromRef ?? "external");
  const env = makeEnvelope(fromAddr, body);
  const payload = `\x1B[200~${env}\x1B[201~`;
  await to.gate.submit(() => to.handle.write(payload), { kind: "note" });
  registry.bus?.emit("message", to.addr, { id: to.id, from: fromAddr, note: true });
  registry.audit?.({ op: "note", from: fromAddr, to: to.addr, bytes: env.length });
  return env.match(/id=([^ >]+)/)?.[1] ?? `n${noteSeq}`;
}
function parseEnvelopes(text) {
  const out = [];
  const re = /<dnt from=(\S+)(?:\s+id=(\S+))?>\n([\s\S]*?)\n<\/dnt>/g;
  let m;
  while (m = re.exec(text)) {
    out.push({ from: m[1], id: m[2] ?? null, body: m[3] });
  }
  return out;
}
export {
  makeEnvelope,
  parseEnvelopes,
  sendNote
};
