<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';

	let {
		authState = 'signed-out'
	}: {
		authState?: 'loading' | 'signed-in' | 'signed-out';
	} = $props();
</script>

<div class="flex items-center gap-2" role="region" aria-label="Account">
	{#if authState === 'loading'}
		<span class="text-sm text-base-content/80" aria-busy="true" aria-live="polite">Loading…</span>
	{:else if authState === 'signed-in'}
		<a
			class="btn btn-ghost btn-sm"
			href={resolve(localizeHref('/account') as any)}
			data-sveltekit-preload-data="hover"
		>
			Account
		</a>
	{:else}
		<a
			class="btn btn-ghost btn-sm"
			href={resolve(localizeHref('/login') as any)}
			data-sveltekit-preload-data="hover"
		>
			Log in
		</a>
		<a
			class="btn btn-outline btn-secondary btn-sm"
			href={resolve(localizeHref('/signup') as any)}
			data-sveltekit-preload-data="hover"
		>
			Sign up
		</a>
	{/if}
</div>
