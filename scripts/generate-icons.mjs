import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const svgPath = join(rootDir, 'public', 'icons', 'icon.svg');
const outDir = join(rootDir, 'public', 'icons');

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size, { fit: 'contain', background: { r: 5, g: 5, b: 5, alpha: 1 } })
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
}

await sharp(svg)
  .resize(410, 410, { fit: 'contain', background: { r: 5, g: 5, b: 5, alpha: 1 } })
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: { r: 5, g: 5, b: 5, alpha: 1 },
  })
  .png()
  .toFile(join(outDir, 'maskable-512.png'));

await sharp(join(outDir, 'icon-32.png')).toFile(join(rootDir, 'public', 'favicon.ico'));

console.log(`Generated ${sizes.length + 1} PWA icons in public/icons`);
