import sharp from 'sharp';
import { readdir, rename, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';

const INPUT_DIR  = './src/assets/hero';
const OUTPUT_DIR = './src/assets/hero';

const exts = ['.jpg', '.jpeg', '.png', '.webp'];

const files = (await readdir(INPUT_DIR))
  .filter(f => exts.includes(extname(f).toLowerCase()));

console.log(`\nSharpening ${files.length} hero images...\n`);

for (const file of files) {
  const inPath  = join(INPUT_DIR, file);
  const tmpPath = join(INPUT_DIR, '__tmp_' + basename(file, extname(file)) + '.jpg');
  const outPath = join(INPUT_DIR, basename(file, extname(file)) + '.jpg');

  await sharp(inPath)
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7, x1: 2, y2: 10, y3: 20 })
    .linear(1.06, -(255 * 0.06) / 2)
    .modulate({ brightness: 1.02, saturation: 1.10 })
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(tmpPath);

  // Erstatt originalfil med skjerpet versjon
  if (outPath !== inPath) {
    try { await unlink(outPath); } catch {}
  }
  await rename(tmpPath, outPath);

  console.log(`  ✓ ${file}`);
}

console.log('\nAlle hero-bilder er skjerpet og lagret.\n');
