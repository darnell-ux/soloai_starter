import type { PageServerLoad } from './$types';
import { FTB_CONSTANTS, FACTOR_THRESHOLD_STAMP } from '$lib/server/taxnexus/ftb-constants';

// Surface the indexed factor-presence figure + its vintage stamp to the page so
// the hint under the sales input is DERIVED from the single source of truth
// (ftb-constants.ts) and can never drift from the value the engine evaluates.
export const load: PageServerLoad = () => ({
	salesThreshold: FTB_CONSTANTS.SALES_THRESHOLD,
	factorStamp: FACTOR_THRESHOLD_STAMP
});
