<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	const items = [
		{ q: m.home_faq_q1(), a: m.home_faq_a1() },
		{ q: m.home_faq_q2(), a: m.home_faq_a2() },
		{ q: m.home_faq_q3(), a: m.home_faq_a3() },
		{ q: m.home_faq_q4(), a: m.home_faq_a4() },
		{ q: m.home_faq_q5(), a: m.home_faq_a5() },
		{ q: m.home_faq_q6(), a: m.home_faq_a6() },
		{ q: m.home_faq_q7(), a: m.home_faq_a7() },
		{ q: m.home_faq_q8(), a: m.home_faq_a8() }
	];
</script>

<!-- §8 FAQ -->
<section class="border-y border-base-300 bg-base-200" aria-labelledby="home-faq-heading">
	<div class="mx-auto max-w-2xl px-4 py-16 md:py-24">
		<p
			class="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
		>
			{m.home_faq_eyebrow()}
			<span class="h-px max-w-[5rem] flex-1 bg-base-300"></span>
		</p>
		<h2 id="home-faq-heading" class="text-3xl font-semibold tracking-tight text-accent md:text-4xl">
			{m.home_faq_heading()}
		</h2>

		<div class="mt-8 border-t border-base-300">
			{#each items as item (item.q)}
				<details class="group border-b border-base-300">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.06rem] font-semibold text-accent [&::-webkit-details-marker]:hidden"
					>
						{item.q}
						<span class="font-mono text-xl text-primary group-open:hidden" aria-hidden="true">+</span>
						<span class="hidden font-mono text-xl text-primary group-open:inline" aria-hidden="true"
							>–</span
						>
					</summary>
					<div class="max-w-[54ch] pb-5">
						<p class="text-base-content">{item.a}</p>
					</div>
				</details>
			{/each}
		</div>
	</div>
</section>
