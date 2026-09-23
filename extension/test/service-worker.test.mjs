// Verification of the service worker's core decision path:
//   PAGE_SIGNALS message -> local assessment -> chrome.storage.local + badge.
//
// Loads the ACTUAL shipped service worker via the shared harness, delivers a
// page-signals message, and asserts the persisted risk + toolbar badge.
// Exercises the real code path, not a reimplementation — the counterpart to
// detection.test.mjs for the SW. Snooze/dismiss/cleanup live in storage.test.mjs.
//
// The extension makes NO network requests. The harness's `fetch` throws if
// called, so any reintroduced request fails the suite rather than quietly
// making these tests depend on the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, STORAGE_KEY, LAST_LEVEL_KEY } from './harness.mjs';

const TAB = 7;

test('CA inventory -> EXPOSED, red "!" badge', async () => {
	const w = loadWorker();
	const record = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: true, fcCodes: ['ONT8'], signals: ['ONT8'] },
		TAB
	);
	assert.equal(record.risk, 'exposed');
	assert.equal(w.store[STORAGE_KEY].risk, 'exposed');
	assert.equal(w.badge.byTab[TAB].text, '!');
});

test('the blindside warning needs no network at all', async () => {
	// The product's whole reason to exist. This used to be "the assess API is
	// DOWN but we still warn"; there is no longer an API call that could fail,
	// so the warning is unconditional by construction.
	const w = loadWorker();
	const record = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: false, fcCodes: ['SMF1'], signals: ['SMF1'] },
		TAB
	);

	assert.equal(record.risk, 'exposed');
	assert.equal(w.badge.byTab[TAB].text, '!');
	assert.deepEqual(w.fetchCalls, [], 'no network request was attempted');
});

test('no CA inventory -> CLEAR, green check badge, still no network', async () => {
	// Previously this state depended on the API answering; offline it degraded
	// to UNKNOWN with no badge. Now a clear page reads clear even on a plane.
	const w = loadWorker();
	const record = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		TAB
	);
	assert.equal(record.risk, 'clear');
	assert.equal(w.badge.byTab[TAB].text, '✓');
	assert.deepEqual(w.fetchCalls, []);
});

test('the local assessment matches what the server engine would return', async () => {
	// Guards the two values duplicated from src/lib/server/taxnexus/assess-nexus.ts.
	// Both verified against production on 2026-09-22 for the only inputs this
	// extension ever used (sales 0, hasEmployees false, entityType LLC).
	const w = loadWorker();

	const exposed = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: false, fcCodes: ['ONT8'], signals: [] },
		1
	);
	assert.equal(exposed.assessment.hasNexus, true);
	assert.deepEqual(
		[...exposed.assessment.triggers],
		['Physical inventory in CA (Amazon FBA/3PL Nexus)']
	);
	assert.equal(exposed.assessment.minTax, 800, 'CA minimum franchise tax');

	const clear = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		2
	);
	assert.equal(clear.assessment.hasNexus, false);
	assert.deepEqual([...clear.assessment.triggers], []);
	assert.equal(clear.assessment.minTax, 0);
});

test('a tab-less sender still works (badge falls back to the global default)', async () => {
	// chrome.scripting.executeScript injections and legacy callers can arrive
	// without sender.tab; that must not throw or skip persistence.
	const w = loadWorker();
	const record = await w.sendPageSignals({ hasCaInventory: true, hasCaText: true, fcCodes: ['LAX9'], signals: [] });
	assert.equal(record.risk, 'exposed');
	assert.equal(w.badge.text, '!', 'global badge, not a per-tab one');
	assert.deepEqual(Object.keys(w.badge.byTab), [], 'no per-tab badge written');
});

// --- alert level derivation -------------------------------------------------

test('alert level: FC code -> high, everything else -> none', async () => {
	const w = loadWorker();

	const high = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: true, fcCodes: ['ONT8'], signals: [] },
		1
	);
	assert.equal(high.alertLevel, 'high');

	const none = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		3
	);
	assert.equal(none.alertLevel, 'none');

	// last_alert_level tracks the most recent pass.
	assert.equal(w.store[LAST_LEVEL_KEY], 'none');
});

test('CA text WITHOUT an FC code raises no alert (Prop 65 regression)', async () => {
	// The regression this guards, found on a real page on 2026-09-22: an Amazon
	// listing carrying "WARNING: California's Proposition 65" raised a CA nexus
	// alert on a colon-cleanse supplement. Page text mentioning California says
	// nothing about where inventory physically sits, so it must not alert.
	const w = loadWorker();
	const record = await w.sendPageSignals(
		{
			hasCaInventory: false,
			hasCaText: true,
			fcCodes: [],
			signals: ['California location text present on page']
		},
		1
	);

	assert.equal(record.alertLevel, 'none', 'CA text alone must not raise an alert');
	assert.equal(w.badge.byTab[1].text, '✓', 'clear badge, not a warning');
	// The text is still collected and shown as page context — just not as an alert.
	assert.equal(record.signals.hasCaText, true);
});

test('risk and alert level never contradict each other', async () => {
	// The popup's status banner reads `risk` and its severity chip reads
	// `alertLevel`. A green "No CA inventory signal" beside an amber severity
	// badge reads as a bug, so the two must move together.
	const w = loadWorker();

	const exposed = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: false, fcCodes: ['ONT8'], signals: [] },
		1
	);
	assert.equal(exposed.risk, 'exposed');
	assert.equal(exposed.alertLevel, 'high');

	const clear = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: true, fcCodes: [], signals: [] },
		2
	);
	assert.equal(clear.risk, 'clear');
	assert.equal(clear.alertLevel, 'none');
});

test('a full session makes zero network requests', async () => {
	// The listing claims the extension never talks to the network. This is that
	// claim, enforced: every message type, then assert nothing was attempted.
	const w = loadWorker();
	await w.sendPageSignals({ hasCaInventory: true, hasCaText: true, fcCodes: ['ONT8'], signals: [] }, 1);
	await w.sendPageSignals({ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] }, 2);
	await w.send({ type: 'taxnexus/get-state' });
	await w.send({ type: 'taxnexus/snooze' });
	await w.send({ type: 'taxnexus/dismiss', tabId: 1 });
	await w.send({ type: 'taxnexus/rescan' });
	await w.closeTab(1);
	await w.fireStartup();

	assert.deepEqual(w.fetchCalls, [], 'the extension must never hit the network');
});

// --- the blindside warning with no network -----------------------------------
// The product's core promise: a seller whose stock sits in a California
// warehouse gets warned, full stop. Manual checklist item 11 covers this in a
// real browser; these are the parts provable without one.

test('HIGH alert works with fetch removed from the environment entirely', async () => {
	// Stricter than simulating a failed request: `fetch` does not exist here, so
	// referencing it at all is a ReferenceError. A try/catch around a network
	// call could not satisfy this — only genuinely not having one.
	const w = loadWorker({}, { noFetch: true });

	const record = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: false, fcCodes: ['ONT8'], signals: ['ONT8'] },
		TAB
	);

	assert.equal(record.risk, 'exposed');
	assert.equal(record.alertLevel, 'high');
	assert.equal(w.badge.byTab[TAB].text, '!', 'red badge with no network stack at all');
	assert.equal(record.assessment.minTax, 800, 'assessment is complete, not degraded');
	assert.deepEqual(
		[...record.assessment.triggers],
		['Physical inventory in CA (Amazon FBA/3PL Nexus)']
	);
});

test('every path survives a missing network stack, not just the alert', async () => {
	// The realistic failure is a connection dropping mid-session, so snooze,
	// dismiss, re-scan and startup cleanup have to keep working too.
	const w = loadWorker(
		{},
		{ noFetch: true, activeTab: { id: 1, url: 'https://sellercentral.amazon.com/inventory/fba' } }
	);

	await w.sendPageSignals({ hasCaInventory: true, hasCaText: true, fcCodes: ['SMF1'], signals: [] }, 1);
	assert.equal(w.badge.byTab[1].text, '!');

	assert.equal((await w.send({ type: 'taxnexus/snooze' })).ok, true);
	assert.equal((await w.send({ type: 'taxnexus/dismiss', tabId: 1 })).ok, true);
	assert.equal((await w.send({ type: 'taxnexus/rescan' })).ok, true);
	assert.ok(await w.send({ type: 'taxnexus/get-state' }));

	await w.closeTab(1);
	await w.fireStartup();
	// Reaching here without a ReferenceError is the assertion.
});

test('a clear page still reads CLEAR with no network, not "no data yet"', async () => {
	// Before the assess call was removed this degraded to UNKNOWN with no badge,
	// so a seller with nothing to worry about got an ambiguous answer whenever
	// the connection was flaky. It now answers definitively either way.
	const w = loadWorker({}, { noFetch: true });
	const record = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		TAB
	);
	assert.equal(record.risk, 'clear');
	assert.equal(w.badge.byTab[TAB].text, '✓');
});
