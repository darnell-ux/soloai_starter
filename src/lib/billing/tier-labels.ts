/**
 * Product-facing names for internal billing tier keys.
 *
 * Internal keys (`basic`/`pro`) stay stable across billing plumbing (Stripe/Lemon
 * env vars, stored subscription records); this is the single place that maps them
 * to the customer-facing TaxNexus tier names, so the pricing page and the account
 * page never drift.
 */
const TIER_NAMES: Record<string, string> = {
	basic: 'Guard',
	pro: 'Aggregator',
	team: 'Team' // reserved — no Team tier is offered yet
};

export function tierDisplayName(tier: string | null | undefined): string {
	if (!tier) return '';
	return TIER_NAMES[tier] ?? tier.charAt(0).toUpperCase() + tier.slice(1);
}
