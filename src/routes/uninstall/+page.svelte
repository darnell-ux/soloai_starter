<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { trackEvent } from '$lib/analytics/dataLayer';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The extension is deliberately zero-telemetry, so an uninstall is the only
	// lifecycle event we ever see. Worth counting, and worth asking about.
	onMount(() => {
		if (!browser) return;
		trackEvent('extension_uninstall', { source: data.source });
	});

	const REASONS = [
		{ id: 'no_alert', label: 'It never alerted me, even though I have CA inventory' },
		{ id: 'wrong_alert', label: 'It alerted when it should not have' },
		{ id: 'not_useful', label: 'I understood my situation and did not need it' },
		{ id: 'other', label: 'Something else' }
	] as const;

	const contactHref = $derived(localizeHref('/contact') as string);
	const auditHref = $derived(localizeHref('/taxnexus') as string);
</script>

<SeoHead
	pageTitle="Extension uninstalled"
	description="You have removed the TaxNexus Nexus Alert extension. Tell us what went wrong, or keep checking your California nexus exposure on the web."
	noindex
/>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">The extension is uninstalled.</h1>
	<p class="mt-4 text-base leading-relaxed text-base-content/80">
		Nothing of yours was kept. The extension stored everything locally in your browser and made
		no network requests, so removing it removed the data with it — there is no account to close
		and nothing for us to delete.
	</p>

	<section class="mt-10">
		<h2 class="text-lg font-semibold">If you have a moment — what happened?</h2>
		<p class="mt-2 text-sm text-base-content/70">
			The first option is the one we most want to hear about. It would mean the detection missed
			something it should have caught, which is a bug on our side, not a preference.
		</p>
		<ul class="mt-4 space-y-2 text-sm text-base-content/80">
			{#each REASONS as reason}
				<li>• {reason.label}</li>
			{/each}
		</ul>
		<a
			href={contactHref}
			class="btn btn-outline btn-sm mt-5"
			onclick={() => trackEvent('extension_uninstall_feedback_click', { source: data.source })}
		>
			Tell us which one
		</a>
	</section>

	<section class="mt-12 border-t border-base-300 pt-8">
		<h2 class="text-lg font-semibold">California nexus does not go away when the alert does</h2>
		<p class="mt-2 text-base leading-relaxed text-base-content/80">
			If Amazon has placed your inventory in a California fulfillment center, you are "doing
			business" in the state at any sales volume. You can still check where you stand without
			installing anything.
		</p>
		<a href={auditHref} class="btn btn-primary mt-5">Run the check on the web</a>
	</section>

	<p class="mt-10 text-xs leading-relaxed text-base-content/60">
		TaxNexus provides general information about California tax thresholds. It is not tax advice
		and does not create a professional relationship.
	</p>
</main>
