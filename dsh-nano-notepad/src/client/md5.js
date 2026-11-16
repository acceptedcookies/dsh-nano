/** Full MD5 of a string, as 32 lowercase hex digits. Content etag, not an id. */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

function leftRotate(value, bits) {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}

/** @param {string} text */
export function md5Hex(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  const bitLen = bytes.length * 8
  const padLen = (bitLen % 512 <= 448 ? 448 : 960) - (bitLen % 512)
  const totalBits = bitLen + padLen + 64
  const words = new Uint32Array(totalBits / 32)
  for (let i = 0; i < bytes.length; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8)
  words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8)
  words[words.length - 2] = bitLen >>> 0
  words[words.length - 1] = Math.floor(bitLen / 0x100000000)
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  for (let offset = 0; offset < words.length; offset += 16) {
    let a = a0
    let b = b0
    let c = c0
    let d = d0
    for (let i = 0; i < 64; i++) {
      let f
      let g
      if (i < 16) { f = (b & c) | (~b & d); g = i }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16 }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16 }
      else { f = c ^ (b | ~d); g = (7 * i) % 16 }
      const k = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
      const sum = (a + f + k + words[offset + g]) >>> 0
      const next = (b + leftRotate(sum, S[i])) >>> 0
      a = d
      d = c
      c = b
      b = next
    }
    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }
  return [a0, b0, c0, d0].map(word => [0, 8, 16, 24].map(shift => ((word >>> shift) & 0xff).toString(16).padStart(2, '0')).join('')).join('')
}
