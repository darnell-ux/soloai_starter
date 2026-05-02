<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = true;
</script>

<SeoHead
	pageTitle="Features"
	description="Explore product capabilities, integrations, and what you can build with our platform."
	breadcrumbs={[
		{ name: 'Home', path: '/' },
		{ name: 'Features', path: '/features' }
	]}
/>

<main>
	<h1>Features</h1>
	<p>Placeholder content for the features page.</p>
</main>
