import { baseLocale, extractLocaleFromRequest, localizeHref } from '$lib/paraglide/runtime';
import { isValidGtmContainerId } from '$lib/analytics/dataLayer';
import { hashUserIdForAnalytics } from '$lib/analytics/user-hash.server';
import { getUserBilling } from '$lib/server/stripe/billing-store';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, request, url }) => {
	const signedIn = Boolean(locals.user);
	const locale = extractLocaleFromRequest(request);
	const isUsLocale = locale === baseLocale;
	const rawGtm = (process.env.PUBLIC_GTM_CONTAINER_ID ?? '').trim();
	const gtmContainerId = isValidGtmContainerId(rawGtm) ? rawGtm : '';

	let user_id_hash: string | null = null;
	let subscription_tier: string | null = null;
	let payment_provider: string | null = null;

	if (locals.user) {
		const uid = String(locals.user.id);
		user_id_hash = hashUserIdForAnalytics(uid, process.env.ANALYTICS_USER_HASH_PEPPER);
		const billing = getUserBilling(uid);
		subscription_tier = billing?.subscriptionTier ?? null;
		let provider = billing?.subscriptionProvider ?? null;
		if (!provider && billing) {
			if (billing.stripeSubscriptionId || billing.stripeCustomerId) provider = 'stripe';
			else if (billing.lemonSqueezySubscriptionId || billing.lemonSqueezyCustomerId) {
				provider = 'lemonsqueezy';
			}
		}
		payment_provider = provider;
	}

	const privacyPath = localizeHref('/privacy', { locale }) as string;
	const privacyPolicyHref = new URL(privacyPath, url.origin).href;
	const pageTransitionsEnabled = process.env.PUBLIC_PAGE_TRANSITIONS_ENABLED === 'true';

	return {
		authSession: signedIn ? 'signed-in' : 'signed-out',
		pageTransitionsEnabled,
		analytics: {
			gtmContainerId,
			locale,
			isUsLocale,
			privacyPolicyHref,
			user_id_hash,
			subscription_tier,
			payment_provider
		}
	};
};
