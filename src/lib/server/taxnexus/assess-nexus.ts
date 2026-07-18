import { FORM_DATABASE, FTB_CONSTANTS, FACTOR_THRESHOLD_STAMP, type FtbEntityType } from './ftb-constants';

export type NexusAssessInput = {
	sales: number;
	inventory: number;
	hasEmployees: boolean;
	entityType: FtbEntityType;
};

export type NexusAssessResult = {
	hasNexus: boolean;
	triggers: string[];
	forms: (typeof FORM_DATABASE)[FtbEntityType];
	minTax: number;
};

function normalizeEntityType(raw: unknown): FtbEntityType {
	const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
	if (s === 'SCORP' || s === 'S_CORP') return 'SCORP';
	if (s === 'CORP' || s === 'CCORP' || s === 'C_CORP') return 'CORP';
	if (s === 'LLC') return 'LLC';
	return 'LLC';
}

export function parseNexusAssessBody(body: unknown): NexusAssessInput | { error: string } {
	if (!body || typeof body !== 'object') return { error: 'invalid_body' };
	const o = body as Record<string, unknown>;
	const salesRaw = o.sales;
	const sales =
		typeof salesRaw === 'number'
			? salesRaw
			: typeof salesRaw === 'string'
				? Number.parseFloat(salesRaw)
				: NaN;
	const invRaw = o.inventory ?? o.inventoryValue;
	const inventory =
		typeof invRaw === 'number'
			? invRaw
			: typeof invRaw === 'string'
				? Number.parseFloat(invRaw)
				: 0;
	const hasEmployees = Boolean(o.hasEmployees);
	const entityType = normalizeEntityType(o.entityType);

	if (!Number.isFinite(sales) || sales < 0 || sales > 1e15) return { error: 'invalid_sales' };
	if (!Number.isFinite(inventory) || inventory < 0 || inventory > 1e15) return { error: 'invalid_inventory' };

	return { sales, inventory, hasEmployees, entityType };
}

export function assessNexus(input: NexusAssessInput): NexusAssessResult {
	const triggers: string[] = [];

	if (input.sales >= FTB_CONSTANTS.SALES_THRESHOLD) {
		triggers.push(
			`Sales exceed the FTB "doing business" sales threshold of $${FTB_CONSTANTS.SALES_THRESHOLD.toLocaleString('en-US')} (${FACTOR_THRESHOLD_STAMP})`
		);
	}

	if (input.inventory >= FTB_CONSTANTS.PROPERTY_THRESHOLD) {
		triggers.push(
			`Property/inventory exceeds the FTB factor-presence threshold of $${FTB_CONSTANTS.PROPERTY_THRESHOLD.toLocaleString('en-US')} (${FACTOR_THRESHOLD_STAMP}, illustrative)`
		);
	} else if (input.inventory > 0) {
		triggers.push('Physical inventory in CA (Amazon FBA/3PL Nexus)');
	}

	if (input.hasEmployees) {
		triggers.push('Payroll Nexus (Remote CA employees)');
	}

	const hasNexus = triggers.length > 0;

	return {
		hasNexus,
		triggers,
		forms: hasNexus ? FORM_DATABASE[input.entityType] : [],
		minTax: hasNexus ? FTB_CONSTANTS.MIN_FRANCHISE_TAX : 0
	};
}
