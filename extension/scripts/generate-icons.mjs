// Generates the extension's PNG icons with no external dependencies — the PNG
// bytes are assembled by hand (zlib is the only thing needed, and it ships with
// Node). Run: npm run icons
//
// THE MARK: a map pin. Physical location is literally the legal concept the
// product is about — stock sitting in a California warehouse is what makes a
// seller "doing business" there. A pin silhouette is also one of the few shapes
// that survives 16px; anything with interior detail turns to mush in the
// toolbar.
//
// TWO TREATMENTS, because the manifest has two separate icon keys:
//   icon{N}.png     -> manifest "icons": the store listing and chrome://extensions.
//                      An amber pin on a dark rounded tile, so it reads as a
//                      deliberate app mark in a gallery of other icons.
//   toolbar{N}.png  -> manifest "action.default_icon": the toolbar button.
//                      Transparent background so it sits naturally on both light
//                      and dark browser themes — a dark tile up there looks like
//                      a sticker stuck on the chrome.
//
// Edges are anti-aliased by supersampling each pixel SS x SS and averaging
// coverage. Without it a 16px pin is a staircase.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../public/icons');
mkdirSync(OUT, { recursive: true });

// Brand: near-black tile, amber pin. The amber is a step brighter than the
// popup's link colour (#b45309) because the icon has to hold up at 16px against
// a dark toolbar, where the deeper tone goes muddy.
const TILE = [17, 24, 39, 255]; // #111827
const AMBER = [245, 158, 11, 255]; // #f59e0b
const CLEAR = [0, 0, 0, 0];

const SS = 4; // supersampling factor per axis

// --- geometry, in a unit square ---------------------------------------------

const PIN = {
	cx: 0.5,
	cy: 0.42,
	r: 0.26,
	tipY: 0.905,
	// Half-width where the triangle meets the circle. Chosen so the triangle's
	// top edge is nearly tangent to the circle (sqrt(r^2 - 0.125^2) ~= 0.228),
	// which makes the junction read as one smooth teardrop rather than a ball
	// with a cone stuck under it.
	shoulderY: 0.545,
	shoulderHalf: 0.225,
	holeR: 0.105
};

const inCircle = (u, v, cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r;

/** Triangle from the two shoulders down to the tip. */
function inPinTriangle(u, v) {
	if (v < PIN.shoulderY || v > PIN.tipY) return false;
	// Linear taper from shoulderHalf at shoulderY to 0 at tipY.
	const t = (v - PIN.shoulderY) / (PIN.tipY - PIN.shoulderY);
	const half = PIN.shoulderHalf * (1 - t);
	return Math.abs(u - PIN.cx) <= half;
}

const inPinBody = (u, v) =>
	inCircle(u, v, PIN.cx, PIN.cy, PIN.r) || inPinTriangle(u, v);
const inPinHole = (u, v) => inCircle(u, v, PIN.cx, PIN.cy, PIN.holeR);

/** Rounded square covering the canvas, with a small inset. */
function inRoundedTile(u, v, inset = 0.02, radius = 0.22) {
	const lo = inset;
	const hi = 1 - inset;
	if (u < lo || u > hi || v < lo || v > hi) return false;
	// Corner test: only the rounded corners need a distance check.
	const nx = u < lo + radius ? lo + radius : u > hi - radius ? hi - radius : u;
	const ny = v < lo + radius ? lo + radius : v > hi - radius ? hi - radius : v;
	if (nx === u && ny === v) return true;
	return (u - nx) ** 2 + (v - ny) ** 2 <= radius * radius;
}

// --- rendering ---------------------------------------------------------------

/**
 * Colour of one subsample.
 * @param {boolean} tiled  draw the dark rounded tile behind the pin
 * @param {number} scale   pin size relative to the canvas
 */
function sample(u, v, tiled, scale) {
	// Map canvas space into pin space so the pin can be inset within the tile.
	const pu = (u - 0.5) / scale + 0.5;
	const pv = (v - 0.5) / scale + 0.5;

	if (inPinBody(pu, pv) && !inPinHole(pu, pv)) return AMBER;
	if (tiled && inRoundedTile(u, v)) return TILE;
	return CLEAR;
}

function render(size, tiled) {
	// The pin gets breathing room inside the tile; standalone it fills more of
	// the canvas so it doesn't look lost next to other toolbar buttons.
	const scale = tiled ? 0.62 : 0.86;

	const stride = size * 4;
	const raw = Buffer.alloc((stride + 1) * size);

	for (let y = 0; y < size; y++) {
		raw[y * (stride + 1)] = 0; // filter type 0 per scanline
		for (let x = 0; x < size; x++) {
			// Accumulate premultiplied so partially-covered edge pixels don't pick
			// up a dark fringe from the transparent samples around them.
			let pr = 0;
			let pg = 0;
			let pb = 0;
			let pa = 0;

			for (let sy = 0; sy < SS; sy++) {
				for (let sx = 0; sx < SS; sx++) {
					const u = (x + (sx + 0.5) / SS) / size;
					const v = (y + (sy + 0.5) / SS) / size;
					const [r, g, b, a] = sample(u, v, tiled, scale);
					const af = a / 255;
					pr += r * af;
					pg += g * af;
					pb += b * af;
					pa += af;
				}
			}

			const n = SS * SS;
			const alpha = pa / n;
			const o = y * (stride + 1) + 1 + x * 4;
			if (alpha > 0) {
				raw[o] = Math.round(pr / n / alpha);
				raw[o + 1] = Math.round(pg / n / alpha);
				raw[o + 2] = Math.round(pb / n / alpha);
			}
			raw[o + 3] = Math.round(alpha * 255);
		}
	}

	return encodePng(size, raw);
}

// --- PNG container -----------------------------------------------------------

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

function encodePng(size, raw) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // colour type RGBA
	// 10,11,12 = compression/filter/interlace = 0

	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

// --- write -------------------------------------------------------------------

for (const size of [16, 32, 48, 128]) {
	writeFileSync(resolve(OUT, `icon${size}.png`), render(size, true));
	writeFileSync(resolve(OUT, `toolbar${size}.png`), render(size, false));
	console.log(`wrote icons/icon${size}.png + icons/toolbar${size}.png`);
}
