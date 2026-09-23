// The three E2E targets from TESTING.md, in priority order.
//
// These drive a real Chromium with the built extension loaded, so they cover
// the things the node:test suite structurally cannot: real shadow roots, real
// per-tab badges, real service-worker lifecycle, and state surviving a browser
// restart.
//
// Run: npm run build && npm run test:e2e
import { test, expect } from '@playwright/test';
import {
	SELLER_CENTRAL,
	launchWithExtension,
	inventoryFixture,
	swEval,
	readStorage,
	badgeFor,
	waitForStorage,
	detectionRecords,
	openPopup,
	profile
} from './helpers.mjs';

// ---------------------------------------------------------------------------
// 1. CA detection -> badge -> popup. The mission-critical path.
// ---------------------------------------------------------------------------

test('detection on a Seller Central page turns the badge red and shows in the popup', async () => {
	const { dir, cleanup } = profile();
	const { context, extensionId, setFixture } = await launchWithExtension(dir);

	try {
		// The FC code lives inside an OPEN SHADOW ROOT, because that is the real
		// shape of Seller Central. A plain innerText read would find nothing here.
		setFixture(inventoryFixture({ fcCode: 'ONT8', inShadow: true }));

		const page = await context.newPage();
		await page.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list`);

		const record = await waitForStorage(
			context,
			(store) => detectionRecords(store).find((r) => r.risk === 'exposed'),
			{ label: 'an exposed detection record' }
		);

		expect(record.alertLevel).toBe('high');
		expect(record.signals.fcCodes).toEqual(['ONT8']);
		expect(record.signals.host).toBe('sellercentral.amazon.com');
		expect(record.assessment.minTax).toBe(800);
		expect(record.ctaUrl).toBe(
			'https://taxnexusapp.com/trial?source=chrome_extension&alert=high'
		);

		// The badge is scoped to the detecting tab, not set globally.
		expect(await badgeFor(context, record.tabId)).toBe('!');

		const popup = await openPopup(context, extensionId);
		await expect(popup.getByText('CA nexus exposure detected')).toBeVisible();
		await expect(popup.getByText('HIGH')).toBeVisible();
		await expect(popup.getByText(/ONT8/)).toBeVisible();
		await expect(popup.getByText(/\$800\/yr/)).toBeVisible();
		await expect(popup.getByRole('link', { name: /Start free trial/ })).toHaveAttribute(
			'href',
			'https://taxnexusapp.com/trial?source=chrome_extension&alert=high'
		);
	} finally {
		await context.close();
		cleanup();
	}
});

test('a page with no CA code reports clear, and makes no network request', async () => {
	const { dir, cleanup } = profile();
	const { context, setFixture } = await launchWithExtension(dir);

	try {
		// Anything the extension requested would have to leave via the browser, so
		// watch every request the profile makes and assert none is ours.
		const external = [];
		context.on('request', (req) => {
			const url = req.url();
			if (!url.startsWith('https://sellercentral.amazon.com/') && !url.startsWith('chrome-extension://')) {
				external.push(url);
			}
		});

		setFixture(inventoryFixture({ fcCode: 'DFW7', inShadow: true })); // Texas
		const page = await context.newPage();
		await page.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list`);

		const record = await waitForStorage(
			context,
			(store) => detectionRecords(store).find((r) => r.risk === 'clear'),
			{ label: 'a clear detection record' }
		);

		expect(record.alertLevel).toBe('none');
		expect(record.signals.fcCodes).toEqual([]);
		expect(await badgeFor(context, record.tabId)).toBe('✓');
		expect(external, `extension made unexpected requests: ${external.join(', ')}`).toEqual([]);
	} finally {
		await context.close();
		cleanup();
	}
});

// ---------------------------------------------------------------------------
// 2. Snooze suppression across a browser restart.
//
// This is the one behaviour whose entire point is surviving a process
// boundary, which no unit test can prove.
// ---------------------------------------------------------------------------

test('snooze survives a full browser restart and still suppresses the badge', async () => {
	const { dir, cleanup } = profile();
	let session = await launchWithExtension(dir);

	try {
		// --- first session: detect, then snooze from the popup UI ---
		session.setFixture(inventoryFixture({ fcCode: 'SMF1', inShadow: true }));
		let page = await session.context.newPage();
		await page.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list`);

		const first = await waitForStorage(
			session.context,
			(store) => detectionRecords(store).find((r) => r.risk === 'exposed'),
			{ label: 'the pre-snooze detection' }
		);
		expect(await badgeFor(session.context, first.tabId)).toBe('!');

		const popup = await openPopup(session.context, session.extensionId);
		await popup.getByRole('button', { name: 'Snooze 7 days' }).click();

		const snoozeUntil = await waitForStorage(
			session.context,
			(store) => store.snooze_until,
			{ label: 'snooze_until to be written' }
		);
		expect(snoozeUntil).toBeGreaterThan(Date.now());

		// --- restart: same profile directory, brand new browser process ---
		await session.context.close();
		session = await launchWithExtension(dir);

		const afterRestart = await readStorage(session.context);
		expect(afterRestart.snooze_until, 'snooze must outlive the browser').toBe(snoozeUntil);
		// Per-tab dismissals deliberately do NOT survive; tab ids are recycled.
		expect(afterRestart.dismissed_tabs).toBeUndefined();

		// --- and it still suppresses a fresh detection ---
		session.setFixture(inventoryFixture({ fcCode: 'LAX9', inShadow: true }));
		page = await session.context.newPage();
		await page.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list`);

		const suppressed = await waitForStorage(
			session.context,
			(store) => detectionRecords(store).find((r) => r.signals?.fcCodes?.includes('LAX9')),
			{ label: 'the post-restart detection' }
		);

		// Suppression hides the interruption, never the finding.
		expect(suppressed.risk).toBe('exposed');
		expect(await badgeFor(session.context, suppressed.tabId)).toBe('');
	} finally {
		await session.context.close();
		cleanup();
	}
});

// ---------------------------------------------------------------------------
// 3. Per-tab dismiss isolation.
//
// Per-tab badge scoping is the easiest thing to silently regress into a global
// badge, and no unit test sees a real second tab.
// ---------------------------------------------------------------------------

test('dismissing one tab leaves the other tab alerting', async () => {
	const { dir, cleanup } = profile();
	const { context, extensionId, setFixture } = await launchWithExtension(dir);

	try {
		setFixture(inventoryFixture({ fcCode: 'ONT8', inShadow: true }));

		const tabA = await context.newPage();
		await tabA.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list`);
		const tabB = await context.newPage();
		await tabB.goto(`${SELLER_CENTRAL}fba-inventory/gim/inventory-list?view=2`);

		const both = await waitForStorage(
			context,
			(store) => {
				const exposed = detectionRecords(store).filter((r) => r.risk === 'exposed');
				return exposed.length >= 2 ? exposed : null;
			},
			{ label: 'two exposed detection records' }
		);

		const [a, b] = both;
		expect(await badgeFor(context, a.tabId)).toBe('!');
		expect(await badgeFor(context, b.tabId)).toBe('!');

		// Dismiss tab A the way the popup does: an explicit tabId in the message.
		// Sent from the popup page so it goes through the real extension context.
		const popup = await openPopup(context, extensionId);
		await popup.evaluate(
			(tabId) =>
				new Promise((resolve) =>
					chrome.runtime.sendMessage({ type: 'taxnexus/dismiss', tabId }, resolve)
				),
			a.tabId
		);

		await expect
			.poll(() => badgeFor(context, a.tabId), { message: 'dismissed tab should go dark' })
			.toBe('');
		expect(await badgeFor(context, b.tabId), 'the other tab must be untouched').toBe('!');

		const store = await readStorage(context);
		expect(store.dismissed_tabs).toEqual([a.tabId]);

		// Closing the dismissed tab cleans up both its dismissal and its record.
		await tabA.close();
		await expect
			.poll(async () => (await readStorage(context)).dismissed_tabs, {
				message: 'tab close should drop the dismissal'
			})
			.toEqual([]);
		const afterClose = await readStorage(context);
		expect(afterClose[`detection_${a.tabId}`]).toBeUndefined();
		expect(await badgeFor(context, b.tabId), 'tab B still alerting at the end').toBe('!');
	} finally {
		await context.close();
		cleanup();
	}
});
