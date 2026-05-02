<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = false;

	type Row = { total: number; label: string };

	let rows = $state<Record<string, Row>>({});
	let paymentSubtext = $state('Calculating best payment provider for your region…');
	let localeLabel = $state('Locale: EN');

	let userLocale = $state<'en' | 'fr'>('en');

	function syncLocaleUi(): void {
		localeLabel = `Locale: ${userLocale.toUpperCase()}`;
		paymentSubtext =
			userLocale === 'en'
				? 'US Region: Secure Checkout via Stripe'
				: 'Global Region: Tax-compliant Checkout via LemonSqueezy';
	}

	async function updateComparison(netIncome: string): Promise<void> {
		const res = await fetch('/api/compare-entities', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ netIncome })
		});
		if (!res.ok) return;
		const data = (await res.json()) as Record<string, Row>;
		rows = data;
	}

	async function openCheckout(): Promise<void> {
		const res = await fetch('/api/create-checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ locale: userLocale, planId: 'pro_123' })
		});
		const payload = (await res.json()) as { url?: string; provider?: string; message?: string };
		if (!res.ok || !payload.url) {
			alert(payload.message ?? `Checkout unavailable (${res.status})`);
			return;
		}
		alert(`Redirecting to ${payload.provider}…`);
		window.location.href = payload.url;
	}

	let profitInput = $state('100000');

	onMount(() => {
		userLocale = navigator.language.startsWith('en') ? 'en' : 'fr';
	});

	$effect(() => {
		syncLocaleUi();
		void updateComparison(profitInput);
	});
</script>

<SeoHead pageTitle="CA TaxNexus | Multi-Locale Compliance" description="Illustrative entity comparison demo." noindex />

<main class="min-h-screen bg-slate-50 p-8">
	<div class="mx-auto max-w-4xl space-y-8">
		<header
			class="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
		>
			<h1 class="text-xl font-bold">CA TaxNexus</h1>
			<div class="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
				{localeLabel}
			</div>
		</header>

		<section class="rounded-2xl bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-bold">CA Entity “What-If” Builder (2026)</h2>
			<p class="mb-4 text-xs text-slate-500">
				Illustrative estimates only — not tax or legal advice.
			</p>
			<input
				type="number"
				class="mb-6 w-full rounded-xl border p-4 font-mono text-2xl"
				bind:value={profitInput}
				min="0"
				step="1000"
			/>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{#each Object.entries(rows) as [key, row] (key)}
					<div
						class="rounded-xl border p-4 {key === 'SCORP'
							? 'border-blue-200 bg-blue-50'
							: ''}"
					>
						<p class="text-xs font-bold uppercase text-slate-500">{key}</p>
						<p class="text-2xl font-black text-slate-800">
							${row.total.toLocaleString()}
						</p>
						<p class="text-[10px] text-slate-400">{row.label}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl bg-slate-900 p-8 text-center text-white">
			<h3 class="mb-2 text-2xl font-bold">Get Full Audit Protection</h3>
			<p class="mb-6 text-slate-400">{paymentSubtext}</p>
			<button
				type="button"
				class="rounded-lg bg-blue-500 px-8 py-3 font-bold transition hover:bg-blue-600"
				onclick={() => openCheckout()}
			>
				Upgrade to Pro
			</button>
		</section>
	</div>
</main>
