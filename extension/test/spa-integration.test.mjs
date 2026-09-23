// End-to-end across the seam: the REAL content script wired to the REAL service
// worker, so a page change drives an actual badge change.
//
// Every other test file exercises one file in isolation — detection.test.mjs
// asks "did the collector emit the right message", service-worker.test.mjs asks
// "given a message, does the worker decide correctly". Neither covers the join,
// which is exactly what manual checklist item 4 asserts: navigate within Seller
// Central and the badge changes *without the user touching the popup*.
//
// This is the closest automated analogue to item 4. What it cannot do is prove
// the FC codes are readable on real Amazon markup — see TESTING.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, loadCollector, DETECTION_PREFIX } from './harness.mjs';

const TAB = 11;

/**
 * Boot a collector on `pathname` and pipe everything it emits into a worker as
 * if it came from tab TAB. Returns both plus a settle() that awaits the
 * worker's async handling — the content script's sendMessage is fire-and-forget,
 * so tests have to wait for the far side themselves.
 */
function wire(initialText, pathname = '/orders') {
	const w = loadWorker();
	const inFlight = [];

	const c = loadCollector(initialText, {
		pathname,
		onSend: (msg) => {
			inFlight.push(w.send(msg, { tab: { id: TAB } }));
		}
	});

	const settle = async () => {
		while (inFlight.length) await inFlight.shift();
	};

	return { w, c, settle };
}

const badgeOf = (w) => w.badge.byTab[TAB]?.text;

test('item 4: navigating to an inventory view turns the badge red, no popup involved', async () => {
	// Seller lands on Orders. Nothing to report.
	const { w, c, settle } = wire('Seller Central — Orders  Nothing to see here', '/orders');
	await settle();

	assert.equal(badgeOf(w), '✓', 'clear view, green badge');
	assert.equal(w.store[`${DETECTION_PREFIX}${TAB}`].risk, 'clear');

	// They click through to FBA Inventory. No document load — just a route change.
	c.navigate('/inventory/fba', 'FBA Inventory  Fulfillment Center: ONT8  Units: 240');
	await settle();

	assert.equal(badgeOf(w), '!', 'badge went red on navigation alone');

	const record = w.store[`${DETECTION_PREFIX}${TAB}`];
	assert.equal(record.risk, 'exposed');
	assert.equal(record.alertLevel, 'high');
	assert.equal(record.path, undefined, 'path lives on the signals payload');
	assert.equal(record.signals.path, '/inventory/fba', 'record reflects the NEW view');
	assert.deepEqual([...record.signals.fcCodes], ['ONT8']);
	assert.equal(record.assessment.minTax, 800, 'full assessment, computed locally');
});

test('item 4 (back): returning to a clear view clears the badge', async () => {
	const { w, c, settle } = wire('FBA Inventory  Fulfillment Center: SMF1', '/inventory/fba');
	await settle();
	assert.equal(badgeOf(w), '!');

	// Browser back, via popstate rather than the poll — it must not wait a tick.
	c.setUrl('/orders', 'Seller Central — Orders  Nothing here');
	c.fire('popstate');
	await settle();

	assert.equal(badgeOf(w), '✓', 'badge cleared on the way back');
	assert.equal(w.store[`${DETECTION_PREFIX}${TAB}`].risk, 'clear');
});

test('idle polling on an unchanged page never touches the badge or storage', async () => {
	// The poll runs once a second for the life of the tab. If an unchanged page
	// re-reported, the worker would rewrite storage and repaint the badge every
	// second of every session.
	const { w, c, settle } = wire('FBA Inventory  Fulfillment Center: ONT8', '/inventory/fba');
	await settle();

	const writesBefore = JSON.stringify(w.store[`${DETECTION_PREFIX}${TAB}`]);
	const emitted = c.sent.length;

	for (let i = 0; i < 30; i += 1) c.tick(); // ~30 seconds of idling
	await settle();

	assert.equal(c.sent.length, emitted, 'nothing re-emitted while idle');
	assert.equal(JSON.stringify(w.store[`${DETECTION_PREFIX}${TAB}`]), writesBefore);
	assert.equal(badgeOf(w), '!', 'and the alert is still standing');
});

test('a snoozed user navigating into CA inventory is not interrupted', async () => {
	// The two features have to compose: SPA navigation finds the exposure, snooze
	// suppresses the badge, and the finding is still recorded for the popup.
	const { w, c, settle } = wire('Seller Central — Orders', '/orders');
	await settle();

	await w.send({ type: 'taxnexus/snooze' });

	c.navigate('/inventory/fba', 'FBA Inventory  Fulfillment Center: LAX9');
	await settle();

	assert.equal(badgeOf(w), '', 'no badge while snoozed');
	const record = w.store[`${DETECTION_PREFIX}${TAB}`];
	assert.equal(record.risk, 'exposed', 'but the detection is still stored');
	assert.deepEqual([...record.signals.fcCodes], ['LAX9']);
});

test('the whole navigation flow makes zero network requests', async () => {
	const { w, c, settle } = wire('Seller Central — Orders', '/orders');
	await settle();
	c.navigate('/inventory/fba', 'FBA Inventory  Fulfillment Center: ONT8');
	await settle();
	c.navigate('/orders', 'Seller Central — Orders');
	await settle();

	assert.deepEqual(w.fetchCalls, []);
});
