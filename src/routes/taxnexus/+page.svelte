<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import Marks from '$lib/components/landing/Marks.svelte';

	export const prerender = false;

	const ENTITY_CARD_KEYS = ['LLC', 'SCORP', 'CORP'] as const;

	// Checkout isn't live yet — upgrade CTAs point at the home pricing section instead.
	const plansHref = (resolve(localizeHref('/') as any) as string) + '#pricing';

	type FormRow = { id: string; name: string; purpose: string; due: string };
	type AssessResult = { hasNexus: boolean; triggers: string[]; forms: FormRow[]; minTax: number };
	type PenaltyPayload = { penalty: string; interest: string; total: string; warning: string };
	type Scenario = { minTax: number; variableFee: number; incomeTax: number; total: number };
	type Scenarios = { LLC: Scenario; SCORP: Scenario; CORP: Scenario };

	let entityType = $state<'LLC' | 'SCORP' | 'CORP'>('LLC');
	let salesInput = $state('');
	let inventoryInput = $state('');
	let hasEmployees = $state(false);

	let assessing = $state(false);
	let assessment = $state<AssessResult | null>(null);
	let showResults = $state(false);

	let monthsLate = $state(0);
	let penaltyInfo = $state<PenaltyPayload | null>(null);
	let penaltyLoading = $state(false);

	let profitInput = $state('100000');
	let scenarios = $state<Scenarios | null>(null);

	let userLocale = $state<'en' | 'fr'>('en');
	let localeLabel = $state('EN');

	function syncLocaleUi(): void {
		localeLabel = userLocale.toUpperCase();
	}

	async function refreshPenalties(): Promise<void> {
		const taxOwed = assessment ? assessment.minTax || 800 : 800;
		penaltyLoading = true;
		try {
			const res = await fetch('/api/taxnexus/penalties', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ monthsLate: Number(monthsLate), taxOwed })
			});
			if (!res.ok) {
				penaltyInfo = null;
				return;
			}
			penaltyInfo = (await res.json()) as PenaltyPayload;
		} finally {
			penaltyLoading = false;
		}
	}

	async function runAssessment(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		const sales = Number.parseFloat(salesInput) || 0;
		const inventory = Number.parseFloat(inventoryInput) || 0;

		assessing = true;
		try {
			const res = await fetch('/api/taxnexus/assess', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sales, inventory, hasEmployees, entityType })
			});
			if (!res.ok) {
				alert(`Assessment unavailable (${res.status})`);
				return;
			}
			assessment = (await res.json()) as AssessResult;
			showResults = true;
			monthsLate = 0;
			await refreshPenalties();
		} finally {
			assessing = false;
		}
	}

	async function handlePenaltySlider(): Promise<void> {
		if (!showResults || !assessment) return;
		await refreshPenalties();
	}

	async function updateComparison(netIncome: string): Promise<void> {
		const res = await fetch('/api/taxnexus/compare-entities', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ netIncome })
		});
		if (!res.ok) return;
		scenarios = (await res.json()) as Scenarios;
	}

	onMount(() => {
		userLocale = navigator.language.startsWith('en') ? 'en' : 'fr';
	});

	$effect(() => {
		syncLocaleUi();
	});

	$effect(() => {
		void profitInput;
		void updateComparison(profitInput);
	});
</script>

<SeoHead
	pageTitle="Free California Tax Exposure Check"
	description="See whether your Amazon FBA inventory triggers California FTB and CDTFA tax exposure — a free first-pass read, not tax advice."
	noindex
/>

<div class="min-h-screen bg-base-200">
	<nav class="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 backdrop-blur">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
			<div class="flex items-center gap-2">
				<div
					class="flex h-10 w-10 items-center justify-center bg-secondary text-lg font-bold text-secondary-content"
				>
					N
				</div>
				<h1 class="font-mono text-lg font-bold tracking-tight text-base-content">TaxNexus</h1>
			</div>
			<div class="flex items-center gap-4">
				<span class="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
					Locale · {localeLabel}
				</span>
				<a class="btn btn-outline btn-secondary btn-sm font-mono" href={plansHref}>
					See Guard &amp; Aggregator plans
				</a>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-5xl px-4 py-6">
		<div class="mb-6 border-l-[3px] border-secondary bg-base-100 px-4 py-3 text-sm leading-relaxed text-base-content" role="note">
			<p class="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
				Read this first
			</p>
			<p class="mb-2">
				This is a first-pass read, not tax advice. TaxNexus estimates your California exposure using
				current FTB and CDTFA figures — built to tell you whether you have a problem and roughly how
				big, not to file for you or replace a CPA. Confirm anything that matters with a tax
				professional before you act; FTB Publication 927 is a good starting point.
			</p>
			<p class="mb-0 text-muted">
				Your inputs stay in your session — nothing's stored, and figures go only to our own server to
				run the numbers.
			</p>
		</div>

		<section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Nexus analyzer -->
			<div class="relative border border-base-300 bg-base-100 p-6 lg:col-span-1">
				<Marks />
				<h2
					class="mb-4 flex items-center gap-2 border-b border-base-300 pb-3 font-bold text-base-content"
				>
					<span class="text-secondary">⚡</span> Nexus Analyzer Engine
				</h2>
				<form class="flex flex-col gap-4 text-sm text-base-content" onsubmit={runAssessment}>
					<label class="block font-medium">
						Legal Structure
						<select
							class="mt-1 block w-full border border-base-300 bg-base-100 py-3 pl-3 pr-8 outline-none focus:border-secondary focus:ring-2 focus:ring-olive"
							bind:value={entityType}
						>
							<option value="LLC">California LLC</option>
							<option value="SCORP">S Corporation</option>
							<option value="CORP">C Corporation</option>
						</select>
					</label>

					<label class="block font-medium">
						Global Sales (Rolling 12mo)
						<input
							type="number"
							step="any"
							min="0"
							class="mt-1 w-full border border-base-300 bg-base-100 px-3 py-2 font-mono outline-none focus:border-secondary focus:ring-2 focus:ring-olive"
							bind:value={salesInput}
							placeholder="$800,001"
							required
						/>
						<span class="mt-1 block font-mono text-[11px] text-muted">Economic Nexus cap: $757,070</span>
					</label>

					<label class="block font-medium">
						Inventory Value ($)
						<input
							type="number"
							step="any"
							min="0"
							class="mt-1 w-full border border-base-300 bg-base-100 px-3 py-2 font-mono outline-none focus:border-secondary focus:ring-2 focus:ring-olive"
							bind:value={inventoryInput}
							placeholder="$0 — FBA/3PL"
						/>
					</label>

					<label class="flex cursor-pointer items-start gap-2 font-normal">
						<input type="checkbox" class="mt-1 accent-olive" bind:checked={hasEmployees} />
						<span>Remote employees based in CA (Payroll Nexus)</span>
					</label>

					<button type="submit" disabled={assessing} class="btn btn-primary mt-4 w-full font-mono disabled:opacity-60">
						{#if assessing}
							<span>Running engine…</span>
							<span
								class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/40 border-t-current"
							></span>
						{:else}
							<span aria-hidden="true">▸</span> Run my exposure check
						{/if}
					</button>
				</form>
			</div>

			<!-- Results dashboard -->
			<div class="relative border border-base-300 bg-base-100 p-6 lg:col-span-2">
				<Marks />
				{#if !showResults}
					<p class="bg-base-200 p-8 text-center text-sm text-muted">
						Submit the analyzer form to populate status, penalty forecaster, and your FTB checklist.
					</p>
				{:else if assessment}
					<div class="space-y-6">
						<div
							class="border p-5 {assessment.hasNexus
								? 'border-primary bg-primary/10'
								: 'border-secondary bg-secondary/10'}"
						>
							<h3
								class="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider {assessment.hasNexus
									? 'text-primary'
									: 'text-secondary'}"
							>
								{#if !assessment.hasNexus}<span aria-hidden="true">✓</span>{/if}
								{assessment.hasNexus ? 'Nexus Status: Confirmed' : 'Nexus Status: Low Risk'}
							</h3>
							<p class="text-sm text-base-content">
								{#if assessment.hasNexus}
									Your profile triggers California franchise tax obligation paths. Review triggers and
									the checklist for form timing.
								{:else}
									Below illustrative economic and physical thresholds for this demo. Still validate
									with official guidance and real activity.
								{/if}
							</p>
							{#if assessment.triggers.length > 0}
								<ul class="mt-3 list-inside list-disc space-y-1 text-xs text-base-content">
									{#each assessment.triggers as t (t)}
										<li>{t}</li>
									{/each}
								</ul>
							{/if}
						</div>

						<div class="border border-base-300 bg-base-200 p-5">
							<h3 class="mb-3 text-sm font-bold text-base-content">Penalty &amp; interest forecaster</h3>
							<p class="mb-2 text-xs text-muted">
								Months late:
								<span class="font-mono font-bold text-secondary">{monthsLate}</span>
								· Base tax for calc:
								<span class="font-mono">{assessment.minTax || 800}</span>
							</p>
							<input
								type="range"
								min="0"
								max="12"
								step="1"
								class="mb-4 w-full accent-olive"
								bind:value={monthsLate}
								oninput={() => void handlePenaltySlider()}
							/>
							{#if penaltyLoading}
								<p class="text-xs text-muted">Updating estimates…</p>
							{:else if penaltyInfo}
								<div class="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
									<div class="border border-base-300 bg-base-100 p-2">
										<div class="text-muted">Penalty</div>
										<div class="font-mono font-bold text-primary">${penaltyInfo.penalty}</div>
									</div>
									<div class="border border-base-300 bg-base-100 p-2">
										<div class="text-muted">Interest</div>
										<div class="font-mono font-bold text-secondary">${penaltyInfo.interest}</div>
									</div>
									<div class="border border-base-300 bg-base-100 p-2">
										<div class="text-muted">Total est.</div>
										<div class="font-mono font-bold text-base-content">${penaltyInfo.total}</div>
									</div>
								</div>
								{#if penaltyInfo.warning}
									<p class="mt-2 text-[11px] text-muted">{penaltyInfo.warning}</p>
								{/if}
							{/if}
						</div>

						<div>
							<h3 class="mb-2 text-sm font-bold text-base-content">FTB action checklist</h3>
							<ul class="divide-y divide-base-300 border border-base-300 bg-base-100 text-sm">
								{#if assessment.forms.length === 0}
									<li class="px-4 py-4 text-muted">No forms listed for this outcome.</li>
								{:else}
									{#each assessment.forms as f (f.id + f.name)}
										<li class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<span class="font-bold text-base-content">Form {f.id}</span>
												— {f.name}
												<p class="text-xs text-muted">{f.purpose}</p>
											</div>
											<span class="bg-base-200 px-2 py-1 font-mono text-xs text-secondary">{f.due}</span>
										</li>
									{/each}
								{/if}
							</ul>
							{#if assessment.hasNexus && assessment.minTax > 0}
								<p class="mt-2 text-xs font-semibold text-base-content">
									Estimated minimum franchise tax exposure (placeholder):
									<span class="font-mono text-secondary">${assessment.minTax}</span>/yr
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- Compare entities -->
		<section class="relative mt-10 border border-base-300 bg-base-100 p-6">
			<Marks />
			<h2 class="mb-1 text-xl font-bold text-base-content">Entity “what-if” (illustrative)</h2>
			<p class="mb-4 text-xs text-muted">
				How the $800 minimum and gross-receipts fees land across LLC, S-corp, and C-corp — based on
				current FTB figures.
			</p>

			<input
				type="number"
				class="mb-6 w-full max-w-md border border-base-300 bg-base-100 px-4 py-3 font-mono text-lg outline-none focus:border-secondary focus:ring-2 focus:ring-olive"
				bind:value={profitInput}
				min="0"
				step="1000"
				placeholder="Estimated annual net profit"
			/>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{#if scenarios}
					{#each ENTITY_CARD_KEYS as kind (kind)}
						{@const row = scenarios[kind]}
						<div
							class="border p-4 {kind === 'SCORP'
								? 'border-secondary bg-base-200'
								: 'border-base-300 bg-base-100'}"
						>
							<p class="font-mono text-xs font-bold uppercase tracking-[0.1em] text-secondary">{kind}</p>
							<p class="text-3xl font-black text-base-content">${Math.round(row.total).toLocaleString()}</p>
							<dl class="mt-3 space-y-1 text-[11px] text-muted">
								<div class="flex justify-between gap-2">
									<dt>Min tax</dt>
									<dd class="font-mono">${row.minTax}</dd>
								</div>
								<div class="flex justify-between gap-2">
									<dt>Variable / fee</dt>
									<dd class="font-mono">${row.variableFee}</dd>
								</div>
								<div class="flex justify-between gap-2">
									<dt>Income-style tax</dt>
									<dd class="font-mono">${row.incomeTax.toFixed(2)}</dd>
								</div>
							</dl>
						</div>
					{/each}
				{:else}
					<p class="col-span-full text-sm text-muted">Loading comparison…</p>
				{/if}
			</div>
		</section>

		<section class="mt-10 bg-accent px-6 py-10 text-center text-accent-content">
			<h3 class="mb-2 text-2xl font-bold text-accent-content">Audit protection lane</h3>
			<p class="mx-auto mb-6 max-w-lg text-sm text-accent-content/80">
				When you're ready to stay ahead of the next notice, Guard and Aggregator keep watch on your
				exposure so the next letter never blindsides you.
			</p>
			<a
				class="btn btn-outline font-mono border-accent-content text-accent-content hover:border-accent-content hover:bg-accent-content hover:text-accent"
				href={plansHref}
			>
				See Guard &amp; Aggregator plans
			</a>
		</section>
	</main>
</div>
