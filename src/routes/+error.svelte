<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import SeoHead from '$lib/components/SeoHead.svelte';

	let headingEl = $state<HTMLHeadingElement | null>(null);

	const is404 = $derived(page.status === 404);

	function hrefFor(path: string) {
		return resolve(localizeHref(path) as any);
	}

	onMount(async () => {
		await tick();
		headingEl?.focus();
	});
</script>

<SeoHead
	documentTitle={is404 ? m.error_page_document_title_404() : m.error_page_document_title_generic()}
	description={is404
		? 'The requested page could not be found.'
		: 'An error occurred while loading this page.'}
	noindex
/>

<section class="mx-auto max-w-xl px-4 py-12" aria-labelledby="error-heading" role="status">
	<h1 id="error-heading" tabindex="-1" bind:this={headingEl} class="text-2xl font-semibold text-base-content">
		{is404 ? m.error_page_heading_404() : m.error_page_heading_generic()}
	</h1>
	<p class="mt-4 text-base text-base-content/80">
		{is404 ? m.error_page_body_404() : m.error_page_body_generic()}
	</p>
	<p id="error-recovery-label" class="mt-8 text-sm font-medium text-base-content">
		{m.error_page_recovery_label()}
	</p>
	<ul class="mt-3 flex flex-wrap gap-3" aria-labelledby="error-recovery-label">
		<li>
			<a class="btn btn-primary btn-sm" href={hrefFor('/')} data-sveltekit-preload-data="hover">
				{m.error_page_link_home()}
			</a>
		</li>
		<li>
			<a class="btn btn-outline btn-sm" href={hrefFor('/features')} data-sveltekit-preload-data="hover">
				{m.error_page_link_features()}
			</a>
		</li>
		<li>
			<a class="btn btn-outline btn-sm" href={hrefFor('/contact')} data-sveltekit-preload-data="hover">
				{m.error_page_link_contact()}
			</a>
		</li>
	</ul>
</section>
