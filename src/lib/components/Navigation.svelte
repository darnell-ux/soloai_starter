<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { deLocalizeUrl, localizeHref } from '$lib/paraglide/runtime';

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/features', label: 'Features' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/contact', label: 'Contact' }
	] as const;

	let menuOpen = $state(false);

	afterNavigate(() => {
		menuOpen = false;
	});

	$effect(() => {
		if (!browser || !menuOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') menuOpen = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const pathname = $derived(deLocalizeUrl(page.url).pathname);

	function isActive(href: string): boolean {
		if (href === '/') {
			return pathname === '/' || pathname === '';
		}
		return pathname === href;
	}

	function linkHref(href: string) {
		return resolve(localizeHref(href) as any);
	}
</script>

<div class="relative flex min-w-0 flex-1 items-center justify-end md:justify-center">
	<button
		type="button"
		class="btn btn-ghost btn-square md:hidden"
		aria-controls="primary-navigation"
		aria-expanded={menuOpen}
		aria-label={menuOpen ? 'Close menu' : 'Open menu'}
		onclick={() => (menuOpen = !menuOpen)}
	>
		<span aria-hidden="true" class="text-lg">{menuOpen ? '×' : '☰'}</span>
	</button>

	<nav
		id="primary-navigation"
		class="absolute top-full right-0 left-0 z-40 flex flex-col gap-1 border-b border-base-300 bg-base-100 p-4 md:static md:z-auto md:flex md:flex-row md:items-center md:justify-center md:gap-6 md:border-0 md:bg-transparent md:p-0 {menuOpen
			? 'flex'
			: 'hidden md:flex'}"
		aria-label="Primary"
	>
		{#each navItems as item (item.href)}
			<a
				class="btn btn-ghost btn-sm justify-start md:justify-center {isActive(item.href)
					? 'btn-active'
					: ''}"
				href={linkHref(item.href)}
				data-sveltekit-preload-data="hover"
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				{item.label}
			</a>
		{/each}
	</nav>
</div>
