// src/host/ws.js
import { createHash, randomBytes } from "node:crypto";
var GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
function acceptKey(key) {
  return createHash("sha1").update(key + GUID).digest("base64");
}
function handshake(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key || (req.headers.upgrade || "").toLowerCase() !== "websocket") {
    socket.destroy();
    return false;
  }
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${acceptKey(key)}\r
\r
`
  );
  socket.setNoDelay(true);
  return true;
}
function encodeFrame(payload, opcode = 2) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([128 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 128 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 128 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}
function sendBinary(socket, buf) {
  if (!socket.destroyed) socket.write(encodeFrame(buf, 2));
}
function sendText(socket, obj) {
  if (!socket.destroyed) socket.write(encodeFrame(Buffer.from(JSON.stringify(obj), "utf8"), 1));
}
function sendClose(socket, code = 1e3, reason = "") {
  if (socket.destroyed) return;
  const body = Buffer.alloc(2 + Buffer.byteLength(reason));
  body.writeUInt16BE(code, 0);
  body.write(reason, 2);
  try {
    socket.write(encodeFrame(body, 8));
  } catch {
  }
}
function sendPing(socket) {
  if (!socket.destroyed) socket.write(encodeFrame(randomBytes(4), 9));
}
var FR_KIND = {
  DATA: 0,
  CREDIT: 1,
  RESIZE: 2,
  CLOSE: 3,
  PING: 4,
  FACTS: 5,
  AUTO_INPUT: 6,
  SNAPSHOT: 7,
  PONG: 8,
  HELD: 9
};
var CREDIT_INIT = 256 * 1024;
var SNAP_LIMIT = 4 * 1024 * 1024;
function encodeChannel(channel, kind, payload = Buffer.alloc(0)) {
  const head = Buffer.allocUnsafe(9);
  head.writeUInt32BE(channel, 0);
  head.writeUInt8(kind, 4);
  head.writeUInt32BE(payload.length, 5);
  return Buffer.concat([head, payload]);
}
function parseChannel(buf) {
  if (!buf || buf.length < 9) return null;
  const channel = buf.readUInt32BE(0);
  const kind = buf.readUInt8(4);
  const len = buf.readUInt32BE(5);
  if (buf.length < 9 + len) return null;
  return { channel, kind, payload: buf.subarray(9, 9 + len) };
}
var Attach = class {
  constructor(socket, record) {
    this.socket = socket;
    this.record = record;
    this.v = 1;
    this.credit = CREDIT_INIT;
    this.pending = 0;
    this.snapping = false;
  }
  /** Send data honoring credit + snapshot fallback. */
  data(chunk) {
    if (this.v === 1) {
      sendBinary(this.socket, chunk);
      this.pending += chunk.length;
      return;
    }
    if (this.snapping || this.pending + chunk.length > this.credit + SNAP_LIMIT) {
      this.#snapshot();
      this.pending = 0;
      this.snapping = false;
    }
    this.socket.write(encodeFrame(encodeChannel(0, FR_KIND.DATA, chunk), 2));
    this.pending += chunk.length;
  }
  /** Consume client credit. */
  onCredit(n) {
    this.credit += n;
    this.pending = Math.max(0, this.pending - n);
  }
  #snapshot() {
    this.snapping = true;
    const text = this.record?.screenText(200, "visible") ?? "";
    const clear = Buffer.from("\x1B[2J\x1B[H", "utf8");
    this.socket.write(encodeFrame(encodeChannel(0, FR_KIND.SNAPSHOT, Buffer.concat([clear, Buffer.from(text, "utf8")])), 2));
  }
  channel(channel, kind, payload) {
    if (!this.socket.destroyed) {
      this.socket.write(encodeFrame(encodeChannel(channel, kind, payload ?? Buffer.alloc(0)), 2));
    }
  }
};
var FrameParser = class {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.buf = Buffer.alloc(0);
    this.frag = null;
  }
  feed(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (; ; ) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 128) !== 0;
      const opcode = b[0] & 15;
      const masked = (b[1] & 128) !== 0;
      let len = b[1] & 127;
      let off = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        len = Number(b.readBigUInt64BE(2));
        off = 10;
      }
      const maskOff = off;
      if (masked) off += 4;
      if (b.length < off + len) return;
      let payload = b.subarray(off, off + len);
      if (masked) {
        const mask = b.subarray(maskOff, maskOff + 4);
        const un = Buffer.allocUnsafe(len);
        for (let i = 0; i < len; i++) un[i] = payload[i] ^ mask[i & 3];
        payload = un;
      } else {
        payload = Buffer.from(payload);
      }
      this.buf = b.subarray(off + len);
      if (opcode === 0 && this.frag) {
        this.frag.chunks.push(payload);
        if (fin) {
          const joined = Buffer.concat(this.frag.chunks);
          this.onMessage(this.frag.opcode, joined);
          this.frag = null;
        }
        continue;
      }
      if ((opcode === 1 || opcode === 2) && !fin) {
        this.frag = { opcode, chunks: [payload] };
        continue;
      }
      this.onMessage(opcode, payload);
    }
  }
};
export {
  Attach,
  CREDIT_INIT,
  FR_KIND,
  FrameParser,
  SNAP_LIMIT,
  acceptKey,
  encodeChannel,
  encodeFrame,
  handshake,
  parseChannel,
  sendBinary,
  sendClose,
  sendPing,
  sendText
};
