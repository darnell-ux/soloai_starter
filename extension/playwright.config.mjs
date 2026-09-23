import { defineConfig } from '@playwright/test';

// E2E for the MV3 extension. Separate from the app's root playwright.config.ts:
// these tests need a persistent context with --load-extension, and they never
// touch the SvelteKit dev server.
//
// Serial by design. Every test drives a real browser profile with the extension
// loaded and asserts on chrome.storage / the toolbar badge, which are global to
// that profile — running them in parallel would have them fighting over state.
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	// Extension startup (profile creation + service worker registration) is the
	// slow part, and each test does it at least once.
	timeout: 90_000,
	expect: { timeout: 15_000 },
	use: {
		trace: 'retain-on-failure',
		video: 'retain-on-failure'
	}
});
