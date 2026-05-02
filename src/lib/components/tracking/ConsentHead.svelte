<script lang="ts">
	import { buildConsentDefaultInlineScript } from '$lib/analytics/consentHeadScript';

	let { isUsLocale }: { isUsLocale: boolean } = $props();
	const inline = $derived(buildConsentDefaultInlineScript(isUsLocale));
</script>

<svelte:head>
	<!-- String concat avoids Vite scan misparsing `${...}` inside {@html} -->
	{@html '<script data-consent-default="1">' + inline + '</script>'}
</svelte:head>
