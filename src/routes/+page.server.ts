import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { mergeHero } from '$lib/server/homepage-hero';
import { groupFaqsByCategory, fetchPublishedFaqs } from '$lib/server/strapi/faqs';
import {
	fetchLandingHomepageBundle,
	fetchPublishedFeatures
} from '$lib/server/strapi/homepage-content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, max-age=60' });

	const locale = extractLocaleFromRequest(request);

	try {
		const [bundle, featureItems, faqItems] = await Promise.all([
			fetchLandingHomepageBundle(locale),
			fetchPublishedFeatures(locale),
			fetchPublishedFaqs(locale)
		]);

		const hero = mergeHero(bundle?.hero ?? null);
		const landingSignup = bundle?.signup ?? null;
		const cmsSeo = bundle?.seo ?? null;
		const faqGroups = groupFaqsByCategory(faqItems);

		return {
			hero,
			featureItems,
			landingSignup,
			cmsSeo,
			faqGroups
		};
	} catch {
		return {
			hero: mergeHero(null),
			featureItems: [],
			landingSignup: null,
			cmsSeo: null,
			faqGroups: []
		};
	}
};
