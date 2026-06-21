import type { PageServerLoad } from './$types';

// The home route is now the static TaxNexus landing (copy lives in Paraglide messages),
// so it no longer pulls the Strapi homepage bundle / features / FAQs.
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'private, max-age=60' });
	return {};
};
