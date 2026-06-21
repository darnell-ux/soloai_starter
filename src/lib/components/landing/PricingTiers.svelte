<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';

	// All tiers route to /taxnexus for now (Guard/Aggregator checkout wiring comes later).
	const auditHref = resolve(localizeHref('/taxnexus' as Pathname) as any);
</script>

<!-- §7 PRICING -->
<section id="pricing" class="scroll-mt-4 bg-base-100" aria-labelledby="home-pricing-heading">
	<div class="mx-auto max-w-5xl px-4 py-16 md:py-24">
		<div class="max-w-2xl">
			<p
				class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
			>
				{m.home_pricing_eyebrow()}
				<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
			</p>
			<h2
				id="home-pricing-heading"
				class="text-3xl font-semibold tracking-tight text-accent md:text-4xl"
			>
				{m.home_pricing_heading()}
			</h2>
			<p class="mt-6 text-base-content">{m.home_pricing_intro()}</p>
		</div>

		<div class="my-8 grid grid-cols-1 gap-5 md:grid-cols-3">
			<!-- Audit (free / featured) -->
			<div class="relative flex flex-col border-2 border-secondary bg-base-100 p-6">
				<span
					class="absolute -top-3 left-5 bg-secondary px-2 py-1 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-secondary-content"
				>
					{m.home_pricing_audit_badge()}
				</span>
				<p class="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-accent">
					{m.home_pricing_audit_name()}
				</p>
				<p class="my-1 text-3xl font-bold tracking-tight text-base-content">
					{m.home_pricing_audit_price()}
				</p>
				<p class="mb-3 font-serif italic text-muted">{m.home_pricing_audit_q()}</p>
				<p class="flex-1 text-[0.95rem] text-base-content">{m.home_pricing_audit_body()}</p>
				<a
					class="btn btn-primary mt-4 w-full font-mono"
					href={auditHref}
					data-sveltekit-preload-data="hover"
				>
					<span aria-hidden="true">▸</span>
					{m.home_pricing_audit_cta()}
				</a>
			</div>

			<!-- Guard -->
			<div class="flex flex-col border border-base-300 bg-base-100 p-6">
				<p class="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-accent">
					{m.home_pricing_guard_name()}
				</p>
				<p class="my-1 text-3xl font-bold tracking-tight text-base-content">
					{m.home_pricing_guard_price()}<span class="font-mono text-sm font-medium text-muted"
						>&nbsp;{m.home_pricing_guard_price_unit()}</span
					>
				</p>
				<p class="mb-3 font-serif italic text-muted">{m.home_pricing_guard_q()}</p>
				<p class="flex-1 text-[0.95rem] text-base-content">{m.home_pricing_guard_body()}</p>
				<a
					class="btn btn-outline btn-secondary mt-4 w-full font-mono"
					href={auditHref}
					data-sveltekit-preload-data="hover"
				>
					<span aria-hidden="true">▸</span>
					{m.home_pricing_guard_cta()}
				</a>
			</div>

			<!-- Aggregator -->
			<div class="flex flex-col border border-base-300 bg-base-100 p-6">
				<p class="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-accent">
					{m.home_pricing_aggregator_name()}
				</p>
				<p class="my-1 text-3xl font-bold tracking-tight text-base-content">
					{m.home_pricing_aggregator_price()}<span class="font-mono text-sm font-medium text-muted"
						>&nbsp;{m.home_pricing_aggregator_price_unit()}</span
					>
				</p>
				<p class="mb-3 font-serif italic text-muted">{m.home_pricing_aggregator_q()}</p>
				<p class="flex-1 text-[0.95rem] text-base-content">{m.home_pricing_aggregator_body()}</p>
				<a
					class="btn btn-outline btn-secondary mt-4 w-full font-mono"
					href={auditHref}
					data-sveltekit-preload-data="hover"
				>
					<span aria-hidden="true">▸</span>
					{m.home_pricing_aggregator_cta()}
				</a>
			</div>
		</div>

		<p class="text-center font-mono text-sm text-muted">{m.home_pricing_foot()}</p>
	</div>
</section>
