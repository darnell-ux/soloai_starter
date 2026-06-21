<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Marks from './Marks.svelte';
</script>

<!-- §3 FOUNDER NOTE — IBM Plex Serif -->
<section class="bg-base-100" aria-labelledby="home-founder-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
		>
			{m.home_founder_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
		</p>
		<h2
			id="home-founder-heading"
			class="mb-6 text-3xl font-semibold tracking-tight text-accent md:text-4xl"
		>
			{m.home_founder_heading()}
		</h2>

		<div
			class="relative border border-base-300 bg-base-100 p-7 font-serif text-[1.12rem] leading-relaxed text-base-content md:p-12"
		>
			<Marks />
			<p class="mb-4">{m.home_founder_p1()}</p>
			<p class="mb-4">{m.home_founder_p2()}</p>
			<p class="mb-4">{m.home_founder_p3()}</p>
			<p class="mb-4">{m.home_founder_p4()}</p>
			<p class="mb-4">{m.home_founder_p5()}</p>
			<p class="mb-4">{m.home_founder_p6()}</p>
			<p class="mb-0">{m.home_founder_p7()}</p>

			<p class="mt-8 font-mono text-sm not-italic leading-normal text-accent">
				<b class="mb-1 block font-serif text-2xl font-semibold tracking-tight">
					{m.home_founder_sig_name()}
				</b>
				{m.home_founder_sig_title()}
			</p>
		</div>
	</div>
</section>
