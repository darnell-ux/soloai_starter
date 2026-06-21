<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';

	const auditHref = resolve(localizeHref('/taxnexus' as Pathname) as any);
</script>

<!-- §5 THE CAMPS -->
<section class="bg-base-100" aria-labelledby="home-camps-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
		>
			{m.home_camps_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
		</p>
		<h2 id="home-camps-heading" class="text-3xl font-semibold tracking-tight text-accent md:text-4xl">
			{m.home_camps_heading()}
		</h2>

		<p class="mt-6 text-base-content">{m.home_camps_intro()}</p>

		<div class="my-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
			<div class="border border-primary bg-primary/10 p-6">
				<p class="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
					{m.home_camps_bad_tag()}
				</p>
				<p class="text-[0.98rem] text-base-content">{m.home_camps_bad_body()}</p>
			</div>
			<div class="border border-secondary p-6">
				<p class="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
					{m.home_camps_good_tag()}
				</p>
				<p class="text-[0.98rem] text-base-content">{m.home_camps_good_body()}</p>
			</div>
		</div>

		<p class="mt-4 text-base-content">{m.home_camps_p2()}</p>
		<p class="mt-4 text-base-content">{m.home_camps_p3()}</p>
		<p class="mt-4 text-base-content">{m.home_camps_p4()}</p>

		<div class="mt-8">
			<a class="btn btn-primary font-mono" href={auditHref} data-sveltekit-preload-data="hover">
				<span aria-hidden="true">▸</span>
				{m.home_camps_cta()}
			</a>
		</div>
	</div>
</section>
