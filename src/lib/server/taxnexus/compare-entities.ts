/**
 * Illustrative CA-focused entity comparison only — not tax or legal advice.
 * Numbers are simplified heuristics for product demos (TaxNexus-style UI).
 */
export type EntityComparisonRow = {
	total: number;
	label: string;
};

export type CompareEntitiesResult = Record<string, EntityComparisonRow>;

/** Rough illustrative liability buckets + recurring CA filings (USD). */
export function compareCaliforniaEntities(netIncome: number): CompareEntitiesResult {
	const ni = Math.max(0, netIncome);
	const franchiseFloor = 800;
	const soleFederalCaApprox = ni * 0.37 + franchiseFloor * 0;
	const llcFlowApprox = ni * 0.335 + franchiseFloor;
	const reasonableSalary = Math.min(ni * 0.45, Math.max(55000, ni * 0.35));
	const payrollRough = reasonableSalary * 0.153;
	const scorpProfitPass = Math.max(0, ni - reasonableSalary);
	const scorpApprox = payrollRough + scorpProfitPass * 0.29 + franchiseFloor + 1200;

	return {
		SOLE: {
			total: Math.round(soleFederalCaApprox),
			label: 'Schedule C + est. CA (illustrative single filer blended rate)'
		},
		LLC: {
			total: Math.round(llcFlowApprox),
			label: 'Disregarded/member-managed + $800 CA min franchise (illustrative)'
		},
		SCORP: {
			total: Math.round(scorpApprox),
			label: 'W-2 reasonable comp + pass-through remainder (illustrative)'
		}
	};
}
