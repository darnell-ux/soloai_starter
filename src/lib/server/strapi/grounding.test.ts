/**
 * Unit tests for the pure/deterministic parts of the chat grounding module.
 *
 * The Strapi client is mocked to return null so no network is touched: the
 * empty-corpus (Strapi-unreachable) path is exercised deterministically, and
 * the query/tokenizer paths never depend on a live CMS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
	strapiGetJson: vi.fn(async () => null)
}));

import { tokenize, htmlToText, getGroundingContext, clearGroundingCache } from './grounding';
import { strapiGetJson } from './client';

beforeEach(() => {
	clearGroundingCache();
	vi.mocked(strapiGetJson).mockReset();
	vi.mocked(strapiGetJson).mockResolvedValue(null);
});

// A realistic CA-nexus FAQ, keyed by shape. The query below scores well above
// MIN_SCORE against either.
const CA_Q = 'Does storing inventory in a California Amazon warehouse create sales tax nexus?';
const CA_A =
	'Yes. Storing inventory in California — including an Amazon FBA fulfillment center — creates physical-presence sales tax nexus, even at low sales volume.';
const CA_QUERY = 'Do I owe California sales tax on Amazon warehouse inventory?';

describe('tokenize', () => {
	it('lowercases and drops stopwords', () => {
		const t = tokenize('The California WAREHOUSE and my inventory');
		expect(t.has('california')).toBe(true);
		expect(t.has('warehouse')).toBe(true);
		expect(t.has('inventory')).toBe(true);
		expect(t.has('the')).toBe(false);
		expect(t.has('and')).toBe(false);
		expect(t.has('my')).toBe(false);
	});

	it('drops tokens shorter than 3 chars but keeps $ and %', () => {
		const t = tokenize('hi CA $800 12% ab');
		expect(t.has('hi')).toBe(false);
		expect(t.has('ca')).toBe(false);
		expect(t.has('ab')).toBe(false);
		expect(t.has('$800')).toBe(true);
		expect(t.has('12%')).toBe(true);
	});
});

describe('htmlToText', () => {
	it('strips tags and decodes entities', () => {
		expect(htmlToText('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry');
	});

	it('turns block-level tags into newlines', () => {
		expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo');
		expect(htmlToText('a<br>b')).toBe('a\nb');
	});

	it('collapses surrounding whitespace', () => {
		expect(htmlToText('  <div>  hello   world  </div> ')).toBe('hello world');
	});
});

describe('getGroundingContext', () => {
	it('returns an empty block for smalltalk (no query token survives filtering)', async () => {
		const r = await getGroundingContext([{ role: 'user', content: 'hi' }]);
		expect(r.block).toBe('');
		expect(r.count).toBe(0);
	});

	it('returns an empty block when there is no user turn', async () => {
		const r = await getGroundingContext([{ role: 'assistant', content: 'hello there friend' }]);
		expect(r.block).toBe('');
		expect(r.count).toBe(0);
	});

	it('degrades to ungrounded when the corpus is empty (Strapi unreachable)', async () => {
		const r = await getGroundingContext([
			{ role: 'user', content: 'Do I owe California sales tax on warehouse inventory?' }
		]);
		expect(r.block).toBe('');
		expect(r.count).toBe(0);
		expect(r.corpusSize).toBe(0);
	});

	// Regression: Strapi v5 flattened the REST shape (question/answer top-level).
	// parseDoc must read it, or the corpus is silently empty (groundedDocs: 0).
	it('grounds on a Strapi v5 flat-shape corpus (question/answer top-level)', async () => {
		vi.mocked(strapiGetJson).mockResolvedValue({
			data: [{ id: 1, documentId: 'abc123', question: CA_Q, answer: CA_A }]
		});
		const r = await getGroundingContext([{ role: 'user', content: CA_QUERY }]);
		expect(r.corpusSize).toBe(1);
		expect(r.count).toBeGreaterThanOrEqual(1);
		expect(r.block).toContain('knowledge');
		expect(r.block).toContain('California');
	});

	// Back-compat: the legacy Strapi v4 nested shape must still parse.
	it('still grounds on a Strapi v4 nested-shape corpus (attributes)', async () => {
		vi.mocked(strapiGetJson).mockResolvedValue({
			data: [{ id: 1, documentId: 'abc123', attributes: { question: CA_Q, answer: CA_A } }]
		});
		const r = await getGroundingContext([{ role: 'user', content: CA_QUERY }]);
		expect(r.corpusSize).toBe(1);
		expect(r.count).toBeGreaterThanOrEqual(1);
		expect(r.block).toContain('knowledge');
	});
});
