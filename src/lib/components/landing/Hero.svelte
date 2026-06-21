<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import Marks from './Marks.svelte';

	// §1 — every CTA points at the free Audit, which currently lives at /taxnexus.
	const auditHref = resolve(localizeHref('/taxnexus' as Pathname) as any);
</script>

<!-- §1 HERO -->
<section class="bg-base-100" aria-labelledby="home-hero-heading">
	<div class="mx-auto max-w-5xl px-4 py-12 md:py-20">
		<div class="relative border border-base-300 bg-base-100 p-7 md:p-12">
			<Marks />
			<span
				class="absolute right-5 top-5 hidden rotate-[7deg] border-2 border-primary px-3 py-2 text-center font-mono text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.12em] text-primary opacity-80 sm:block"
				aria-hidden="true"
			>
				{m.home_stamp_line1()}<br />{m.home_stamp_line2()}
			</span>

			<p
				class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
			>
				{m.home_hero_eyebrow()}
				<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
			</p>

			<h1
				id="home-hero-heading"
				class="max-w-[18ch] text-4xl font-bold leading-[1.1] tracking-tight text-base-content md:text-6xl"
			>
				{m.home_hero_heading()}
			</h1>

			<p class="mt-5 max-w-[46ch] text-lg leading-relaxed text-base-content">
				{m.home_hero_subhead()}
			</p>

			<div class="mt-8">
				<a class="btn btn-primary font-mono" href={auditHref} data-sveltekit-preload-data="hover">
					<span aria-hidden="true">▸</span>
					{m.home_hero_cta()}
				</a>
				<p class="mt-4 font-mono text-xs text-muted">{m.home_hero_microcopy()}</p>
			</div>
		</div>
	</div>
</section>
