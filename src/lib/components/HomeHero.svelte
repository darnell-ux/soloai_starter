<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import type { HeroContent } from '$lib/server/homepage-hero';

	let {
		hero,
		authSession
	}: {
		hero: HeroContent;
		authSession: 'signed-in' | 'signed-out';
	} = $props();

	const ctaLabel = $derived(
		authSession === 'signed-in' ? m.home_signup_cta_button_dashboard() : hero.primaryCtaLabel
	);
</script>

<section class="hero bg-base-200" aria-labelledby="home-hero-heading">
	<div
		class="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center md:py-24"
	>
		<div class="min-w-0 flex-1">
			<h1
				id="home-hero-heading"
				class="text-4xl font-bold tracking-tight text-base-content md:text-5xl"
			>
				{hero.headline}
			</h1>
			<p class="mt-4 max-w-xl text-lg text-base-content/80">{hero.subtext}</p>
			<div class="mt-8">
				<a
					class="btn btn-primary btn-lg"
					href={resolve(
						localizeHref(
							(authSession === 'signed-in' ? '/account' : '/signup') as Pathname
						) as any
					)}
					data-sveltekit-preload-data="hover"
				>
					{ctaLabel}
				</a>
			</div>
		</div>
		{#if hero.media.src}
			<div class="flex-1 shrink-0">
				<img
					src={hero.media.src}
					alt={hero.media.alt}
					class="max-h-80 w-full rounded-lg object-cover shadow-lg"
					width="1200"
					height="630"
					sizes="(min-width: 768px) min(50vw, 36rem), 100vw"
					decoding="async"
					fetchpriority="high"
				/>
			</div>
		{:else}
			<div
				class="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-sm text-base-content/60"
				role="img"
				aria-label={hero.media.alt || 'Product illustration placeholder'}
			>
				<span>Media slot (connect Strapi asset URL)</span>
			</div>
		{/if}
	</div>
</section>
