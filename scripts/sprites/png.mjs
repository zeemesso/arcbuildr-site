// A minimal PNG writer (8-bit RGBA, no dependencies) for the pixel-art sheets.
import { deflateSync } from "node:zlib";

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/** `pixels` is a Uint8Array of width * height * 4 RGBA bytes. */
export function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit, RGBA, deflate, no filter set, no interlace
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * (width * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A drawing surface of art pixels. */
export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  set(x, y, hex) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = parseInt(hex.slice(1, 3), 16);
    this.data[i + 1] = parseInt(hex.slice(3, 5), 16);
    this.data[i + 2] = parseInt(hex.slice(5, 7), 16);
    this.data[i + 3] = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
  }
  /** Draws `rows` (strings, one character per pixel) at x, y. Unknown characters and "." are skipped. */
  put(x, y, rows, palette) {
    rows.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        const hex = palette[ch];
        if (hex) this.set(x + dx, y + dy, hex);
      });
    });
  }
  /** Copies another canvas onto this one at x, y. */
  blit(source, x, y) {
    for (let sy = 0; sy < source.height; sy++)
      for (let sx = 0; sx < source.width; sx++) {
        const i = (sy * source.width + sx) * 4;
        if (!source.data[i + 3]) continue;
        const o = ((y + sy) * this.width + (x + sx)) * 4;
        this.data.set(source.data.subarray(i, i + 4), o);
      }
  }
  /** A copy enlarged by a whole factor, for previews. */
  scaled(factor, background) {
    const out = new Canvas(this.width * factor, this.height * factor);
    for (let y = 0; y < out.height; y++)
      for (let x = 0; x < out.width; x++) {
        const i = (Math.floor(y / factor) * this.width + Math.floor(x / factor)) * 4;
        const o = (y * out.width + x) * 4;
        if (this.data[i + 3]) out.data.set(this.data.subarray(i, i + 4), o);
        else if (background) out.set(x, y, background);
      }
    return out;
  }
  png() {
    return encodePng(this.width, this.height, this.data);
  }
}
