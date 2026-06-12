import { describe, expect, it } from 'vitest';
import { assessNexus, parseNexusAssessBody } from './assess-nexus';

describe('assessNexus', () => {
	it('detects economic nexus above sales threshold', () => {
		const r = assessNexus({
			sales: 800_000,
			inventory: 0,
			hasEmployees: false,
			entityType: 'LLC'
		});
		expect(r.hasNexus).toBe(true);
		expect(r.triggers.some((t) => t.includes('757,070'))).toBe(true);
		expect(r.minTax).toBe(800);
		expect(r.forms.length).toBeGreaterThan(0);
	});

	it('returns safe when below all triggers', () => {
		const r = assessNexus({
			sales: 100_000,
			inventory: 0,
			hasEmployees: false,
			entityType: 'CORP'
		});
		expect(r.hasNexus).toBe(false);
		expect(r.forms.length).toBe(0);
		expect(r.minTax).toBe(0);
	});
});

describe('parseNexusAssessBody', () => {
	it('rejects invalid sales', () => {
		const r = parseNexusAssessBody({});
		expect('error' in r).toBe(true);
	});
});
