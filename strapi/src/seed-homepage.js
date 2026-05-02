'use strict';

const fs = require('fs');
const path = require('path');

const LOCALE = 'en';

const LANDING = {
	title: 'Homepage',
	slug: 'homepage',
	heroTitle: 'Ship faster with a workflow you can trust',
	heroSubtitle: 'Start your free account',
	heroDescription:
		'<p>Bring product, billing, and customer touchpoints into one place. Solo AI helps your team move from idea to delivery with clear steps, sensible defaults, and room to grow.</p>',
	seo: {
		metaTitle: 'Solo AI — Ship faster with a workflow you can trust',
		metaDescription:
			'Unify product delivery workflows in one place. Clear steps, secure defaults, and integrations that help teams ship with confidence.',
		ogTitle: 'Solo AI — Ship faster with a workflow you can trust',
		ogDescription:
			'Bring product, billing, and customer touchpoints together. Sensible defaults and integrations for confident delivery.'
	},
	sections: [
		{
			heading: 'A clear value proposition',
			body: '<p>Reduce handoffs and rework by keeping decisions, assets, and next steps visible to everyone who needs them.</p>'
		},
		{
			heading: 'What teams tell us',
			body: '<p>Teams report smoother reviews and fewer surprises when workflows stay consistent from planning to release. Your mileage may vary.</p>'
		},
		{
			heading: 'Explore more',
			body: '<p><a href="/features">Browse features</a> or jump in and <a href="/signup">create an account</a>.</p>'
		}
	],
	primaryCta: {
		label: 'Create account',
		href: '/signup',
		variant: 'primary'
	}
};

const FEATURES = [
	{
		slug: 'workflow-clarity',
		priority: 10,
		category: 'core',
		name: 'Clarity from day one',
		shortDescription:
			'<p>See the next step before you need it—fewer stalls and cleaner handoffs across the team.</p>',
		longDescription:
			'<p>Structured stages keep ownership obvious so reviews stay short and releases stay predictable.</p>'
	},
	{
		slug: 'secure-defaults',
		priority: 20,
		category: 'security',
		name: 'Secure defaults',
		shortDescription:
			'<p>Start from safe baselines you can tighten as you grow—without slowing everyday work.</p>',
		longDescription:
			'<p>Role-aware access patterns help reduce accidental exposure while keeping collaborators productive.</p>'
	},
	{
		slug: 'stack-integrations',
		priority: 30,
		category: 'integrations',
		name: 'Plays well with your stack',
		shortDescription:
			'<p>Connect the tools you already use so context stays in one place instead of scattered tabs.</p>',
		longDescription:
			'<p>Bring signals from billing, support, and product into a single view for faster decisions.</p>'
	},
	{
		slug: 'signal-over-noise',
		priority: 40,
		category: 'advanced',
		name: 'Signal over noise',
		shortDescription:
			'<p>Focus on what changed and why—less digging through threads to understand status.</p>',
		longDescription:
			'<p>Lightweight summaries help leads and ICs align without another standing meeting.</p>'
	}
];

function seedDir() {
	return path.join(__dirname, '../seed-assets');
}

async function findUploadByName(strapi, name) {
	if (strapi.db?.query) {
		const rows = await strapi.db.query('plugin::upload.file').findMany({
			where: { name },
			limit: 1
		});
		return rows[0] ?? null;
	}
	if (strapi.query) {
		return strapi.query('plugin::upload.file').findOne({ where: { name } });
	}
	return null;
}

async function ensureUpload(strapi, fileName, alt) {
	const existing = await findUploadByName(strapi, fileName);
	if (existing?.id) return existing.id;

	const full = path.join(seedDir(), fileName);
	if (!fs.existsSync(full)) {
		strapi.log.warn(`[seed] missing file ${fileName}`);
		return null;
	}

	const stat = fs.statSync(full);
	const uploadService = strapi.plugin('upload')?.service('upload');
	if (!uploadService?.upload) {
		strapi.log.warn('[seed] upload plugin unavailable');
		return null;
	}

	try {
		const uploaded = await uploadService.upload({
			data: {
				fileInfo: {
					name: fileName,
					alternativeText: alt,
					caption: fileName
				}
			},
			files: {
				path: full,
				name: fileName,
				type: fileName.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream',
				size: stat.size
			}
		});
		const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
		return file?.id ?? null;
	} catch (e) {
		strapi.log.warn('[seed] upload failed:', e?.message || e);
		return null;
	}
}

function publishedPayload(data) {
	return { ...data, publishedAt: new Date().toISOString() };
}

async function upsertLanding(strapi, heroMediaId) {
	const uid = 'api::landing-page.landing-page';
	const data = publishedPayload({
		...LANDING,
		...(heroMediaId ? { heroMedia: heroMediaId } : {})
	});

	if (strapi.entityService) {
		const found = await strapi.entityService.findMany(uid, {
			filters: { slug: { $eq: 'homepage' } },
			locale: LOCALE,
			publicationState: 'preview'
		});
		const row = Array.isArray(found) ? found[0] : null;
		if (row?.id) {
			await strapi.entityService.update(uid, row.id, { data, locale: LOCALE });
			strapi.log.info('[seed] updated landing-page homepage');
			return;
		}
		await strapi.entityService.create(uid, { data, locale: LOCALE });
		strapi.log.info('[seed] created landing-page homepage');
		return;
	}

	if (strapi.db?.query) {
		try {
			const existing = await strapi.db.query(uid).findOne({
				where: { slug: 'homepage', locale: LOCALE }
			});
			if (existing?.id) {
				await strapi.db.query(uid).update({
					where: { id: existing.id },
					data
				});
				strapi.log.info('[seed] updated landing-page homepage (db)');
				return;
			}
			await strapi.db.query(uid).create({ data: { ...data, locale: LOCALE } });
			strapi.log.info('[seed] created landing-page homepage (db)');
			return;
		} catch (e) {
			strapi.log.warn('[seed] landing db upsert failed:', e?.message || e);
			return;
		}
	}

	strapi.log.warn('[seed] cannot upsert landing-page: no entityService/db.query');
}

async function upsertFeatures(strapi, iconId) {
	const uid = 'api::feature.feature';

	for (const f of FEATURES) {
		const data = publishedPayload({
			name: f.name,
			slug: f.slug,
			shortDescription: f.shortDescription,
			longDescription: f.longDescription,
			category: f.category,
			priority: f.priority,
			...(iconId ? { icon: iconId } : {})
		});

		if (strapi.entityService) {
			const found = await strapi.entityService.findMany(uid, {
				filters: { slug: { $eq: f.slug } },
				locale: LOCALE,
				publicationState: 'preview'
			});
			const row = Array.isArray(found) ? found[0] : null;
			if (row?.id) {
				await strapi.entityService.update(uid, row.id, { data, locale: LOCALE });
			} else {
				await strapi.entityService.create(uid, { data, locale: LOCALE });
			}
			continue;
		}

		if (strapi.db?.query) {
			try {
				const existing = await strapi.db.query(uid).findOne({
					where: { slug: f.slug, locale: LOCALE }
				});
				if (existing?.id) {
					await strapi.db.query(uid).update({ where: { id: existing.id }, data });
				} else {
					await strapi.db.query(uid).create({ data: { ...data, locale: LOCALE } });
				}
			} catch (e) {
				strapi.log.warn(`[seed] feature ${f.slug} db upsert failed:`, e?.message || e);
			}
		}
	}
	strapi.log.info('[seed] upserted feature entries');
}

module.exports = async function seedHomepage(strapi) {
	const heroId = await ensureUpload(strapi, 'seed-hero.svg', 'Abstract gradient hero illustration');
	const iconId = await ensureUpload(strapi, 'seed-feature-icon.svg', 'Feature icon');
	await upsertLanding(strapi, heroId);
	await upsertFeatures(strapi, iconId);
};
