// Phase 5 verification: chrome.storage.local state — snooze, per-tab dismiss,
// and stale-key cleanup. Runs against the ACTUAL shipped service worker via the
// shared harness (see harness.mjs), not a reimplementation.
//
// The behaviour under test is "when does the user get interrupted": storage is
// always written, but the badge — the only thing that pulls attention — must
// stay dark while snoozed or dismissed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	loadWorker,
	hostArray,
	detectionRecord,
	STORAGE_KEY,
	SNOOZE_KEY,
	DISMISSED_KEY,
	LAST_LEVEL_KEY,
	DETECTION_PREFIX,
	DAY_MS
} from './harness.mjs';

const SEVEN_DAYS_MS = 7 * DAY_MS;
const CA_SIGNALS = { hasCaInventory: true, hasCaText: true, fcCodes: ['ONT8'], signals: ['ONT8'] };

// --- snooze -----------------------------------------------------------------

test('snooze sets snooze_until 7 days out and clears the badge', async () => {
	const w = loadWorker();
	const before = Date.now();
	const res = await w.send({ type: 'taxnexus/snooze' });
	const after = Date.now();

	assert.equal(res.ok, true);
	const until = w.store[SNOOZE_KEY];
	assert.equal(typeof until, 'number', 'snooze_until is a timestamp in ms');
	// Bracketed rather than exact: the worker stamps its own Date.now().
	assert.ok(until >= before + SEVEN_DAYS_MS, 'expiry is at least 7 days out');
	assert.ok(until <= after + SEVEN_DAYS_MS, 'expiry is no more than 7 days out');
	assert.equal(w.badge.text, '');
});

test('snoozed state prevents the badge update but still records the detection', async () => {
	// Seeded snooze = the state that survives a browser restart.
	const w = loadWorker({ [SNOOZE_KEY]: Date.now() + SEVEN_DAYS_MS });
	const record = await w.sendPageSignals(CA_SIGNALS, 42);

	assert.equal(record.suppressed, 'snoozed');
	assert.equal(w.badge.byTab[42]?.text, '', 'no "!" badge while snoozed');
	// The finding itself is not lost — the popup still shows it on demand.
	assert.equal(w.store[STORAGE_KEY].risk, 'exposed');
	assert.equal(w.store[`${DETECTION_PREFIX}42`].alertLevel, 'high');
});

test('an EXPIRED snooze does not suppress — the badge fires again', async () => {
	const w = loadWorker({ [SNOOZE_KEY]: Date.now() - 1000 });
	const record = await w.sendPageSignals(CA_SIGNALS, 42);

	assert.equal(record.suppressed, undefined);
	assert.equal(w.badge.byTab[42]?.text, '!');
});

// --- dismiss ----------------------------------------------------------------

test('dismiss clears the badge for that tab only', async () => {
	const w = loadWorker();
	// Two tabs both detect CA inventory.
	await w.sendPageSignals(CA_SIGNALS, 1);
	await w.sendPageSignals(CA_SIGNALS, 2);
	assert.equal(w.badge.byTab[1].text, '!');
	assert.equal(w.badge.byTab[2].text, '!');

	await w.send({ type: 'taxnexus/dismiss', tabId: 1 });

	assert.deepEqual(hostArray(w.store[DISMISSED_KEY]), [1]);
	assert.equal(w.badge.byTab[1].text, '', 'dismissed tab goes dark');
	assert.equal(w.badge.byTab[2].text, '!', 'the other tab is untouched');

	// And a re-detection on tab 1 stays suppressed, while tab 2 still alerts.
	const again = await w.sendPageSignals(CA_SIGNALS, 1);
	assert.equal(again.suppressed, 'dismissed');
	assert.equal(w.badge.byTab[1].text, '');
	assert.equal(w.badge.byTab[2].text, '!');
});

test('dismissed_tabs is cleaned up when the tab closes', async () => {
	const w = loadWorker();
	await w.sendPageSignals(CA_SIGNALS, 7);
	await w.send({ type: 'taxnexus/dismiss', tabId: 7 });
	assert.deepEqual(hostArray(w.store[DISMISSED_KEY]), [7]);
	assert.ok(`${DETECTION_PREFIX}7` in w.store);

	await w.closeTab(7);

	assert.deepEqual(hostArray(w.store[DISMISSED_KEY]), [], 'tab id dropped from dismissed_tabs');
	assert.ok(!(`${DETECTION_PREFIX}7` in w.store), 'per-tab detection dropped too');
});

test('dismiss without a tab id is a no-op, not a crash', async () => {
	const w = loadWorker();
	const res = await w.send({ type: 'taxnexus/dismiss' });
	assert.equal(res.ok, false);
	assert.equal(res.reason, 'no_tab');
});

test('re-scanning a dismissed tab un-dismisses it (explicit user intent)', async () => {
	const w = loadWorker({ [DISMISSED_KEY]: [3, 4] },
		{ activeTab: { id: 3, url: 'https://sellercentral.amazon.com/inventory/fba' } }
	);

	const res = await w.send({ type: 'taxnexus/rescan' });

	assert.equal(res.ok, true);
	assert.deepEqual(w.store[DISMISSED_KEY], [4], 'only the re-scanned tab is un-dismissed');
});

test('re-scan on a non-Amazon tab is refused and leaves dismissals alone', async () => {
	const w = loadWorker({ [DISMISSED_KEY]: [3] },
		{ activeTab: { id: 3, url: 'https://example.com/' } }
	);

	const res = await w.send({ type: 'taxnexus/rescan' });

	assert.equal(res.ok, false);
	assert.equal(res.reason, 'not_amazon');
	assert.deepEqual(w.store[DISMISSED_KEY], [3]);
});

// --- stale key cleanup ------------------------------------------------------

test('startup cleanup removes detection keys older than 24 hours', async () => {
	const fresh = detectionRecord(10, 60 * 1000); // 1 minute old
	const borderline = detectionRecord(11, DAY_MS - 60 * 1000); // just under 24h
	const stale = detectionRecord(12, DAY_MS + 60 * 1000); // just over 24h
	const ancient = detectionRecord(13, 30 * DAY_MS);

	const w = loadWorker({
		[fresh.key]: fresh.value,
		[borderline.key]: borderline.value,
		[stale.key]: stale.value,
		[ancient.key]: ancient.value,
		[STORAGE_KEY]: { risk: 'exposed' },
		[SNOOZE_KEY]: Date.now() + SEVEN_DAYS_MS
	});

	await w.fireStartup();

	assert.ok(fresh.key in w.store, 'recent detection kept');
	assert.ok(borderline.key in w.store, 'just-under-24h detection kept');
	assert.ok(!(stale.key in w.store), 'just-over-24h detection removed');
	assert.ok(!(ancient.key in w.store), '30-day-old detection removed');

	// Cleanup is surgical: it must not touch non-detection keys.
	assert.ok(STORAGE_KEY in w.store, 'latest record untouched');
	assert.ok(SNOOZE_KEY in w.store, 'snooze survives browser restart');
});

test('a detection record with no timestamp is swept as stale', async () => {
	// Older schema / partial write — treated as expired rather than kept forever.
	const w = loadWorker({ [`${DETECTION_PREFIX}99`]: { tabId: 99 } });
	await w.fireStartup();
	assert.ok(!(`${DETECTION_PREFIX}99` in w.store));
});

test('startup clears dismissed_tabs — tab ids do not survive a restart', async () => {
	const w = loadWorker({ [DISMISSED_KEY]: [1, 2, 3] });
	await w.fireStartup();
	assert.ok(!(DISMISSED_KEY in w.store), 'stale tab ids would suppress unrelated tabs');
});

// --- schema -----------------------------------------------------------------

test('storage schema matches the documented contract', async () => {
	const w = loadWorker();
	await w.sendPageSignals(CA_SIGNALS, 5);
	await w.send({ type: 'taxnexus/snooze' });
	await w.send({ type: 'taxnexus/dismiss', tabId: 5 });

	assert.equal(typeof w.store[SNOOZE_KEY], 'number', 'snooze_until: timestamp ms');
	assert.ok(Array.isArray(w.store[DISMISSED_KEY]), 'dismissed_tabs: array of tab ids');
	assert.equal(typeof w.store[LAST_LEVEL_KEY], 'string', 'last_alert_level: string');

	const detection = w.store[`${DETECTION_PREFIX}5`];
	assert.equal(typeof detection, 'object', 'detection_{tabId}: detection result object');
	assert.equal(detection.tabId, 5);
	assert.equal(detection.risk, 'exposed');
	assert.equal(detection.alertLevel, 'high');
	assert.equal(typeof detection.storedAt, 'number');
});

// --- CTA URL (Phase 6) ------------------------------------------------------

test('CTA URL carries source=chrome_extension and the alert level', async () => {
	const high = await loadWorker().sendPageSignals(CA_SIGNALS, 1);
	assert.equal(high.alertLevel, 'high');
	assert.equal(
		high.ctaUrl,
		'https://taxnexusapp.com/trial?source=chrome_extension&alert=high'
	);

	// A clear page still carries a CTA, tagged so the landing page can tell the
	// difference between "the extension warned me" and "I clicked from nowhere".
	const none = await loadWorker().sendPageSignals(
		{ hasCaInventory: false, hasCaText: true, fcCodes: [], signals: [] },
		2
	);
	assert.equal(none.alertLevel, 'none');
	assert.equal(
		none.ctaUrl,
		'https://taxnexusapp.com/trial?source=chrome_extension&alert=none'
	);
});
