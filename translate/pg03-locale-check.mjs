#!/usr/bin/env node
/**
 * PG03 locale verification (Solo AI–style translate/ hook; delegates to scripts/).
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
execFileSync(process.execPath, [join(projectRoot, 'scripts', 'verify-pg03-locale.mjs')], {
	stdio: 'inherit'
});
