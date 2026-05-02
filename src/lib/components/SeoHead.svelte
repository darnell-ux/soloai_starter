<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { baseLocale, getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import {
		DEFAULT_META_DESCRIPTION,
		SITE_BRAND,
		SOCIAL_IMAGE_HEIGHT,
		SOCIAL_IMAGE_WIDTH
	} from '$lib/seo/site';
	import { sanitizeMetaString, sanitizeSameOriginUrl } from '$lib/seo/sanitize';
	import { META_TITLE_MAX, clampDescription, clampTitle } from '$lib/seo/validate';
	import { hreflangForLocale, ogLocaleTag } from '$lib/seo/locale';
	import { buildBreadcrumbJsonLd, serializeJsonLd } from '$lib/seo/jsonld';

	type CmsSeo = {
		title?: string;
		description?: string;
		imageUrl?: string;
		canonicalUrl?: string;
	};

	type Props = {
		documentTitle?: string;
		pageTitle?: string;
		description?: string;
		cms?: CmsSeo;
		breadcrumbs?: { name: string; path: string }[];
		noindex?: boolean;
	};

	let {
		documentTitle,
		pageTitle = '',
		description,
		cms,
		breadcrumbs,
		noindex = false
	}: Props = $props();

	const currentLocale = $derived(getLocale());

	const canonicalHref = $derived.by(() => {
		const fromCms = cms?.canonicalUrl
			? sanitizeSameOriginUrl(cms.canonicalUrl, page.url.origin)
			: null;
		if (fromCms) return fromCms;
		return new URL(page.url.pathname, page.url.origin).href;
	});

	const titleText = $derived.by(() => {
		const pageSegment = documentTitle
			? sanitizeMetaString(documentTitle)
			: sanitizeMetaString(cms?.title ?? pageTitle ?? SITE_BRAND);
		const suffix = ` | ${SITE_BRAND}`;
		const maxPage = Math.max(8, META_TITLE_MAX - suffix.length);
		const pagePart = clampTitle(pageSegment, maxPage);
		return `${pagePart}${suffix}`;
	});

	const descText = $derived.by(() => {
		const raw = cms?.description ?? description ?? DEFAULT_META_DESCRIPTION;
		return clampDescription(sanitizeMetaString(raw));
	});

	const hasCustomOgImage = $derived.by(
		() => !!(cms?.imageUrl && sanitizeSameOriginUrl(cms.imageUrl, page.url.origin))
	);

	const ogImage = $derived.by(() => {
		const fromCms = cms?.imageUrl ? sanitizeSameOriginUrl(cms.imageUrl, page.url.origin) : null;
		if (fromCms) return fromCms;
		return new URL('/favicon.svg', page.url.origin).href;
	});

	const twitterAlt = $derived.by(() => clampTitle(sanitizeMetaString(titleText)));

	const robotsContent = $derived(noindex ? 'noindex, nofollow' : 'index, follow');

	function alternateHref(locale: (typeof locales)[number]) {
		const path = localizeHref(page.url.pathname, { locale });
		return new URL(resolve(path as any), page.url.origin).href;
	}

	const xDefaultHref = $derived(alternateHref(baseLocale));

	const ogLocaleAlternates = $derived(locales.filter((l) => l !== currentLocale));

	const breadcrumbScript = $derived.by(() => {
		if (!breadcrumbs?.length) return '';
		const items = breadcrumbs.map((b) => {
			const path = localizeHref(b.path, { locale: currentLocale });
			const href = new URL(resolve(path as any), page.url.origin).href;
			return { name: b.name, url: href };
		});
		const data = buildBreadcrumbJsonLd(items);
		return data ? serializeJsonLd(data) : '';
	});

	const ogLocale = $derived(ogLocaleTag(currentLocale));
</script>

<svelte:head>
	<title>{titleText}</title>
	<meta name="description" content={descText} />
	<meta name="robots" content={robotsContent} />
	<link rel="canonical" href={canonicalHref} />

	{#each locales as locale (locale)}
		<link rel="alternate" hreflang={hreflangForLocale(locale)} href={alternateHref(locale)} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={xDefaultHref} />

	<meta property="og:title" content={titleText} />
	<meta property="og:description" content={descText} />
	<meta property="og:url" content={canonicalHref} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:locale" content={ogLocale} />
	{#each ogLocaleAlternates as loc (loc)}
		<meta property="og:locale:alternate" content={ogLocaleTag(loc)} />
	{/each}
	{#if hasCustomOgImage}
		<meta property="og:image:width" content={String(SOCIAL_IMAGE_WIDTH)} />
		<meta property="og:image:height" content={String(SOCIAL_IMAGE_HEIGHT)} />
	{/if}
	<meta property="og:image:alt" content={twitterAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={titleText} />
	<meta name="twitter:description" content={descText} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="twitter:image:alt" content={twitterAlt} />

	{#if breadcrumbScript}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD only; string from serializeJsonLd (no raw user HTML). -->
		{@html '<script type="application/ld+json">' + breadcrumbScript + '</scr' + 'ipt>'}
	{/if}
</svelte:head>
