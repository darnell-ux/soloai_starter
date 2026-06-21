<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import AuthButton from './AuthButton.svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import Navigation from './Navigation.svelte';

	let {
		authState = 'signed-out'
	}: {
		authState?: 'loading' | 'signed-in' | 'signed-out';
	} = $props();
</script>

<header class="border-b border-base-300 bg-base-100">
	<div class="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
		<a
			class="flex shrink-0 flex-col leading-none"
			href={resolve(localizeHref('/') as any)}
			data-sveltekit-preload-data="hover"
			aria-label="TaxNexus — Home"
		>
			<span class="font-mono text-lg font-bold tracking-tight text-base-content">TaxNexus</span>
			<span class="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
				by Consult Solutions
			</span>
		</a>
		<Navigation />
		<div class="flex shrink-0 items-center gap-2">
			<LanguageSwitcher />
			<AuthButton {authState} />
		</div>
	</div>
</header>
