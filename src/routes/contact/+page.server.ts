import { enqueueMauticSync } from '$lib/server/mautic/queue';
import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const prerender = false;

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		const email = String(fd.get('email') ?? '').trim().toLowerCase();
		const message = String(fd.get('message') ?? '').trim().slice(0, 4000);
		const marketingOptIn = fd.get('marketingOptIn') === 'on' || fd.get('marketingOptIn') === 'true';
		const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!EMAIL.test(email)) {
			return fail(400, { contactError: true as const, errorKey: 'contact_error_email' });
		}
		if (message.length < 1) {
			return fail(400, { contactError: true as const, errorKey: 'contact_error_message' });
		}
		const locale = extractLocaleFromRequest(request);
		const leadStoreKey = `lead:${email}`;
		enqueueMauticSync({
			kind: 'lead_form',
			leadStoreKey,
			email,
			name: null,
			locale,
			marketingOptIn,
			addDefaultSegment: false
		});
		return { contactOk: true as const, marketingOptIn };
	}
};
