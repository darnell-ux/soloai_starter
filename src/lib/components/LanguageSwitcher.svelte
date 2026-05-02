<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { assertIsLocale, getLocale, locales, localizeHref, setLocale } from '$lib/paraglide/runtime';

	const currentLocale = $derived.by(() => {
		page.url.pathname;
		return getLocale();
	});

	async function onLocaleChange(e: Event) {
		const el = e.currentTarget as HTMLSelectElement;
		const locale = assertIsLocale(el.value);
		await goto(resolve(localizeHref(page.url.pathname, { locale }) as any));
		setLocale(locale, { reload: false });
		await invalidateAll();
	}
</script>

<div class="flex min-w-0 items-center gap-2">
	<label class="sr-only" for="language-select">Language</label>
	<select
		id="language-select"
		class="select select-bordered select-sm max-w-[10rem] min-w-0"
		value={currentLocale}
		onchange={onLocaleChange}
		aria-describedby="language-select-hint"
	>
		{#each locales as locale (locale)}
			<option value={locale}>{locale}</option>
		{/each}
	</select>
	<span id="language-select-hint" class="sr-only">
		Choose interface language. CMS content reloads for the selected locale with English fallback.
	</span>
</div>
