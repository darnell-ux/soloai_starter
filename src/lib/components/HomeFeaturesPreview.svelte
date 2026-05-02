<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import type { FeaturePreviewItem } from '$lib/server/strapi/homepage-content';

	let { items }: { items: FeaturePreviewItem[] } = $props();
</script>

<section class="border-t border-base-300 bg-base-100" aria-labelledby="home-features-heading">
	<div class="mx-auto max-w-6xl px-4 py-16">
		<h2 id="home-features-heading" class="text-3xl font-semibold tracking-tight text-base-content">
			{m.home_features_heading()}
		</h2>
		<p class="mt-2 max-w-2xl text-base text-base-content/80">{m.home_features_subheading()}</p>

		{#if items.length === 0}
			<p class="mt-10 text-base text-base-content/70" role="status">{m.home_features_empty()}</p>
		{:else}
			<ul class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
				{#each items as item (item.id)}
					<li
						class="card border border-base-300 bg-base-200/40 shadow-sm"
					>
						<div class="card-body gap-3 p-6">
							{#if item.iconUrl}
								<img
									src={item.iconUrl}
									alt=""
									class="h-10 w-10 object-contain"
									width="40"
									height="40"
									loading="lazy"
									decoding="async"
								/>
							{/if}
							<h3 class="card-title text-lg font-semibold text-base-content">
								<a
									class="link-hover link-primary"
									href={resolve(localizeHref('/features') as any)}
									data-sveltekit-preload-data="hover"
								>
									{item.name}
								</a>
							</h3>
							<p class="text-sm text-base-content/80">{item.shortDescription}</p>
							{#if item.featureImageUrl}
								<img
									src={item.featureImageUrl}
									alt={item.name}
									class="mt-2 max-h-40 w-full rounded-md object-cover"
									width="800"
									height="450"
									loading="lazy"
									decoding="async"
								/>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
