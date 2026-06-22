import { cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps/web/dist');
const dest = join(root, 'build');

if (!existsSync(src)) {
  console.error('ERROR: apps/web/dist was not created by the web build.');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Vercel output ready at ${dest}`);
