import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '../src/assets/images/hero-texture.webp');
const width = 512;
const height = 512;
const buffer = Buffer.alloc(width * height * 3);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 3;
    const vein =
      Math.sin(x * 0.018 + y * 0.011) * 6 +
      Math.sin(x * 0.007 - y * 0.014) * 4;
    const silk = Math.sin((x + y) * 0.04) * 2;
    const value = Math.max(4, Math.min(22, 10 + vein + silk + (Math.random() - 0.5) * 3));
    buffer[index] = value;
    buffer[index + 1] = value;
    buffer[index + 2] = value;
  }
}

const webp = await sharp(buffer, {
  raw: { width, height, channels: 3 },
})
  .webp({ quality: 72, effort: 4 })
  .toBuffer();

writeFileSync(outputPath, webp);
console.log(`Created ${outputPath} (${(webp.length / 1024).toFixed(1)} KB)`);
