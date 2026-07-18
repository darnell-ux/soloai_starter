<script lang="ts">
	import { page } from '$app/state';
	import { publicLocales } from '$lib/i18n/locales';
	import { buildOrganizationJsonLd, buildWebsiteJsonLd, serializeJsonLd } from '$lib/seo/jsonld';

	const orgJson = $derived(serializeJsonLd(buildOrganizationJsonLd(page.url.origin)));
	const webJson = $derived(serializeJsonLd(buildWebsiteJsonLd(page.url.origin, publicLocales)));
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD only; string from serializeJsonLd (no raw user HTML). -->
	{@html '<script type="application/ld+json">' + orgJson + '</scr' + 'ipt>'}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD only; string from serializeJsonLd (no raw user HTML). -->
	{@html '<script type="application/ld+json">' + webJson + '</scr' + 'ipt>'}
</svelte:head>
