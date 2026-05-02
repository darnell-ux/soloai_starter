import 'dotenv/config';
import { validateEnvOrExit } from '../src/lib/server/env';

validateEnvOrExit();
process.exit(0);
