<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import Marks from './Marks.svelte';

	const auditHref = resolve(localizeHref('/taxnexus' as Pathname) as any);
</script>

<!-- §9 FINAL CTA -->
<section class="bg-base-100" aria-labelledby="home-final-heading">
	<div class="mx-auto max-w-5xl px-4 py-16 md:py-24">
		<div class="relative mx-auto max-w-2xl border border-base-300 bg-base-100 p-8 text-center md:p-12">
			<Marks />
			<p
				class="mb-4 flex items-center justify-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
			>
				{m.home_final_eyebrow()}
			</p>
			<h2
				id="home-final-heading"
				class="mb-4 text-3xl font-semibold tracking-tight text-accent md:text-4xl"
			>
				{m.home_final_heading()}
			</h2>
			<p class="mx-auto mb-6 max-w-[40ch] text-base-content">{m.home_final_body()}</p>
			<a class="btn btn-primary font-mono" href={auditHref} data-sveltekit-preload-data="hover">
				<span aria-hidden="true">▸</span>
				{m.home_final_cta()}
			</a>
			<p class="mt-4 font-mono text-xs text-muted">{m.home_final_microcopy()}</p>
		</div>
	</div>
</section>
