<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';

	export const prerender = false;

	const ENTITY_CARD_KEYS = ['LLC', 'SCORP', 'CORP'] as const;

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
	let paymentSubtext = $state('Calculating payment provider…');
	let localeLabel = $state('EN');

	function syncLocaleUi(): void {
		localeLabel = userLocale.toUpperCase();
		paymentSubtext =
			userLocale === 'en'
				? 'US region: Stripe checkout'
				: 'Global region: Lemon Squeezy checkout';
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
	pageTitle="CA TaxNexus | Franchise Tax Board Illustrative Analyzer"
	description="Educational FTB-style nexus, penalty, and entity comparison tooling — not official guidance."
	noindex
/>

<div class="min-h-screen bg-slate-50">
	<nav
		class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
	>
		<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
			<div class="flex items-center gap-2">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white shadow"
				>
					N
				</div>
				<h1 class="text-lg font-bold tracking-tight text-slate-800">Ca Tax Nexus</h1>
			</div>
			<div class="flex items-center gap-3">
				<span
					class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200"
				>
					Locale · {localeLabel}
				</span>
				<button
					type="button"
					class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
					onclick={() => openCheckout()}
				>
					Upgrade · Pro Audit Shield
				</button>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-5xl px-4 py-6">
		<p
			class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"
			role="note"
		>
			<strong>Fictitious educational demo:</strong>
			Illustrative Franchise Tax Board–style thresholds and calculators only. Outputs are simulations (including
			5%/month capped delinquency and compound-style interest placeholders). Not tax advice, accounting, legal
			guidance, or an endorsement of any provider. Confirm all figures with FTB Publication 927 and your advisor.
			<br />
			<span class="text-amber-800/80">
				No user data leaves your session except POSTs to same-origin endpoints for this sandbox.
			</span>
		</p>

		<section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Nexus analyzer -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
				<h2 class="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-slate-900">
					<span class="text-teal-600">⚡</span> Nexus Analyzer Engine
				</h2>
				<form class="flex flex-col gap-4 text-sm text-slate-700" onsubmit={runAssessment}>
					<label class="block font-medium">
						Legal Structure
						<select
							class="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-3 pl-3 pr-8 outline-none ring-teal-500 focus:ring-2"
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
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
							bind:value={salesInput}
							placeholder="$800,001"
							required
						/>
						<span class="mt-1 block text-[11px] text-slate-500">Economic Nexus cap: $757,070</span>
					</label>

					<label class="block font-medium">
						Inventory Value ($)
						<input
							type="number"
							step="any"
							min="0"
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
							bind:value={inventoryInput}
							placeholder="$0 — FBA/3PL"
						/>
					</label>

					<label class="flex cursor-pointer items-start gap-2 font-normal">
						<input type="checkbox" class="mt-1" bind:checked={hasEmployees} />
						<span>Remote employees based in CA (Payroll Nexus)</span>
					</label>

					<button
						type="submit"
						disabled={assessing}
						class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if assessing}
							<span>Running engine…</span>
							<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
							></span>
						{:else}
							Run Franchise Tax Diagnostics
						{/if}
					</button>
				</form>
			</div>

			<!-- Results dashboard -->
			<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-inner lg:col-span-2">
				{#if !showResults}
					<p class="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
						Submit the analyzer form to populate status, penalty forecaster, and your FTB checklist.
					</p>
				{:else if assessment}
					<div class="space-y-6">
						<div
							class="rounded-xl border p-5 shadow-sm {assessment.hasNexus
								? 'border-red-200 bg-red-50'
								: 'border-emerald-200 bg-emerald-50'}"
						>
							<h3
								class="mb-2 text-xs font-bold uppercase tracking-wider {assessment.hasNexus
									? 'text-red-600'
									: 'text-emerald-700'}"
							>
								{assessment.hasNexus ? 'Nexus Status: Confirmed' : 'Nexus Status: Low Risk'}
							</h3>
							<p class="text-sm text-slate-700">
								{#if assessment.hasNexus}
									Your profile triggers California franchise tax obligation paths. Review triggers and
									the checklist for form timing.
								{:else}
									Below illustrative economic and physical thresholds for this demo. Still validate
									with official guidance and real activity.
								{/if}
							</p>
							{#if assessment.triggers.length > 0}
								<ul class="mt-3 list-inside list-disc space-y-1 text-xs text-slate-800">
									{#each assessment.triggers as t (t)}
										<li>{t}</li>
									{/each}
								</ul>
							{/if}
						</div>

						<div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
							<h3 class="mb-3 text-sm font-bold text-slate-800">Penalty & interest forecaster</h3>
							<p class="mb-2 text-xs text-slate-600">
								Months late:
								<span class="font-mono font-bold text-teal-700">{monthsLate}</span>
								· Base tax for calc:
								<span class="font-mono">{assessment.minTax || 800}</span>
							</p>
							<input
								type="range"
								min="0"
								max="12"
								step="1"
								class="mb-4 w-full accent-teal-600"
								bind:value={monthsLate}
								oninput={() => void handlePenaltySlider()}
							/>
							{#if penaltyLoading}
								<p class="text-xs text-slate-500">Updating estimates…</p>
							{:else if penaltyInfo}
								<div class="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
									<div class="rounded-lg bg-white p-2 shadow-sm">
										<div class="text-slate-500">Penalty</div>
										<div class="font-mono font-bold text-red-600">${penaltyInfo.penalty}</div>
									</div>
									<div class="rounded-lg bg-white p-2 shadow-sm">
										<div class="text-slate-500">Interest</div>
										<div class="font-mono font-bold text-amber-600">${penaltyInfo.interest}</div>
									</div>
									<div class="rounded-lg bg-white p-2 shadow-sm">
										<div class="text-slate-500">Total est.</div>
										<div class="font-mono font-bold text-slate-900">${penaltyInfo.total}</div>
									</div>
								</div>
								{#if penaltyInfo.warning}
									<p class="mt-2 text-[11px] text-amber-800">{penaltyInfo.warning}</p>
								{/if}
							{/if}
						</div>

						<div>
							<h3 class="mb-2 text-sm font-bold text-slate-800">FTB action checklist</h3>
							<ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
								{#if assessment.forms.length === 0}
									<li class="px-4 py-4 text-slate-500">No forms listed for this outcome.</li>
								{:else}
									{#each assessment.forms as f (f.id + f.name)}
										<li class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<span class="font-bold text-slate-900">Form {f.id}</span>
												— {f.name}
												<p class="text-xs text-slate-500">{f.purpose}</p>
											</div>
											<span class="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-teal-800"
												>{f.due}</span
											>
										</li>
									{/each}
								{/if}
							</ul>
							{#if assessment.hasNexus && assessment.minTax > 0}
								<p class="mt-2 text-xs font-semibold text-slate-700">
									Estimated minimum franchise tax exposure (placeholder):
									<span class="font-mono text-teal-700">${assessment.minTax}</span>/yr
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- Compare entities -->
		<section class="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
			<h2 class="mb-1 text-xl font-bold text-slate-900">Entity “what-if” (illustrative)</h2>
			<p class="mb-4 text-xs text-slate-500">
				LLC gross-receipt fee band, S-corp rate, and C-corp rate — Gemini-style placeholders only.
			</p>

			<input
				type="number"
				class="mb-6 w-full max-w-md rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg"
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
							class="rounded-xl border p-4 {kind === 'SCORP'
								? 'border-blue-200 bg-blue-50/70'
								: 'border-slate-100 bg-slate-50/50'}"
						>
							<p class="text-xs font-bold uppercase text-slate-500">{kind}</p>
							<p class="text-3xl font-black text-slate-900">${Math.round(row.total).toLocaleString()}</p>
							<dl class="mt-3 space-y-1 text-[11px] text-slate-600">
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
					<p class="col-span-full text-sm text-slate-500">Loading comparison…</p>
				{/if}
			</div>
		</section>

		<section class="mt-10 rounded-2xl bg-slate-900 px-6 py-10 text-center text-white shadow-lg">
			<h3 class="mb-2 text-2xl font-bold">Audit protection lane</h3>
			<p class="mx-auto mb-6 max-w-lg text-sm text-slate-400">{paymentSubtext}</p>
			<button
				type="button"
				class="rounded-xl bg-teal-500 px-10 py-3 text-sm font-bold shadow-lg transition hover:bg-teal-400"
				onclick={() => openCheckout()}
			>
				Unlock Pro · Guided filing pack
			</button>
		</section>
	</main>
</div>
