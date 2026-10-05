// Loads server/.env into process.env. This module is imported FIRST (before
// db.js and the routes) so that ES-module evaluation order guarantees the env
// is populated before any other module reads process.env at load time.
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  /* no .env file — fine, remote DB/integrations stay inactive until configured */
}
