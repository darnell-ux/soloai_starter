<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import HomeFaq from '$lib/components/HomeFaq.svelte';
	import HomeFeaturesPreview from '$lib/components/HomeFeaturesPreview.svelte';
	import HomeHero from '$lib/components/HomeHero.svelte';
	import HomeSignupCta from '$lib/components/HomeSignupCta.svelte';

	let { data } = $props();

	const authSession = $derived(
		data.authSession === 'signed-in' ? ('signed-in' as const) : ('signed-out' as const)
	);
</script>

<SeoHead
	documentTitle={data.cmsSeo?.title}
	pageTitle="Home"
	description={data.hero.subtext}
	cms={data.cmsSeo
		? {
				title: data.cmsSeo.title,
				description: data.cmsSeo.description,
				imageUrl: data.cmsSeo.imageUrl ?? undefined
			}
		: undefined}
/>

<HomeHero hero={data.hero} authSession={authSession} />
<HomeFeaturesPreview items={data.featureItems} />
<HomeFaq groups={data.faqGroups} />
<HomeSignupCta authSession={authSession} landing={data.landingSignup} />
