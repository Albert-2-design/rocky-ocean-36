import { cp, mkdir, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

const label = process.argv[2] || 'snapshot';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const name = `${timestamp}_${label.replace(/\s+/g, '-')}`;
const dest = join('snapshots', name);

console.log(`\n📸 Saving snapshot: ${name}\n`);

// Copy src/ and public/ into the snapshot folder
await mkdir(dest, { recursive: true });
await cp('src', join(dest, 'src'), { recursive: true });
await cp('public', join(dest, 'public'), { recursive: true }).catch(() => {});

// Save a small manifest
const manifest = {
  name,
  label,
  savedAt: new Date().toISOString(),
  files: ['src/', 'public/'],
};
await writeFile(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));

// List all saved snapshots
const all = (await readdir('snapshots')).filter(f => f !== '.gitkeep');
console.log('✅ Saved!\n');
console.log('All snapshots:');
all.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log('');
