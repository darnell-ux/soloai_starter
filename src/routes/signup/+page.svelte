<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { authClient } from '$lib/auth-client';
	import { trackEvent } from '$lib/analytics/dataLayer';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let submitting = $state(false);
	let errorKey = $state<'invalid' | 'unexpected' | null>(null);
</script>

<SeoHead pageTitle="Sign up" description="Create a new account." noindex />

<main class="mx-auto max-w-md px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">Sign up</h1>
	<p class="mt-2 text-base-content/80">Create an account with email and password.</p>

	<form
		method="post"
		class="mt-8 space-y-4"
		onsubmit={async (ev) => {
			ev.preventDefault();
			const form = ev.currentTarget as HTMLFormElement;
			const fd = new FormData(form);
			const name = String(fd.get('name') ?? '').trim();
			const email = String(fd.get('email') ?? '').trim();
			const password = String(fd.get('password') ?? '');
			submitting = true;
			errorKey = null;
			try {
				const res: unknown = await authClient.signUp.email({ name, email, password });
				const err =
					res && typeof res === 'object' && 'error' in res
						? (res as { error?: unknown }).error
						: undefined;
				if (err) {
					errorKey = 'invalid';
					return;
				}
				if (browser) trackEvent('sign_up', { method: 'email' });
				await invalidateAll();
				await goto(data.redirectTo);
			} catch {
				errorKey = 'unexpected';
			} finally {
				submitting = false;
			}
		}}
		aria-busy={submitting}
	>
		<div class="form-control w-full">
			<label class="label" for="signup-name"><span class="label-text">Name</span></label>
			<input
				id="signup-name"
				name="name"
				type="text"
				autocomplete="name"
				class="input input-bordered w-full"
				required
				minlength="1"
				maxlength="120"
				disabled={submitting}
			/>
		</div>
		<div class="form-control w-full">
			<label class="label" for="signup-email"><span class="label-text">{m.login_label_email()}</span></label>
			<input
				id="signup-email"
				name="email"
				type="email"
				autocomplete="email"
				class="input input-bordered w-full"
				required
				disabled={submitting}
				aria-invalid={errorKey != null}
			/>
		</div>
		<div class="form-control w-full">
			<label class="label" for="signup-password"
				><span class="label-text">{m.login_label_password()}</span></label
			>
			<input
				id="signup-password"
				name="password"
				type="password"
				autocomplete="new-password"
				class="input input-bordered w-full"
				data-hj-suppress
				required
				minlength="8"
				disabled={submitting}
			/>
		</div>
		{#if errorKey === 'invalid'}
			<p class="text-error text-sm" role="alert">Could not create account. Try a different email.</p>
		{:else if errorKey === 'unexpected'}
			<p class="text-error text-sm" role="alert">{m.login_error_unexpected()}</p>
		{/if}
		<button type="submit" class="btn btn-primary w-full" disabled={submitting} aria-busy={submitting}>
			Create account
		</button>
	</form>
	<p class="mt-6 text-center text-sm text-base-content/70">
		Already have an account?
		<a href={localizeHref('/login')} class="link link-primary">Log in</a>
	</p>
</main>
