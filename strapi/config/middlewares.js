/**
 * CORS: tighten `origin` in production (replace localhost with your app URL).
 * Rate limiting: use reverse proxy (nginx/cloudflare) or Strapi middleware plugin when needed.
 */
module.exports = [
	'strapi::logger',
	'strapi::errors',
	'strapi::security',
	{
		name: 'strapi::cors',
		config: {
			enabled: true,
			origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
			headers: ['Content-Type', 'Authorization', 'Origin', 'Accept']
		}
	},
	'strapi::poweredBy',
	'strapi::query',
	'strapi::body',
	'strapi::session',
	'strapi::favicon',
	'strapi::public',
	'global::public-sanitize'
];
