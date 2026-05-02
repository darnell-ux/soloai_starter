<script lang="ts">
	import type { FaqGroup } from '$lib/server/strapi/faqs';

	let { groups }: { groups: FaqGroup[] } = $props();
</script>

<section class="border-t border-base-300 bg-base-200/30" aria-labelledby="home-faq-heading">
	<div class="mx-auto max-w-6xl px-4 py-16">
		<h2 id="home-faq-heading" class="text-3xl font-semibold tracking-tight text-base-content">FAQ</h2>
		<p class="mt-2 max-w-2xl text-base text-base-content/80">
			Common questions about the product and your account.
		</p>

		{#if groups.length === 0}
			<p class="mt-10 text-base text-base-content/70" role="status">No FAQs are available yet.</p>
		{:else}
			<div class="mt-10 flex flex-col gap-12">
				{#each groups as block (block.category)}
					<div>
						<h3 class="text-lg font-semibold text-base-content">{block.label}</h3>
						<ul class="mt-4 divide-y divide-base-300 rounded-box border border-base-300 bg-base-100" role="list">
							{#each block.items as item (item.id)}
								<li class="px-4 py-4">
									<p class="font-medium text-base-content">{item.question}</p>
									<div class="prose prose-sm mt-2 max-w-none text-base-content/80">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side (sanitizeCmsHtml) -->
										{@html item.answerHtml}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
