// src/host/ssh-keys.js
import { existsSync, readFileSync, statSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
var KEY_BASENAME = "nano-cloud-session-ssh";
function home() {
  return process.env.DSH_HOME || process.env.HOME || ".";
}
function keyPath() {
  return join(home(), KEY_BASENAME);
}
function ensureSshKeypair() {
  const priv = keyPath();
  const pub = `${priv}.pub`;
  if (!existsSync(priv) || !existsSync(pub)) {
    execFileSync(
      "ssh-keygen",
      ["-t", "ed25519", "-f", priv, "-N", "", "-C", `dsh-dncs-${Date.now()}`],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  }
  chmodSync(priv, 384);
  const publicKey = readFileSync(pub, "utf8").trim();
  return {
    privateKeyPath: priv,
    publicKey,
    mode: (statSync(priv).mode & 511).toString(8)
  };
}
function sshCommands(sessionId, keypair) {
  const id = String(sessionId);
  const key = keypair.privateKeyPath;
  return {
    shell: `ssh -i ${key} ${id}@ssh.devin.ai`,
    forward: `ssh -i ${key} -L <local>:127.0.0.1:<remote> ${id}@ssh.devin.ai '<command \u4FDD\u6301 channel \u5F00\u653E>'`
  };
}
export {
  ensureSshKeypair,
  sshCommands
};
