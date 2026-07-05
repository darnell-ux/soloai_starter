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

beforeEach(() => clearGroundingCache());

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
});
