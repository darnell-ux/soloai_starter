// Generates simple solid-color PNG toolbar icons (no external deps) so the
// manifest's icon references resolve. Run: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../public/icons');
mkdirSync(OUT, { recursive: true });

// TaxNexus amber on near-black, with a subtle dot — recognisable at 16px.
const BG = [17, 24, 39, 255]; // #111827
const FG = [180, 83, 9, 255]; // #b45309

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const c = size / 2;
  const r = size * 0.22;
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 per scanline
    for (let x = 0; x < size; x++) {
      const inDot = (x - c) ** 2 + (y - c) ** 2 <= r * r;
      const [R, G, B, A] = inDot ? FG : BG;
      const o = y * (stride + 1) + 1 + x * 4;
      raw[o] = R;
      raw[o + 1] = G;
      raw[o + 2] = B;
      raw[o + 3] = A;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(OUT, `icon${size}.png`), png(size));
  console.log(`wrote icons/icon${size}.png`);
}
