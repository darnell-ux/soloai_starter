'use strict';

const seedHomepage = require('./seed-homepage');

const PUBLIC_READ_ACTIONS = [
	'api::landing-page.landing-page.find',
	'api::landing-page.landing-page.findOne',
	'api::feature.feature.find',
	'api::feature.feature.findOne',
	'api::faq.faq.find',
	'api::faq.faq.findOne'
];

function roleQuery(strapi) {
	if (strapi.db?.query) return strapi.db.query('plugin::users-permissions.role');
	return strapi.query('plugin::users-permissions.role');
}

function permissionQuery(strapi) {
	if (strapi.db?.query) return strapi.db.query('plugin::users-permissions.permission');
	return strapi.query('plugin::users-permissions.permission');
}

async function mergePublicReadPermissions(strapi) {
	const populate = { permissions: true };
	const publicRole = await roleQuery(strapi).findOne({
		where: { type: 'public' },
		populate
	});
	if (!publicRole) return;

	const found = await permissionQuery(strapi).findMany({
		where: { action: { $in: PUBLIC_READ_ACTIONS } }
	});
	if (!found.length) {
		strapi.log.warn(
			'[bootstrap] No matching users-permissions rows yet; run Strapi once after content-types sync, then restart.'
		);
		return;
	}

	const existingIds = new Set((publicRole.permissions || []).map((p) => p.id));
	for (const p of found) existingIds.add(p.id);
	const merged = [...existingIds];

	if (strapi.entityService) {
		await strapi.entityService.update('plugin::users-permissions.role', publicRole.id, {
			data: {
				permissions: {
					set: merged
				}
			}
		});
	} else {
		await roleQuery(strapi).update({
			where: { id: publicRole.id },
			data: {
				permissions: {
					set: merged
				}
			}
		});
	}
	strapi.log.info('[bootstrap] Public role: merged read-only permissions for landing-page, feature, faq.');
}

module.exports = {
	register() {},
	async bootstrap({ strapi }) {
		try {
			await mergePublicReadPermissions(strapi);
		} catch (e) {
			strapi.log.warn('[bootstrap] Public permission merge skipped:', e?.message || e);
		}
		try {
			await seedHomepage(strapi);
		} catch (e) {
			strapi.log.warn('[bootstrap] Homepage seed skipped:', e?.message || e);
		}
	}
};
