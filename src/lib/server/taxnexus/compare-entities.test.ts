import { describe, expect, it } from 'vitest';
import { compareCaliforniaEntities } from './compare-entities';

describe('compareCaliforniaEntities', () => {
	it('returns three rows with finite totals', () => {
		const r = compareCaliforniaEntities(100_000);
		expect(Object.keys(r).sort()).toEqual(['LLC', 'SCORP', 'SOLE']);
		expect(r.SOLE!.total).toBeGreaterThan(0);
		expect(r.LLC!.total).toBeGreaterThan(0);
		expect(r.SCORP!.total).toBeGreaterThan(0);
	});

	it('clamps negative income', () => {
		const r = compareCaliforniaEntities(-500);
		expect(r.SOLE!.total).toBeGreaterThanOrEqual(0);
	});
});
