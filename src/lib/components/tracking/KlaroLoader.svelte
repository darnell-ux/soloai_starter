<script lang="ts">
	import { onMount } from 'svelte';
	import { buildKlaroConfig } from '$lib/analytics/klaroConfig';
	import 'klaro/dist/klaro.min.css';

	let {
		lang,
		privacyPolicyHref
	}: {
		lang: string;
		privacyPolicyHref: string;
	} = $props();

	onMount(async () => {
		const mod = await import('klaro');
		const setup = mod.default?.setup;
		if (typeof setup !== 'function') return;
		const cfg = buildKlaroConfig({ lang, privacyPolicyHref });
		setup(cfg);
	});
</script>

<div id="klaro" aria-live="polite"></div>
