import { cpSync, existsSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps/web/dist');
const dest = join(root, 'build');
const apiUrl =
  process.env.VITE_API_URL?.replace(/\/$/, '') ||
  'https://afc-management-api.onrender.com';

if (!existsSync(src)) {
  console.error('ERROR: apps/web/dist was not created by the web build.');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

const apiConfig = `window.__AGBMS_API_URL__=${JSON.stringify(apiUrl)};\n`;
writeFileSync(join(dest, 'api-config.js'), apiConfig);
writeFileSync(join(src, 'api-config.js'), apiConfig);

console.log(`Vercel output ready at ${dest}`);
console.log(`API URL configured as ${apiUrl}`);
