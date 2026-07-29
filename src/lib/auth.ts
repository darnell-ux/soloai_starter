import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { makeAuthOptions, openAuthDatabase } from '$lib/server/auth-options';
import { onAuthUserCreated } from '$lib/server/mautic/lifecycle';

// Schema/behavior options live in $lib/server/auth-options (SvelteKit-free, so the
// migration runner + tests can reuse them). Here we layer on the SvelteKit cookies
// plugin and the Mautic side-effect hook — neither of which affects the DB schema.
export const auth = betterAuth({
	...makeAuthOptions(openAuthDatabase()),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					onAuthUserCreated(user);
				}
			}
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
