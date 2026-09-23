// Verifies the Chrome Web Store screenshots before you upload them, so a wrong
// dimension is caught here instead of by the dashboard. Zero dependencies — PNG
// headers are read directly.
//
//   node store-assets/verify-screenshots.mjs
//
// Checks: file present, valid PNG, exactly 1280x800, and whether it carries an
// alpha channel (the store accepts it, but transparency in a screenshot is
// almost always an accident and can composite oddly in the carousel).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const DIR = import.meta.dirname;

const REQUIRED = [
	{
		file: 'screenshot-1-high-alert-context.png',
		what: 'HIGH alert in context — badge visible in the toolbar, FC code visible in the page, popup CLOSED'
	},
	{
		file: 'screenshot-2-high-alert-popup.png',
		what: 'HIGH alert with the popup open — status banner, HIGH chip, FC code, $800/yr line, trial CTA'
	},
	{
		file: 'screenshot-3-clear.png',
		what: 'Clear state — Seller Central page with only non-CA codes, popup showing "No CA inventory signal"'
	}
];

const W = 1280;
const H = 800;

const PNG_SIG = '89504e470d0a1a0a';
// PNG colour types that carry an alpha channel.
const ALPHA_TYPES = new Set([4, 6]);

function inspect(path) {
	const buf = readFileSync(path);
	if (buf.length < 26 || buf.subarray(0, 8).toString('hex') !== PNG_SIG) {
		return { ok: false, reason: 'not a PNG' };
	}
	// IHDR is the first chunk: width/height at 16/20, bit depth 24, colour type 25.
	return {
		ok: true,
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
		colorType: buf[25],
		bytes: buf.length
	};
}

let failures = 0;
let missing = 0;

console.log(`\nChrome Web Store screenshots — expecting ${W}x${H} PNG\n`);

for (const { file, what } of REQUIRED) {
	const path = resolve(DIR, file);
	const label = basename(file);

	if (!existsSync(path)) {
		missing += 1;
		console.log(`  ☐ ${label}`);
		console.log(`      not captured yet — ${what}\n`);
		continue;
	}

	const info = inspect(path);
	if (!info.ok) {
		failures += 1;
		console.log(`  ✗ ${label}  ${info.reason}\n`);
		continue;
	}

	const sized = info.width === W && info.height === H;
	const kb = (info.bytes / 1024).toFixed(0);
	console.log(`  ${sized ? '✓' : '✗'} ${label}  ${info.width}x${info.height}  ${kb}KB`);

	if (!sized) {
		failures += 1;
		const ratio = (info.width / info.height).toFixed(3);
		const target = (W / H).toFixed(3);
		console.log(`      needs ${W}x${H}. Aspect ${ratio} vs ${target} required.`);
		if (ratio !== target) {
			console.log(`      crop first, then scale:`);
			console.log(`        sips -c ${H} ${W} "${file}" --out "${file}"`);
		} else {
			console.log(`        sips -z ${H} ${W} "${file}"`);
		}
	}

	if (ALPHA_TYPES.has(info.colorType)) {
		console.log(`      note: has an alpha channel. Usually unintended in a screenshot;`);
		console.log(`      flatten with:  sips -s format png --out "${file}" "${file}"`);
	}
	console.log('');
}

if (missing) {
	console.log(`${missing} of ${REQUIRED.length} not captured yet. See store-assets/README.md.\n`);
}
if (failures) {
	console.log(`${failures} need fixing before upload.\n`);
	process.exit(1);
}
if (!missing) {
	console.log('All three are ready to upload.\n');
}
