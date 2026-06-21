<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';

	const auditHref = resolve(localizeHref('/taxnexus' as Pathname) as any);
</script>

<!-- §4 WHAT YOU GET FREE -->
<section class="border-y border-base-300 bg-base-200" id="audit-info" aria-labelledby="home-audit-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
		>
			{m.home_audit_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
		</p>
		<h2 id="home-audit-heading" class="text-3xl font-semibold tracking-tight text-accent md:text-4xl">
			{m.home_audit_heading()}
		</h2>

		<p class="mt-6 text-base-content">{m.home_audit_intro()}</p>
		<p class="mt-4 text-base-content">{m.home_audit_p2()}</p>

		<p class="mb-2 mt-6 font-semibold text-accent">{m.home_audit_list_heading()}</p>
		<ul class="grid gap-4">
			<li class="grid grid-cols-[auto_1fr] gap-3">
				<span class="font-mono font-semibold text-primary" aria-hidden="true">›</span>
				<span class="text-base-content">{m.home_audit_item1()}</span>
			</li>
			<li class="grid grid-cols-[auto_1fr] gap-3">
				<span class="font-mono font-semibold text-primary" aria-hidden="true">›</span>
				<span class="text-base-content">{m.home_audit_item2()}</span>
			</li>
			<li class="grid grid-cols-[auto_1fr] gap-3">
				<span class="font-mono font-semibold text-primary" aria-hidden="true">›</span>
				<span class="text-base-content">{m.home_audit_item3()}</span>
			</li>
			<li class="grid grid-cols-[auto_1fr] gap-3">
				<span class="font-mono font-semibold text-primary" aria-hidden="true">›</span>
				<span class="text-base-content">{m.home_audit_item4()}</span>
			</li>
		</ul>

		<p class="mt-6 text-base-content">{m.home_audit_p3()}</p>
		<div class="mt-8">
			<a class="btn btn-primary font-mono" href={auditHref} data-sveltekit-preload-data="hover">
				<span aria-hidden="true">▸</span>
				{m.home_audit_cta()}
			</a>
		</div>
	</div>
</section>
