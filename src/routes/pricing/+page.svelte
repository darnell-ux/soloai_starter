<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { PageProps } from './$types';

	export const prerender = false;

	let { data }: PageProps = $props();

	let checkoutError = $state('');
	let checkoutLoading = $state<string | null>(null);

	function goToLoginForCheckout() {
		const loginPath = localizeHref('/login') as string;
		const q = new URLSearchParams({
			redirectTo: `${window.location.pathname}${window.location.search}`
		});
		void goto(`${loginPath}?${q}`);
	}

	function isCurrentPlan(plan: (typeof data.plans)[number]): boolean {
		return Boolean(data.currentTier && data.currentTier === plan.tier);
	}

	async function startCheckout(plan: (typeof data.plans)[number]) {
		checkoutError = '';
		checkoutLoading = plan.tier;
		try {
			if (data.checkoutProcessor === 'stripe') {
				if (!plan.priceId) {
					checkoutError = 'This plan is not available for checkout.';
					return;
				}
				const res = await fetch(resolve('/api/stripe/checkout'), {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ priceId: plan.priceId })
				});
				const body = (await res.json().catch(() => null)) as { url?: string } | null;
				if (!res.ok || !body?.url) {
					checkoutError =
						res.status === 401
							? 'Sign in to subscribe.'
							: res.status === 429
								? 'Too many attempts. Wait a moment and try again.'
								: 'Checkout could not be started. Try again or contact support.';
					return;
				}
				window.location.href = body.url;
				return;
			}

			if (!plan.lemonVariantId) {
				checkoutError = 'This plan is not available for checkout.';
				return;
			}
			const res = await fetch(resolve('/api/lemonsqueezy/checkout'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ tier: plan.tier })
			});
			const body = (await res.json().catch(() => null)) as { url?: string } | null;
			if (!res.ok || !body?.url) {
				checkoutError =
					res.status === 401
						? 'Sign in to subscribe.'
						: res.status === 429
							? 'Too many attempts. Wait a moment and try again.'
							: 'Checkout could not be started. Try again or contact support.';
				return;
			}
			window.location.href = body.url;
		} catch {
			checkoutError = 'Checkout could not be started. Try again or contact support.';
		} finally {
			checkoutLoading = null;
		}
	}
</script>

<SeoHead
	pageTitle="Pricing | SaaS"
	description="Compare plans and subscribe with Stripe (US) or Lemon Squeezy (global) depending on locale."
/>

<main class="mx-auto max-w-5xl px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">Pricing</h1>
	<p class="mt-2 max-w-2xl text-base-content/80">
		{#if data.checkoutProcessor === 'stripe'}
			Subscriptions for your locale use <strong>Stripe</strong> Checkout. Manage billing from your account after
			purchase.
		{:else}
			Subscriptions for your locale use <strong>Lemon Squeezy</strong> (global). You will complete checkout on
			Lemon Squeezy’s hosted page.
		{/if}
	</p>

	{#if data.checkoutProcessor === 'stripe'}
		{#if !data.stripeCheckoutEnabled}
			<p class="mt-8 rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/80">
				Stripe billing is not configured. Set the Stripe variables in <code class="text-xs">.env.example</code>.
			</p>
		{:else if !data.hasStripePlan}
			<p class="mt-8 rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/80">
				Add <code class="text-xs">STRIPE_PRICE_BASIC</code>, <code class="text-xs">STRIPE_PRICE_PRO</code>, and/or
				<code class="text-xs">STRIPE_PRICE_TEAM</code> for live Stripe tiers.
			</p>
		{:else}
			<ul class="mt-10 grid gap-6 md:grid-cols-3">
				{#each data.plans as plan (plan.tier)}
					{#if plan.priceId}
						<li class="card bg-base-100 shadow-sm">
							<div class="card-body">
								<h2 class="card-title">
									{plan.title}
									{#if isCurrentPlan(plan)}
										<span class="badge badge-success badge-sm">Current</span>
									{/if}
								</h2>
								<p class="text-sm text-base-content/80">{plan.description}</p>
								<div class="card-actions mt-4">
									{#if data.isLoggedIn}
										<button
											type="button"
											class="btn btn-primary btn-block"
											disabled={checkoutLoading !== null || isCurrentPlan(plan)}
											onclick={() => startCheckout(plan)}
										>
											{checkoutLoading === plan.tier ? 'Redirecting…' : isCurrentPlan(plan) ? 'Current plan' : 'Subscribe'}
										</button>
									{:else}
										<button type="button" class="btn btn-primary btn-block" onclick={() => goToLoginForCheckout()}>
											Sign in to subscribe
										</button>
									{/if}
								</div>
							</div>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	{:else if !data.lemonCheckoutEnabled}
		<p class="mt-8 rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/80">
			Lemon Squeezy is not configured. Set <code class="text-xs">LEMON_SQUEEZY_*</code> variables in
			<code class="text-xs">.env.example</code>.
		</p>
	{:else if !data.hasLemonPlan}
		<p class="mt-8 rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/80">
			Add <code class="text-xs">LEMON_VARIANT_BASIC</code>, <code class="text-xs">LEMON_VARIANT_PRO</code>, and/or
			<code class="text-xs">LEMON_VARIANT_TEAM</code> for Lemon Squeezy tiers.
		</p>
	{:else}
		<ul class="mt-10 grid gap-6 md:grid-cols-3">
			{#each data.plans as plan (plan.tier)}
				{#if plan.lemonVariantId}
					<li class="card bg-base-100 shadow-sm">
						<div class="card-body">
							<h2 class="card-title">
								{plan.title}
								{#if isCurrentPlan(plan)}
									<span class="badge badge-success badge-sm">Current</span>
								{/if}
							</h2>
							<p class="text-sm text-base-content/80">{plan.description}</p>
							<div class="card-actions mt-4">
								{#if data.isLoggedIn}
									<button
										type="button"
										class="btn btn-primary btn-block"
										disabled={checkoutLoading !== null || isCurrentPlan(plan)}
										onclick={() => startCheckout(plan)}
									>
										{checkoutLoading === plan.tier ? 'Redirecting…' : isCurrentPlan(plan) ? 'Current plan' : 'Subscribe'}
									</button>
								{:else}
									<button type="button" class="btn btn-primary btn-block" onclick={() => goToLoginForCheckout()}>
										Sign in to subscribe
									</button>
								{/if}
							</div>
						</div>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}

	{#if checkoutError}
		<p class="mt-6 text-error text-sm" role="alert">{checkoutError}</p>
	{/if}
</main>
