import { describe, expect, it } from 'vitest';
import { calculateFtbPenalties } from './penalties';

describe('calculateFtbPenalties', () => {
	it('caps delinquency at 25%', () => {
		const r = calculateFtbPenalties(12, 800);
		const penaltyNum = Number.parseFloat(r.penalty);
		expect(penaltyNum).toBeCloseTo(200, 2);
	});

	it('includes warning after long delay', () => {
		const r = calculateFtbPenalties(6, 800);
		expect(r.warning.length).toBeGreaterThan(0);
	});
});
