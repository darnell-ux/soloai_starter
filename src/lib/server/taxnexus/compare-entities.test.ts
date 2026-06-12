import { describe, expect, it } from 'vitest';
import { compareEntityScenarios } from './compare-entities';

describe('compareEntityScenarios', () => {
	it('returns LLC / SCORP / CORP with illustrative totals', () => {
		const r = compareEntityScenarios(100_000);
		expect(r.LLC.total).toBe(800);
		expect(r.SCORP.incomeTax).toBeCloseTo(1500, 5);
		expect(r.SCORP.total).toBe(Math.max(800, r.SCORP.incomeTax));
		expect(r.CORP.total).toBe(Math.max(800, 100_000 * 0.0884));
	});

	it('adds LLC variable fee when income is at least 250k', () => {
		const r = compareEntityScenarios(300_000);
		expect(r.LLC.variableFee).toBe(900);
		expect(r.LLC.total).toBe(1700);
	});

	it('treats negative income like zero components', () => {
		const r = compareEntityScenarios(-500);
		expect(r.LLC.total).toBe(800);
		expect(r.SCORP.total).toBe(800);
	});
});
