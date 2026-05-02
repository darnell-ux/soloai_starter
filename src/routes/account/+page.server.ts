import { auth } from '$lib/auth';
import { enqueueMauticSync } from '$lib/server/mautic/queue';
import { getEnv } from '$lib/server/env';
import { getUserBilling } from '$lib/server/stripe/billing-store';
import { extractLocaleFromRequest, localizeHref } from '$lib/paraglide/runtime';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, request, url }) => {
	if (!locals.user) {
		const locale = extractLocaleFromRequest(request);
		const loginPath = localizeHref('/login', { locale }) as string;
		const returnPath = `${url.pathname}${url.search}`;
		throw redirect(302, `${loginPath}?${new URLSearchParams({ redirectTo: returnPath })}`);
	}

	let otherSessionCount = 0;
	try {
		const sessions = await auth.api.listSessions({ headers: request.headers });
		const token = (locals.session as { token?: string } | undefined)?.token;
		const now = Date.now();
		const active = sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
		if (token) {
			otherSessionCount = active.filter((s) => s.token !== token).length;
		} else {
			otherSessionCount = Math.max(0, active.length - 1);
		}
	} catch {
		otherSessionCount = 0;
	}

	const env = getEnv();
	const uid = String(locals.user.id);
	const billing = getUserBilling(uid);
	const unifiedStatus = billing?.subscriptionStatus ?? billing?.status ?? null;
	let provider = billing?.subscriptionProvider ?? null;
	if (!provider && billing) {
		if (billing.stripeSubscriptionId || billing.stripeCustomerId) provider = 'stripe';
		else if (billing.lemonSqueezySubscriptionId || billing.lemonSqueezyCustomerId) provider = 'lemonsqueezy';
	}

	return {
		user: {
			id: uid,
			name: locals.user.name != null ? String(locals.user.name) : '',
			email: String(locals.user.email ?? ''),
			image: locals.user.image != null ? String(locals.user.image) : null,
			emailVerified: Boolean(locals.user.emailVerified)
		},
		otherSessionCount,
		lemonCheckoutEnabled: env.LEMON_SQUEEZY_ENABLED,
		subscription: {
			provider,
			status: unifiedStatus,
			tier: billing?.subscriptionTier ?? null,
			endDate: billing?.subscriptionEndDate ?? null,
			lemonCustomerPortalUrl: billing?.lemonCustomerPortalUrl ?? null,
			stripeCustomerId: billing?.stripeCustomerId ?? null,
			stripeSubscriptionId: billing?.stripeSubscriptionId ?? null,
			priceId: billing?.priceId ?? null,
			lemonSqueezyVariantId: billing?.lemonSqueezyVariantId ?? null
		},
		stripe: {
			checkoutEnabled: env.STRIPE_ENABLED
		},
		billing: {
			stripePortalConfigured: Boolean(process.env.PUBLIC_STRIPE_PORTAL_URL),
			stripePortalUrl: process.env.PUBLIC_STRIPE_PORTAL_URL ?? '',
			lemonPortalConfigured: Boolean(process.env.PUBLIC_LEMON_PORTAL_URL),
			lemonPortalUrl: process.env.PUBLIC_LEMON_PORTAL_URL ?? ''
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { profileError: true as const, errorKey: 'account_error_unauthorized' });
		const fd = await request.formData();
		const name = String(fd.get('name') ?? '').trim();
		if (name.length < 1 || name.length > 120) {
			return fail(400, { profileError: true as const, errorKey: 'account_error_name_invalid' });
		}
		try {
			await auth.api.updateUser({
				body: { name },
				headers: request.headers
			});
			const locale = extractLocaleFromRequest(request);
			enqueueMauticSync({
				kind: 'auth_user',
				userId: String(locals.user.id),
				email: String(locals.user.email ?? ''),
				name,
				locale,
				marketingOptIn: false,
				addDefaultSegment: false
			});
			return { profileSaved: true as const };
		} catch {
			return fail(400, { profileError: true as const, errorKey: 'account_error_profile_update' });
		}
	},

	changePassword: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { passwordError: true as const, errorKey: 'account_error_unauthorized' });
		const fd = await request.formData();
		const currentPassword = String(fd.get('currentPassword') ?? '');
		const newPassword = String(fd.get('newPassword') ?? '');
		const confirm = String(fd.get('confirmPassword') ?? '');
		if (newPassword.length < 8) {
			return fail(400, { passwordError: true as const, errorKey: 'account_error_password_short' });
		}
		if (newPassword !== confirm) {
			return fail(400, { passwordError: true as const, errorKey: 'account_error_password_mismatch' });
		}
		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: true
				},
				headers: request.headers
			});
			return { passwordOk: true as const };
		} catch {
			return fail(400, { passwordError: true as const, errorKey: 'account_error_password_change' });
		}
	},

	changeEmail: async ({ request, locals, url }) => {
		if (!locals.user) return fail(401, { emailError: true as const, errorKey: 'account_error_unauthorized' });
		const fd = await request.formData();
		const newEmail = String(fd.get('newEmail') ?? '').trim().toLowerCase();
		const confirm = String(fd.get('confirmEmail') ?? '').trim().toLowerCase();
		const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!EMAIL.test(newEmail)) {
			return fail(400, { emailError: true as const, errorKey: 'account_error_email_invalid' });
		}
		if (newEmail !== confirm) {
			return fail(400, { emailError: true as const, errorKey: 'account_error_email_mismatch' });
		}
		const locale = extractLocaleFromRequest(request);
		const accountPath = localizeHref('/account', { locale }) as string;
		const callbackURL = new URL(accountPath, url.origin).href;
		try {
			await auth.api.changeEmail({
				body: { newEmail, callbackURL },
				headers: request.headers
			});
			return { emailChangeOk: true as const };
		} catch {
			return fail(400, { emailError: true as const, errorKey: 'account_error_email_change' });
		}
	},

	revokeOtherSessions: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { sessionsError: true as const, errorKey: 'account_error_unauthorized' });
		try {
			await auth.api.revokeOtherSessions({ headers: request.headers });
			return { otherSessionsRevoked: true as const };
		} catch {
			return fail(400, { sessionsError: true as const, errorKey: 'account_error_sessions_revoke' });
		}
	}
};
