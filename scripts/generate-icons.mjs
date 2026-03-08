import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, 'icon.svg'));
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const outPath = join(__dirname, `../public/icons/icon-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`✓ icon-${size}.png`);
}
console.log('Icons generated!');
