import '$lib/server/env.bootstrap';
import { auth } from '$lib/auth';
import { ensureAuthSchema } from '$lib/server/auth-migrate';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getEnv } from '$lib/server/env';

// Kick off schema self-heal at server startup (no-op during build). handleAuth
// also awaits it so no auth request can run before the schema exists.
void ensureAuthSchema();

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	// Guarantee the auth schema exists before any auth query (self-healing after a
	// wiped/empty DB). Idempotent + memoized, so this is a resolved no-op after boot.
	await ensureAuthSchema();
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

/** Optional HTML CSP for GTM / GA4 / Hotjar (set ENABLE_HTML_CSP=true when ready). */
const handleCsp: Handle = async ({ event, resolve }) => {
	if (process.env.ENABLE_HTML_CSP !== 'true') {
		return resolve(event);
	}
	const response = await resolve(event);
	const ct = response.headers.get('content-type') ?? '';
	if (!ct.includes('text/html')) return response;
	try {
		const env = getEnv();
		const strapiOrigin = new URL(env.PUBLIC_STRAPI_URL).origin;
		const csp = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://static.hotjar.com https://script.hotjar.com https://*.hotjar.com https://*.hotjar.io",
			`connect-src 'self' ${strapiOrigin} https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://*.hotjar.com https://www.googletagmanager.com wss://*.hotjar.com https://*.google-analytics.com`,
			"img-src 'self' data: blob: https:",
			"style-src 'self' 'unsafe-inline'",
			"font-src 'self' data:",
			"frame-src 'self' https://www.googletagmanager.com https://*.hotjar.com",
			"worker-src 'self' blob:",
			"child-src 'self' blob:"
		].join('; ');
		response.headers.set('Content-Security-Policy', csp);
	} catch {
		/* env not validated */
	}
	return response;
};

export const handle: Handle = sequence(handleParaglide, handleAuth, handleCsp);
