<script lang="ts">
	import '../app.css';
	// Field-dossier identity: IBM Plex (Sans/Mono/Serif). Weights kept lean — only what the design uses.
	import '@fontsource/ibm-plex-sans/400.css';
	import '@fontsource/ibm-plex-sans/500.css';
	import '@fontsource/ibm-plex-sans/600.css';
	import '@fontsource/ibm-plex-sans/700.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/500.css';
	import '@fontsource/ibm-plex-mono/600.css';
	import '@fontsource/ibm-plex-serif/400.css';
	import '@fontsource/ibm-plex-serif/500.css';
	import '@fontsource/ibm-plex-serif/400-italic.css';
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import SiteJsonLd from '$lib/components/SiteJsonLd.svelte';
	import ConsentHead from '$lib/components/tracking/ConsentHead.svelte';
	import GoogleTagManager from '$lib/components/tracking/GoogleTagManager.svelte';
	import KlaroLoader from '$lib/components/tracking/KlaroLoader.svelte';
	import { identifyUser, trackPageView } from '$lib/analytics/dataLayer';
	import { authClient } from '$lib/auth-client';

	let { children, data } = $props();

	// Chatbot widget: lazy-loaded on mount, mounted only once the Better Auth
	// session has resolved. Guests get the sign-in prompt; trial/paid get full chat.
	const session = authClient.useSession();
	let ChatbotComp = $state<typeof import('$lib/components/Chatbot.svelte').default | null>(null);
	onMount(async () => {
		const mod = await import('$lib/components/Chatbot.svelte');
		ChatbotComp = mod.default;
	});

	const authState = $derived<'loading' | 'signed-in' | 'signed-out'>(
		data.authSession === 'signed-in' ? 'signed-in' : 'signed-out'
	);

	const a = $derived(data.analytics);

	let reducedMotion = $state(false);
	let userDisabledTransitions = $state(false);

	const routeTransitionKey = $derived(`${page.url.pathname}${page.url.search}`);
	const motionEnabled = $derived(
		Boolean(data.pageTransitionsEnabled) && !userDisabledTransitions && !reducedMotion
	);

	onMount(() => {
		try {
			userDisabledTransitions = localStorage.getItem('pageTransitionsOff') === '1';
		} catch {
			userDisabledTransitions = false;
		}
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const onChange = () => {
			reducedMotion = mq.matches;
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	afterNavigate(({ from, to }) => {
		if (!browser || !to) return;
		if (
			from &&
			(from.url.pathname !== to.url.pathname || from.url.search !== to.url.search)
		) {
			queueMicrotask(() => {
				document.getElementById('main-content')?.focus({ preventScroll: true });
			});
		}
		if (a?.gtmContainerId) {
			trackPageView(to.url.pathname + to.url.search);
		}
	});

	$effect(() => {
		if (!browser || !a?.gtmContainerId) return;
		identifyUser({
			user_id_hash: a.user_id_hash,
			locale: a.locale,
			subscription_tier: a.subscription_tier,
			payment_provider: a.payment_provider
		});
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="16x16" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="32x32" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="192x192" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="512x512" />
	<link rel="apple-touch-icon" href="/favicon.svg" />

	<link rel="manifest" href="/site.webmanifest" />
	<meta name="theme-color" content="#a33028" />
</svelte:head>

{#if a?.gtmContainerId}
	<ConsentHead isUsLocale={a.isUsLocale} />
	<GoogleTagManager
		containerId={a.gtmContainerId}
		blockedUntilKlaro={!a.isUsLocale}
	/>
	{#if !a.isUsLocale}
		<KlaroLoader lang={a.locale} privacyPolicyHref={a.privacyPolicyHref} />
	{/if}
{/if}

<SiteJsonLd />

<a class="skip-link" href="#main-content">Skip to main content</a>

<div class="flex min-h-screen flex-col">
	<Header {authState} />
	<main id="main-content" class="flex min-h-0 flex-1 flex-col" tabindex="-1">
		{#if data.pageTransitionsEnabled}
			<PageTransition routeKey={routeTransitionKey} motionEnabled={motionEnabled}>
				{@render children()}
			</PageTransition>
		{:else}
			{@render children()}
		{/if}
	</main>
	<Footer showCookieSettings={Boolean(a?.gtmContainerId && !a.isUsLocale)} />
</div>

{#if ChatbotComp && !$session.isPending}
	<ChatbotComp
		authenticated={Boolean($session.data?.user)}
		tier={a?.subscription_tier ?? null}
		userId={$session.data?.user?.id ?? null}
	/>
{/if}
