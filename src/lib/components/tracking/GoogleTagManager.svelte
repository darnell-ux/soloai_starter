<script lang="ts">
	import { gtmBootstrapSnippet } from '$lib/analytics/gtmBootstrap';
	import { isValidGtmContainerId } from '$lib/analytics/dataLayer';

	let { containerId, blockedUntilKlaro }: { containerId: string; blockedUntilKlaro: boolean } =
		$props();

	const id = $derived(containerId.trim());
	const valid = $derived(isValidGtmContainerId(id));
	const snippet = $derived(valid ? gtmBootstrapSnippet(id) : '');
	const noscriptSrc = $derived(
		valid ? `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}` : ''
	);
</script>

<svelte:head>
	{#if valid}
		{#if blockedUntilKlaro}
			{@html
				'<script type="text/plain" data-type="application/javascript" data-name="google-tag-manager">' +
					snippet +
					'</script>'}
		{:else}
			{@html '<script data-gtm-bootstrap="1">' + snippet + '</script>'}
		{/if}
	{/if}
</svelte:head>

{#if valid}
	<noscript>
		<iframe
			title="Google Tag Manager"
			src={noscriptSrc}
			height="0"
			width="0"
			style="display: none; visibility: hidden"
		></iframe>
	</noscript>
{/if}
