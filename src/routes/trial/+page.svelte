<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { trackEvent } from '$lib/analytics/dataLayer';
	import { attributionQuery } from '$lib/attribution';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Messaging is keyed to the alert level the extension detected, so a seller
	// who arrives from a HIGH alert lands on the urgent framing and one who
	// arrives cold lands on the general pitch.
	const COPY = {
		high: {
			eyebrow: 'High alert — CA inventory detected',
			heading: 'Amazon is storing your inventory in California.',
			body: `A California fulfillment-center code on your Seller Central page means your stock
				physically sits in CA. Under R&TC 23101(a) that makes you "doing business" in the
				state at any sales volume — there is no safe harbor for physical presence, and the
				$800 minimum franchise tax plus CDTFA registration applies from the first unit stored.`,
			cta: 'Check my full exposure'
		},
		low: {
			eyebrow: 'Worth a look',
			heading: 'This page mentions a California location.',
			body: `We spotted California location text but no fulfillment-center code, so this is a hint
				rather than proof. If Amazon has ever placed your inventory in a CA warehouse, the
				nexus clock may already be running. A two-minute check settles it.`,
			cta: 'Run a free nexus check'
		},
		none: {
			eyebrow: 'TaxNexus',
			heading: 'Know your California nexus exposure before the FTB does.',
			body: `California treats a single unit of inventory in one of its warehouses as "doing business."
				Most FBA sellers find out years later, with penalties and interest attached. TaxNexus
				tells you where you stand today.`,
			cta: 'Start free trial'
		}
	} as const;

	const copy = $derived(COPY[data.alert]);
	// Carry attribution across the handoff. Without this the chain breaks exactly
	// where it starts being worth money: an extension-driven signup would be
	// indistinguishable from an organic one the moment the user clicks through.
	const signupHref = $derived(
		localizeHref(
			`/signup?redirectTo=${encodeURIComponent('/taxnexus')}` +
				attributionQuery(data.source, data.alert)
		) as string
	);
	const auditHref = $derived(localizeHref('/taxnexus') as string);

	onMount(() => {
		if (!browser) return;
		// Attribution for the extension funnel: which alert level actually converts.
		trackEvent('trial_landing_view', { source: data.source, alert_level: data.alert });
	});
</script>

<SeoHead
	pageTitle="Start your free trial"
	description="Find out whether your Amazon FBA inventory has triggered California nexus — free check, no card required."
/>

<main class="mx-auto max-w-2xl px-4 py-12">
	<p class="text-sm font-semibold uppercase tracking-wider text-primary">{copy.eyebrow}</p>
	<h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.heading}</h1>
	<p class="mt-5 text-base leading-relaxed text-base-content/80">{copy.body}</p>

	{#if data.source === 'chrome_extension'}
		<p class="mt-4 text-sm text-base-content/60">
			You arrived from the TaxNexus Nexus Alert extension. The extension never sends your
			Amazon data anywhere — the alert was computed from the page you were already viewing.
		</p>
	{/if}

	<div class="mt-8 flex flex-col gap-3 sm:flex-row">
		{#if data.signedIn}
			<a href={auditHref} class="btn btn-primary btn-lg">{copy.cta}</a>
		{:else}
			<a
				href={signupHref}
				class="btn btn-primary btn-lg"
				onclick={() => trackEvent('trial_signup_click', { source: data.source, alert_level: data.alert })}
			>
				{copy.cta}
			</a>
			<a href={auditHref} class="btn btn-ghost btn-lg">Try it without an account</a>
		{/if}
	</div>

	<ul class="mt-10 space-y-3 text-sm text-base-content/80">
		<li>✓ Free nexus assessment — no card required</li>
		<li>✓ Shows the exact FTB and CDTFA obligations you have triggered</li>
		<li>✓ Estimates penalties and interest if you are already late</li>
	</ul>

	<p class="mt-10 text-xs leading-relaxed text-base-content/60">
		TaxNexus provides general information about California tax thresholds. It is not tax advice
		and does not create a professional relationship. Consult a qualified tax professional before
		acting on any assessment.
	</p>
</main>
