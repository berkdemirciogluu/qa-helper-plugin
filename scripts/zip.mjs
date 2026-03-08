import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
const zipName = `${pkg.name}-v${pkg.version}.zip`;
const distDir = resolve(__dirname, '../dist');

try {
  execSync(`cd "${distDir}" && npx bestzip "../${zipName}" ./*`, { stdio: 'inherit' });
  console.log(`\n✓ ${zipName} created successfully`);
} catch {
  // Fallback: use tar if bestzip is not available
  try {
    execSync(`cd "${distDir}" && tar -cf "../${zipName}" .`, { stdio: 'inherit' });
    console.log(`\n✓ ${zipName} created (tar fallback)`);
  } catch (err) {
    console.error('Failed to create ZIP. Install bestzip: npm i -g bestzip');
    process.exit(1);
  }
}
