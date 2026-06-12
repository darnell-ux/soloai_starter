/** Entity scenarios aligned with Gemini MVP “What-If” math (illustrative only). */

export type EntityScenario = {
	minTax: number;
	variableFee: number;
	incomeTax: number;
	total: number;
};

export type CompareEntitiesResult = {
	LLC: EntityScenario;
	SCORP: EntityScenario;
	CORP: EntityScenario;
};

export function compareEntityScenarios(netIncome: number): CompareEntitiesResult {
	const income = Math.max(0, netIncome);

	const llcVariable = income >= 250_000 ? 900 : 0;
	const llc: EntityScenario = {
		minTax: 800,
		variableFee: llcVariable,
		incomeTax: 0,
		total: 800 + llcVariable
	};

	const scorpIncomeTax = income * 0.015;
	const scorp: EntityScenario = {
		minTax: 800,
		variableFee: 0,
		incomeTax: scorpIncomeTax,
		total: Math.max(800, scorpIncomeTax)
	};

	const corpIncomeTax = income * 0.0884;
	const corp: EntityScenario = {
		minTax: 800,
		variableFee: 0,
		incomeTax: corpIncomeTax,
		total: Math.max(800, corpIncomeTax)
	};

	return { LLC: llc, SCORP: scorp, CORP: corp };
}
