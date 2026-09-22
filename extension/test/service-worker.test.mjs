// Verification of the service worker's core decision path:
//   PAGE_SIGNALS message -> assess (mocked) -> chrome.storage.local + badge.
//
// Loads the ACTUAL shipped service worker via the shared harness, delivers a
// page-signals message, and asserts the persisted risk + toolbar badge.
// Exercises the real code path, not a reimplementation — the counterpart to
// detection.test.mjs for the SW. Snooze/dismiss/cleanup live in storage.test.mjs.
//
// The critical case is "CA inventory detected but the assess API is DOWN": the
// extension must still report EXPOSED (its whole reason to exist is the offline
// blindside warning), not degrade to UNKNOWN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, okAssess, failAssess, STORAGE_KEY, LAST_LEVEL_KEY } from './harness.mjs';

const TAB = 7;

test('CA inventory + assess says nexus -> EXPOSED, red "!" badge', async () => {
	const w = loadWorker(okAssess({ hasNexus: true, triggers: ['Physical inventory in CA'], minTax: 800 }));
	const record = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: true, fcCodes: ['ONT8'], signals: ['ONT8'] },
		TAB
	);
	assert.equal(record.risk, 'exposed');
	assert.equal(w.store[STORAGE_KEY].risk, 'exposed');
	assert.equal(w.badge.byTab[TAB].text, '!');
});

test('CA inventory + assess API DOWN -> still EXPOSED (offline blindside warning)', async () => {
	const w = loadWorker(failAssess());
	const record = await w.sendPageSignals(
		{ hasCaInventory: true, hasCaText: false, fcCodes: ['SMF1'], signals: ['SMF1'] },
		TAB
	);
	// The regression this guards: a real CA signal must NOT degrade to UNKNOWN
	// just because the assess call failed.
	assert.equal(record.risk, 'exposed');
	assert.equal(record.assessment, null);
	assert.equal(w.badge.byTab[TAB].text, '!');
});

test('no CA inventory + assess says no nexus -> CLEAR, green check badge', async () => {
	const w = loadWorker(okAssess({ hasNexus: false, triggers: [] }));
	const record = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		TAB
	);
	assert.equal(record.risk, 'clear');
	assert.equal(w.badge.byTab[TAB].text, '✓');
});

test('no CA inventory + assess API DOWN -> UNKNOWN, no badge', async () => {
	const w = loadWorker(failAssess());
	const record = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		TAB
	);
	assert.equal(record.risk, 'unknown');
	assert.equal(w.badge.byTab[TAB].text, '');
});

test('a tab-less sender still works (badge falls back to the global default)', async () => {
	// chrome.scripting.executeScript injections and legacy callers can arrive
	// without sender.tab; that must not throw or skip persistence.
	const w = loadWorker(okAssess({ hasNexus: true, triggers: [], minTax: 800 }));
	const record = await w.sendPageSignals({ hasCaInventory: true, hasCaText: true, fcCodes: ['LAX9'], signals: [] });
	assert.equal(record.risk, 'exposed');
	assert.equal(w.badge.text, '!', 'global badge, not a per-tab one');
	assert.deepEqual(Object.keys(w.badge.byTab), [], 'no per-tab badge written');
});

// --- alert level derivation -------------------------------------------------

test('alert level: FC code -> high, everything else -> none', async () => {
	const w = loadWorker(okAssess({ hasNexus: false, triggers: [] }));

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
	const w = loadWorker(okAssess({ hasNexus: false, triggers: [] }));
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

test('assess-driven nexus with no local CA signal still reads as high', async () => {
	// If the API says hasNexus the risk is EXPOSED, the alert level must agree —
	// the banner and the severity chip must never contradict each other.
	const w = loadWorker(okAssess({ hasNexus: true, triggers: ['Sales over threshold'], minTax: 800 }));
	const record = await w.sendPageSignals(
		{ hasCaInventory: false, hasCaText: false, fcCodes: [], signals: [] },
		1
	);
	assert.equal(record.risk, 'exposed');
	assert.equal(record.alertLevel, 'high');
});
