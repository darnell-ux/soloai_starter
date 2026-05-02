<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { authClient } from '$lib/auth-client';
	import { trackEvent } from '$lib/analytics/dataLayer';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let submitting = $state(false);
	let errorKey = $state<'invalid' | 'unexpected' | null>(null);

	async function handleLogin(ev: SubmitEvent) {
		ev.preventDefault();
		const form = ev.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const email = String(fd.get('email') ?? '');
		const password = String(fd.get('password') ?? '');
		submitting = true;
		errorKey = null;
		try {
			const res: unknown = await authClient.signIn.email({ email, password });
			const err =
				res && typeof res === 'object' && 'error' in res
					? (res as { error?: unknown }).error
					: undefined;
			if (err) {
				errorKey = 'invalid';
				return;
			}
			if (browser) trackEvent('login', { method: 'email' });
			await invalidateAll();
			await goto(data.redirectTo);
		} catch {
			errorKey = 'unexpected';
		} finally {
			submitting = false;
		}
	}
</script>

<SeoHead pageTitle={m.login_page_title()} description={m.login_page_description()} noindex />

<main class="mx-auto max-w-md px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">{m.login_heading()}</h1>
	<p class="mt-2 text-base-content/80">{m.login_intro()}</p>

	<form method="post" class="mt-8 space-y-4" onsubmit={handleLogin} aria-busy={submitting}>
		<div class="form-control w-full">
			<label class="label" for="login-email"><span class="label-text">{m.login_label_email()}</span></label>
			<input
				id="login-email"
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
			<label class="label" for="login-password"><span class="label-text">{m.login_label_password()}</span></label>
			<input
				id="login-password"
				name="password"
				type="password"
				autocomplete="current-password"
				class="input input-bordered w-full"
				data-hj-suppress
				required
				disabled={submitting}
			/>
		</div>
		{#if errorKey === 'invalid'}
			<p class="text-error text-sm" role="alert">{m.login_error_invalid()}</p>
		{:else if errorKey === 'unexpected'}
			<p class="text-error text-sm" role="alert">{m.login_error_unexpected()}</p>
		{/if}
		<button type="submit" class="btn btn-primary w-full" disabled={submitting} aria-busy={submitting}>
			{m.login_action_submit()}
		</button>
	</form>
</main>
