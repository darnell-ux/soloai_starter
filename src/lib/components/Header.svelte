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
			class="btn btn-ghost shrink-0 text-lg font-semibold normal-case"
			href={resolve(localizeHref('/') as any)}
			data-sveltekit-preload-data="hover"
			aria-label="Home"
		>
			App
		</a>
		<Navigation />
		<div class="flex shrink-0 items-center gap-2">
			<LanguageSwitcher />
			<AuthButton {authState} />
		</div>
	</div>
</header>
