import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { extractLocaleFromRequest, localizeHref } from '$lib/paraglide/runtime';
import { getEnv } from '$lib/server/env';
import { createCustomerPortalSession } from '$lib/server/stripe/create-portal';

export const POST: RequestHandler = async (event) => {
	if (!getEnv().STRIPE_ENABLED) {
		throw error(503, { message: 'stripe_unconfigured' });
	}
	if (!event.locals.user) {
		throw error(401, { message: 'unauthorized' });
	}
	const locale = extractLocaleFromRequest(event.request);
	const accountPath = localizeHref('/account', { locale }) as string;
	const returnUrl = new URL(accountPath, event.url.origin).href;
	const r = await createCustomerPortalSession(String(event.locals.user.id), returnUrl);
	if (!r.ok) {
		if (r.reason === 'no_customer') {
			throw error(400, { message: 'stripe_no_customer' });
		}
		if (r.reason === 'unconfigured') throw error(503, { message: 'stripe_unconfigured' });
		throw error(502, { message: 'portal_failed' });
	}
	return json({ url: r.url });
};
