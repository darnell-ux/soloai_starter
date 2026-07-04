<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { authClient } from '$lib/auth-client';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { formatDate } from '$lib/i18n/format';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let portalBusy = $state(false);
	let portalError = $state('');

	async function openStripeBillingPortal() {
		portalError = '';
		portalBusy = true;
		try {
			const res = await fetch(resolve('/api/stripe/customer-portal'), {
				method: 'POST',
				credentials: 'include'
			});
			const body = (await res.json().catch(() => null)) as { url?: string } | null;
			if (!res.ok || !body?.url) {
				portalError = m.account_subscription_open_portal_error();
				return;
			}
			window.location.href = body.url;
		} catch {
			portalError = m.account_subscription_open_portal_error();
		} finally {
			portalBusy = false;
		}
	}

	function subscriptionStatusLabel(status: string | null): string {
		if (!status) return m.account_subscription_status_none();
		return status.replace(/_/g, ' ');
	}

	function profileErrorMessage(key: string | undefined): string {
		if (!key) return '';
		switch (key) {
			case 'account_error_unauthorized':
				return m.account_error_unauthorized();
			case 'account_error_name_invalid':
				return m.account_error_name_invalid();
			case 'account_error_profile_update':
				return m.account_error_profile_update();
			default:
				return '';
		}
	}

	function passwordErrorMessage(key: string | undefined): string {
		if (!key) return '';
		switch (key) {
			case 'account_error_unauthorized':
				return m.account_error_unauthorized();
			case 'account_error_password_short':
				return m.account_error_password_short();
			case 'account_error_password_mismatch':
				return m.account_error_password_mismatch();
			case 'account_error_password_change':
				return m.account_error_password_change();
			default:
				return '';
		}
	}

	function emailErrorMessage(key: string | undefined): string {
		if (!key) return '';
		switch (key) {
			case 'account_error_unauthorized':
				return m.account_error_unauthorized();
			case 'account_error_email_invalid':
				return m.account_error_email_invalid();
			case 'account_error_email_mismatch':
				return m.account_error_email_mismatch();
			case 'account_error_email_change':
				return m.account_error_email_change();
			default:
				return '';
		}
	}

	function sessionsErrorMessage(key: string | undefined): string {
		if (!key) return '';
		switch (key) {
			case 'account_error_unauthorized':
				return m.account_error_unauthorized();
			case 'account_error_sessions_revoke':
				return m.account_error_sessions_revoke();
			default:
				return '';
		}
	}

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve(localizeHref('/') as any));
	}
</script>

<SeoHead pageTitle={m.account_page_title()} description={m.account_page_description()} noindex />

<div class="mx-auto max-w-3xl px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">{m.account_heading()}</h1>
	<p class="mt-2 text-base-content/80">{m.account_intro()}</p>

	<section class="card bg-base-100 shadow-sm mt-8" aria-labelledby="account-profile-heading">
		<div class="card-body gap-4">
			<h2 id="account-profile-heading" class="card-title text-lg">{m.account_section_profile()}</h2>
			<dl class="grid gap-2 text-sm">
				<div class="flex flex-wrap gap-2">
					<dt class="font-medium text-base-content/70">{m.account_label_email()}</dt>
					<dd>{data.user.email}</dd>
				</div>
			</dl>

			<form
				method="POST"
				action="?/updateProfile"
				use:enhance={() =>
					async ({ result }) => {
						await applyAction(result);
						await invalidateAll();
					}}
				class="space-y-3"
				aria-describedby={form?.profileError && form?.errorKey ? 'profile-error' : undefined}
			>
				<div class="form-control w-full max-w-md">
					<label class="label" for="profile-name"
						><span class="label-text">{m.account_label_name()}</span></label
					>
					<input
						id="profile-name"
						name="name"
						type="text"
						autocomplete="name"
						class="input input-bordered w-full"
						value={data.user.name}
						required
						minlength="1"
						maxlength="120"
						aria-invalid={Boolean(form?.profileError && form?.errorKey)}
					/>
				</div>
				{#if form?.profileSaved}
					<p class="text-success text-sm" role="status">{m.account_success_profile()}</p>
				{/if}
				{#if form?.profileError && form?.errorKey}
					<p id="profile-error" class="text-error text-sm" role="alert">
						{profileErrorMessage(form.errorKey)}
					</p>
				{/if}
				<button type="submit" class="btn btn-primary">{m.account_action_save_profile()}</button>
			</form>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm mt-6" aria-labelledby="account-email-heading">
		<div class="card-body gap-4">
			<h2 id="account-email-heading" class="card-title text-lg">{m.account_section_email()}</h2>
			<p class="text-sm text-base-content/80">
				{data.user.email ?? ''}
				{#if data.user.emailVerified === false}
					<span class="ml-2 badge badge-ghost badge-sm">{m.account_badge_email_unverified()}</span>
				{/if}
			</p>

			<form
				method="POST"
				action="?/changeEmail"
				use:enhance={() =>
					async ({ result }) => {
						await applyAction(result);
						await invalidateAll();
					}}
				class="space-y-3 max-w-md"
				aria-describedby={form?.emailError && form?.errorKey ? 'email-error' : undefined}
			>
				<div class="form-control">
					<label class="label" for="new-email"
						><span class="label-text">{m.account_label_new_email()}</span></label
					>
					<input
						id="new-email"
						name="newEmail"
						type="email"
						autocomplete="email"
						class="input input-bordered w-full"
						required
						aria-invalid={Boolean(form?.emailError && form?.errorKey)}
					/>
				</div>
				<div class="form-control">
					<label class="label" for="confirm-email"
						><span class="label-text">{m.account_label_confirm_email()}</span></label
					>
					<input
						id="confirm-email"
						name="confirmEmail"
						type="email"
						autocomplete="email"
						class="input input-bordered w-full"
						required
					/>
				</div>
				{#if form?.emailChangeOk}
					<p class="text-success text-sm" role="status">{m.account_success_email_change()}</p>
				{/if}
				{#if form?.emailError && form?.errorKey}
					<p id="email-error" class="text-error text-sm" role="alert">{emailErrorMessage(form.errorKey)}</p>
				{/if}
				<button type="submit" class="btn btn-outline">{m.account_action_change_email()}</button>
			</form>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm mt-6" aria-labelledby="account-password-heading">
		<div class="card-body gap-4">
			<h2 id="account-password-heading" class="card-title text-lg">{m.account_section_password()}</h2>
			<form
				method="POST"
				action="?/changePassword"
				use:enhance={() =>
					async ({ result }) => {
						await applyAction(result);
						await invalidateAll();
					}}
				class="space-y-3 max-w-md"
				aria-describedby={form?.passwordError && form?.errorKey ? 'password-error' : undefined}
			>
				<div class="form-control">
					<label class="label" for="current-password"
						><span class="label-text">{m.account_label_current_password()}</span></label
					>
					<input
						id="current-password"
						name="currentPassword"
						type="password"
						autocomplete="current-password"
						class="input input-bordered w-full"
						data-hj-suppress
						required
					/>
				</div>
				<div class="form-control">
					<label class="label" for="new-password"
						><span class="label-text">{m.account_label_new_password()}</span></label
					>
					<input
						id="new-password"
						name="newPassword"
						type="password"
						autocomplete="new-password"
						class="input input-bordered w-full"
						data-hj-suppress
						required
						minlength="8"
					/>
				</div>
				<div class="form-control">
					<label class="label" for="confirm-password"
						><span class="label-text">{m.account_label_confirm_password()}</span></label
					>
					<input
						id="confirm-password"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						class="input input-bordered w-full"
						data-hj-suppress
						required
						minlength="8"
					/>
				</div>
				{#if form?.passwordOk}
					<p class="text-success text-sm" role="status">{m.account_success_password()}</p>
				{/if}
				{#if form?.passwordError && form?.errorKey}
					<p id="password-error" class="text-error text-sm" role="alert">
						{passwordErrorMessage(form.errorKey)}
					</p>
				{/if}
				<button type="submit" class="btn btn-outline">{m.account_action_change_password()}</button>
			</form>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm mt-6" aria-labelledby="account-billing-heading">
		<div class="card-body gap-4">
			<h2 id="account-billing-heading" class="card-title text-lg">{m.account_section_billing()}</h2>

			{#if data.stripe.checkoutEnabled || data.lemonCheckoutEnabled}
				<div class="rounded-box bg-base-200/60 p-4 space-y-3" aria-labelledby="account-subscription-heading">
					<h3 id="account-subscription-heading" class="font-semibold text-sm">{m.account_section_subscription()}</h3>
					<p class="text-sm text-base-content/80">{m.account_subscription_intro()}</p>
					<dl class="grid gap-2 text-sm">
						<div class="flex flex-wrap gap-2">
							<dt class="font-medium text-base-content/70">{m.account_subscription_provider_label()}</dt>
							<dd class="capitalize">
								{#if data.subscription.provider === 'stripe'}Stripe{:else if data.subscription.provider === 'lemonsqueezy'}Lemon Squeezy{:else}{m.account_subscription_status_none()}{/if}
							</dd>
						</div>
						<div class="flex flex-wrap gap-2">
							<dt class="font-medium text-base-content/70">{m.account_subscription_status_label()}</dt>
							<dd class="capitalize">{subscriptionStatusLabel(data.subscription.status)}</dd>
						</div>
						{#if data.subscription.tier}
							<div class="flex flex-wrap gap-2">
								<dt class="font-medium text-base-content/70">{m.account_subscription_tier_label()}</dt>
								<dd class="capitalize">{data.subscription.tier}</dd>
							</div>
						{/if}
						{#if data.subscription.endDate}
							<div class="flex flex-wrap gap-2">
								<dt class="font-medium text-base-content/70">{m.account_subscription_renews_label()}</dt>
								<dd>{formatDate(data.subscription.endDate)}</dd>
							</div>
						{/if}
						{#if data.subscription.priceId}
							<div class="flex flex-wrap gap-2 items-baseline">
								<dt class="font-medium text-base-content/70">{m.account_subscription_plan_label()}</dt>
								<dd><code class="text-xs break-all">{data.subscription.priceId}</code></dd>
							</div>
						{/if}
						{#if data.subscription.lemonSqueezyVariantId}
							<div class="flex flex-wrap gap-2 items-baseline">
								<dt class="font-medium text-base-content/70">Lemon variant</dt>
								<dd><code class="text-xs break-all">{data.subscription.lemonSqueezyVariantId}</code></dd>
							</div>
						{/if}
					</dl>
					{#if portalError}
						<p class="text-error text-sm" role="alert">{portalError}</p>
					{/if}
					<div class="flex flex-wrap items-center gap-3">
						{#if data.stripe.checkoutEnabled && data.subscription.stripeCustomerId}
							<button
								type="button"
								class="btn btn-primary btn-sm sm:btn-md"
								disabled={portalBusy}
								onclick={() => openStripeBillingPortal()}
							>
								{portalBusy ? m.account_subscription_open_portal_loading() : m.account_subscription_open_portal()}
							</button>
						{/if}
						{#if data.subscription.lemonCustomerPortalUrl}
							<a
								class="btn btn-outline btn-sm sm:btn-md"
								href={data.subscription.lemonCustomerPortalUrl}
								rel="noopener noreferrer"
								target="_blank">{m.account_subscription_lemon_portal()}</a
							>
						{/if}
					</div>
					{#if !(data.stripe.checkoutEnabled && data.subscription.stripeCustomerId) && !data.subscription.lemonCustomerPortalUrl}
						<p class="text-sm text-base-content/80 mt-2">{m.account_subscription_subscribe_hint()}</p>
						<a class="btn btn-outline btn-sm mt-1" href={resolve(localizeHref('/pricing') as any)}>Pricing</a>
					{/if}
				</div>
			{/if}

			<p class="text-sm text-base-content/80">{m.account_billing_help()}</p>
			<ul class="menu menu-sm bg-base-200 rounded-box max-w-md">
				{#if data.billing.stripePortalConfigured}
					<li>
						<a href={data.billing.stripePortalUrl} rel="noopener noreferrer" target="_blank"
							>{m.account_billing_stripe_link()}</a
						>
					</li>
				{:else if !data.stripe.checkoutEnabled}
					<li>
						<span class="opacity-70">{m.account_billing_stripe_unconfigured()}</span>
					</li>
				{/if}
				<li>
					{#if data.billing.lemonPortalConfigured}
						<a href={data.billing.lemonPortalUrl} rel="noopener noreferrer" target="_blank"
							>{m.account_billing_lemon_link()}</a
						>
					{:else}
						<span class="opacity-70">{m.account_billing_lemon_unconfigured()}</span>
					{/if}
				</li>
			</ul>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm mt-6" aria-labelledby="account-sessions-heading">
		<div class="card-body gap-4">
			<h2 id="account-sessions-heading" class="card-title text-lg">{m.account_section_sessions()}</h2>
			<p class="text-sm text-base-content/80">{m.account_sessions_help()}</p>
			<p class="text-sm" aria-live="polite">{m.account_sessions_other_count({ count: data.otherSessionCount })}</p>
			<form
				method="POST"
				action="?/revokeOtherSessions"
				use:enhance={() =>
					async ({ result }) => {
						await applyAction(result);
						await invalidateAll();
					}}
				aria-describedby={form?.sessionsError && form?.errorKey ? 'sessions-error' : undefined}
			>
				{#if form?.otherSessionsRevoked}
					<p class="text-success text-sm mb-2" role="status">{m.account_success_sessions_revoked()}</p>
				{/if}
				{#if form?.sessionsError && form?.errorKey}
					<p id="sessions-error" class="text-error text-sm mb-2" role="alert">
						{sessionsErrorMessage(form.errorKey)}
					</p>
				{/if}
				<button
					type="submit"
					class="btn btn-outline"
					disabled={data.otherSessionCount < 1}
					aria-disabled={data.otherSessionCount < 1}
				>
					{m.account_action_revoke_other_sessions()}
				</button>
			</form>
		</div>
	</section>

	<div class="mt-10 flex flex-wrap gap-3">
		<button type="button" class="btn btn-error btn-outline" onclick={() => signOut()}>
			{m.account_action_sign_out()}
		</button>
	</div>
</div>
