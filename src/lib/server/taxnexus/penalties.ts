import { FTB_CONSTANTS } from './ftb-constants';

export type PenaltiesResult = {
	penalty: string;
	interest: string;
	total: string;
	warning: string;
};

export function calculateFtbPenalties(monthsLate: number, taxOwed: number): PenaltiesResult {
	const m = Math.max(0, Math.min(120, Math.floor(monthsLate)));
	const t = Number.isFinite(taxOwed) && taxOwed > 0 ? taxOwed : FTB_CONSTANTS.MIN_FRANCHISE_TAX;

	let penaltyRate = m * FTB_CONSTANTS.PENALTY_PER_MONTH;
	if (penaltyRate > FTB_CONSTANTS.MAX_PENALTY) penaltyRate = FTB_CONSTANTS.MAX_PENALTY;

	const penalty = t * penaltyRate;
	const interest = t * (Math.pow(1 + FTB_CONSTANTS.INTEREST_RATE_MONTHLY, m) - 1);
	const total = t + penalty + interest;

	const warning = m >= 5 ? '25% maximum delinquency penalty may apply (illustrative).' : '';

	return {
		penalty: penalty.toFixed(2),
		interest: interest.toFixed(2),
		total: total.toFixed(2),
		warning
	};
}
