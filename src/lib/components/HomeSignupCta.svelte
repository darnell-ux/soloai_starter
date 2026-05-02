<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import type { LandingSignupCta } from '$lib/server/strapi/homepage-content';

	let {
		authSession,
		landing
	}: {
		authSession: 'signed-in' | 'signed-out';
		landing: LandingSignupCta | null;
	} = $props();

	const title = $derived(landing?.sectionTitle?.trim() || m.home_signup_cta_heading());
	const body = $derived(landing?.sectionBody?.trim() || m.home_signup_cta_subheading());
	const guestLabel = $derived(landing?.guestButtonLabel?.trim() || m.home_signup_cta_button_guest());

	const primaryLabel = $derived(
		authSession === 'signed-in' ? m.home_signup_cta_button_dashboard() : guestLabel
	);
</script>

<section
	class="border-t border-base-300 bg-primary/10"
	aria-labelledby="home-signup-cta-heading"
>
	<div class="mx-auto max-w-6xl px-4 py-16">
		<div class="rounded-box border border-base-300 bg-base-100 p-8 shadow-sm md:p-10">
			<h2 id="home-signup-cta-heading" class="text-2xl font-semibold text-base-content md:text-3xl">
				{title}
			</h2>
			<p class="mt-3 max-w-2xl text-base text-base-content/80">{body}</p>
			<div class="mt-8">
				<a
					class="btn btn-primary btn-lg"
					href={resolve(
						localizeHref((authSession === 'signed-in' ? '/account' : '/signup') as Pathname) as any
					)}
					data-sveltekit-preload-data="hover"
				>
					{primaryLabel}
				</a>
			</div>
		</div>
	</div>
</section>
