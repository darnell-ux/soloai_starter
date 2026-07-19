<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';

	let { showCookieSettings = false }: { showCookieSettings?: boolean } = $props();

	const year = new Date().getFullYear();

	function openCookieSettings() {
		window.klaro?.show?.();
	}
</script>

<footer class="border-t border-base-300 bg-base-200/40">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
		<nav aria-label={m.footer_nav_label()} class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
			<a
				class="link link-hover"
				href={resolve(localizeHref('/pricing') as any)}
				data-sveltekit-preload-data="hover"
			>
				{m.footer_link_pricing()}
			</a>
			<a
				class="link link-hover"
				href={resolve(localizeHref('/contact') as any)}
				data-sveltekit-preload-data="hover"
			>
				{m.footer_link_contact()}
			</a>
			<a
				class="link link-hover"
				href={resolve(localizeHref('/privacy') as any)}
				data-sveltekit-preload-data="hover"
			>
				{m.footer_link_privacy()}
			</a>
			<a
				class="link link-hover"
				href={resolve(localizeHref('/terms') as any)}
				data-sveltekit-preload-data="hover"
			>
				{m.footer_link_terms()}
			</a>
			<a
				class="link link-hover"
				href={resolve(localizeHref('/refunds') as any)}
				data-sveltekit-preload-data="hover"
			>
				{m.footer_link_refunds()}
			</a>
			{#if showCookieSettings}
				<button type="button" class="link link-hover cursor-pointer bg-transparent text-left" onclick={openCookieSettings}>
					{m.footer_link_cookie_settings()}
				</button>
			{/if}
		</nav>
		<p class="max-w-3xl text-xs text-base-content/60">
			TaxNexus provides informational tools only and does not constitute tax, legal, or financial
			advice. Users should consult a qualified tax professional for their specific filing obligations.
		</p>
		<p class="text-sm text-base-content/70">{m.footer_copyright({ year: String(year) })}</p>
	</div>
</footer>
