/** Illustrative / educational constants — verify against official FTB guidance before reliance. */

export const FTB_CONSTANTS = {
	/**
	 * FTB "doing business" factor-presence thresholds are indexed to the CCPI and
	 * change every tax year. These three fields version the figures below so every
	 * user-facing label can be DERIVED from the year (see FACTOR_THRESHOLD_STAMP)
	 * and can never drift from the values. When you bump SALES_THRESHOLD /
	 * PROPERTY_THRESHOLD, bump FACTOR_THRESHOLD_YEAR + FACTOR_THRESHOLD_VERIFIED_ON
	 * in the same edit.
	 */
	FACTOR_THRESHOLD_YEAR: 2025,
	FACTOR_THRESHOLD_VERIFIED_ON: '2026-06-21',
	FACTOR_THRESHOLD_SOURCE_URL:
		'https://www.ftb.ca.gov/file/business/doing-business-in-california.html',
	SALES_THRESHOLD: 757070,
	PROPERTY_THRESHOLD: 75707,
	MIN_FRANCHISE_TAX: 800,
	INTEREST_RATE_MONTHLY: 0.0066,
	PENALTY_PER_MONTH: 0.05,
	MAX_PENALTY: 0.25
} as const;

/**
 * User-facing vintage stamp for the indexed factor thresholds, derived from
 * FACTOR_THRESHOLD_YEAR. Interpolate this into every label that shows a factor
 * figure so the year and the value move in lockstep — update the year in one
 * place and all labels follow. Renders e.g. "2025 Indexed Threshold".
 */
export const FACTOR_THRESHOLD_STAMP = `${FTB_CONSTANTS.FACTOR_THRESHOLD_YEAR} Indexed Threshold`;

export type FtbFormRow = {
	id: string;
	name: string;
	purpose: string;
	due: string;
};

export const FORM_DATABASE: Record<'LLC' | 'SCORP' | 'CORP', FtbFormRow[]> = {
	LLC: [
		{
			id: '3522',
			name: 'LLC Tax Voucher',
			purpose: 'Pay the $800 annual tax',
			due: 'April 15, 2026'
		},
		{
			id: '3536',
			name: 'Estimated LLC Fee',
			purpose: 'Required if CA gross income > $250k',
			due: 'June 15, 2026'
		},
		{
			id: '568',
			name: 'Limited Liability Co. Return',
			purpose: 'Annual information return',
			due: 'April 15, 2026'
		}
	],
	SCORP: [
		{
			id: '100S',
			name: 'S Corp Franchise Tax Return',
			purpose: 'Report income (1.5% tax rate)',
			due: 'March 15, 2026'
		},
		{
			id: '100-ES',
			name: 'Corp Estimated Tax',
			purpose: 'Quarterly prepayments',
			due: 'Quarterly'
		}
	],
	CORP: [
		{
			id: '100',
			name: 'Corporation Franchise Tax Return',
			purpose: 'Report income (8.84% tax rate)',
			due: 'April 15, 2026'
		}
	]
};

export type FtbEntityType = keyof typeof FORM_DATABASE;
