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

	/** Split `</scr` + `ipt>` so the Svelte compiler does not close the module script early. */
	const headHtml = $derived(
		!valid
			? ''
			: blockedUntilKlaro
				? '<script type="text/plain" data-type="application/javascript" data-name="google-tag-manager">' +
						snippet +
						'</scr' +
						'ipt>'
				: '<script data-gtm-bootstrap="1">' + snippet + '</scr' + 'ipt>'
	);
</script>

<svelte:head>
	{#if headHtml}
		{@html headHtml}
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
