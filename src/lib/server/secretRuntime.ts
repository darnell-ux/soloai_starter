/**
 * Isolated runtime environment — no cross-environment fallback chains.
 * development, test, and production each use separate secret material (separate .env / vault / CI scopes).
 */

import { getEnv } from './env';

export type IsolatedRuntime = 'development' | 'test' | 'production';

export function getIsolatedRuntimeEnvironment(): IsolatedRuntime {
	return getEnv().NODE_ENV;
}
