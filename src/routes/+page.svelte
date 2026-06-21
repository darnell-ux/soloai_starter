<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DossierRail from '$lib/components/landing/DossierRail.svelte';
	import Hero from '$lib/components/landing/Hero.svelte';
	import Mechanism from '$lib/components/landing/Mechanism.svelte';
	import FounderNote from '$lib/components/landing/FounderNote.svelte';
	import FreeAudit from '$lib/components/landing/FreeAudit.svelte';
	import Camps from '$lib/components/landing/Camps.svelte';
	import ProHandoff from '$lib/components/landing/ProHandoff.svelte';
	import PricingTiers from '$lib/components/landing/PricingTiers.svelte';
	import Faq from '$lib/components/landing/Faq.svelte';
	import FinalCta from '$lib/components/landing/FinalCta.svelte';
</script>

<SeoHead pageTitle={m.home_seo_title()} description={m.home_seo_description()} />

<DossierRail />
<Hero />
<Mechanism />
<FounderNote />
<FreeAudit />
<Camps />
<ProHandoff />
<PricingTiers />
<Faq />
<FinalCta />
