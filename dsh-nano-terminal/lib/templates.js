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

// src/host/templates.js
var TEMPLATES = {
  // fire a command, wait for its next turn end (or exit), return screen tail
  "run-command": {
    summary: "send a command, wait for the turn to finish, return output",
    params: ["cmd", "timeout?"],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      await rec.agentSend(args.cmd, { enter: true });
      const w = await waitFor(rec, registry, bus, { timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(200, "recent") };
    }
  },
  // tail a long-running command: wait for an output pattern instead of a turn
  "wait-output": {
    summary: "send a command, wait for a screen pattern (not a turn end)",
    params: ["cmd", "output", "timeout?"],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      if (!args.output) throw err(KIND.INVALID, "wait-output needs {output}");
      await rec.agentSend(args.cmd, { enter: true });
      const w = await waitFor(rec, registry, bus, { output: args.output, timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(60, "detection") };
    }
  },
  // REPL loop: send one expression, wait for the prompt line back
  repl: {
    summary: "send an expression into a running REPL, wait for the next prompt",
    params: ["expr", "prompt?", "timeout?"],
    async run(rec, registry, bus, waitFor, args, timeoutMs) {
      const prompt = args.prompt ?? ">";
      await rec.agentSend(args.expr, { enter: true });
      const w = await waitFor(rec, registry, bus, { output: prompt, timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(40, "detection") };
    }
  }
};
function templateList() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, summary: t.summary, params: t.params }));
}
async function templateRun(rec, registry, bus, waitFor, name, args, timeoutMs) {
  const t = TEMPLATES[name];
  if (!t) throw err(KIND.INVALID, `unknown template '${name}' \u2014 see term.template.list`);
  if (rec.exited) throw err(KIND.FINISHED, "terminal exited");
  return t.run(rec, registry, bus, waitFor, args ?? {}, timeoutMs);
}
export {
  TEMPLATES,
  templateList,
  templateRun
};
