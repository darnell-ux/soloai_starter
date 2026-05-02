'use strict';

const OMIT = new Set(['createdAt', 'updatedAt', 'publishedAt']);
const PREFIXES = [/^\/api\/landing-pages/, /^\/api\/features/, /^\/api\/faqs/];

function omitMeta(attrs) {
	if (!attrs || typeof attrs !== 'object') return;
	for (const k of OMIT) {
		if (Object.prototype.hasOwnProperty.call(attrs, k)) delete attrs[k];
	}
}

function walk(node) {
	if (node == null) return;
	if (Array.isArray(node)) {
		for (const item of node) walk(item);
		return;
	}
	if (typeof node !== 'object') return;
	if (node.attributes && typeof node.attributes === 'object') omitMeta(node.attributes);
	if (node.data !== undefined) walk(node.data);
}

module.exports = () => {
	return async (ctx, next) => {
		await next();
		if (ctx.method !== 'GET') return;
		if (ctx.state.user) return;
		const path = ctx.path || '';
		if (!PREFIXES.some((re) => re.test(path))) return;
		const body = ctx.body;
		if (!body || typeof body !== 'object') return;
		if (Array.isArray(body.data)) {
			for (const row of body.data) walk(row);
		} else {
			walk(body.data);
		}
	};
};
