<script lang="ts">
	import { buildConsentDefaultInlineScript } from '$lib/analytics/consentHeadScript';

	let { isUsLocale }: { isUsLocale: boolean } = $props();
	const inline = $derived(buildConsentDefaultInlineScript(isUsLocale));
</script>

<svelte:head>
	<!-- Split closing tag so the compiler does not terminate the module script. -->
	{@html '<script data-consent-default="1">' + inline + '</scr' + 'ipt>'}
</svelte:head>
