/**
 * Rocky Ocean – Instagram Content Agent
 *
 * Single-post:
 *   node scripts/instagram-agent.mjs "beskrivelse"
 *   node scripts/instagram-agent.mjs --photo bilde.jpg
 *   node scripts/instagram-agent.mjs --photo bilde.HEIC "ekstra kontekst"
 *
 * Reel/Story:
 *   node scripts/instagram-agent.mjs --reel --photo clip-still.jpg "morgenseiling"
 *
 * Ukeplan (5-7 bilder/temaer):
 *   node scripts/instagram-agent.mjs --week src/assets/hero/*.jpg
 *
 * Etter kjøring:
 *   --copy casual-no    Kopier en valgt caption-variant til utklippstavle
 *                       (gyldige: casual-no | tech-no | asp-no | casual-en | tech-en | asp-en)
 *
 * Alle kjøringer lagres som markdown i instagram-drafts/
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { extname, resolve, basename } from 'path';
import { spawn } from 'child_process';
import heicConvert from 'heic-convert';
import { generateViewer } from './generate-draft-viewer.mjs';

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌  ANTHROPIC_API_KEY mangler. Legg den i .env\n');
  process.exit(1);
}

// ── CLI parsing ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes('--help')) {
  console.log(`
  🌊  Rocky Ocean – Instagram Agent

  ENKEL POST:
    node scripts/instagram-agent.mjs "beskrivelse"
    node scripts/instagram-agent.mjs --photo bilde.jpg
    node scripts/instagram-agent.mjs --photo bilde.HEIC "ekstra kontekst"

  REEL / STORY:
    node scripts/instagram-agent.mjs --reel --photo still.jpg "morgenseiling"

  UKEPLAN (5-7 bilder/temaer):
    node scripts/instagram-agent.mjs --week src/assets/hero/hero-01.jpg src/assets/hero/hero-02.jpg ...

  KOPIER VARIANT TIL UTKLIPPSTAVLE:
    --copy casual-no | tech-no | asp-no | casual-en | tech-en | asp-en

  Alle kjøringer lagres i instagram-drafts/
`);
  process.exit(0);
}

let mode = 'single'; // 'single' | 'reel' | 'week'
let description = '';
let photoPaths = [];
let copyVariant = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--reel') mode = 'reel';
  else if (a === '--week') {
    mode = 'week';
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) photoPaths.push(resolve(argv[++i]));
  } else if (a === '--photo') photoPaths.push(resolve(argv[++i]));
  else if (a === '--copy') copyVariant = argv[++i];
  else description = a;
}

for (const p of photoPaths) {
  if (!existsSync(p)) {
    console.error(`\n❌  Fant ikke bildet: ${p}\n`);
    process.exit(1);
  }
}

// ── Image loading (with HEIC auto-convert) ────────────────────────────────────
async function loadImageAsBase64(filePath) {
  const ext = extname(filePath).toLowerCase().replace('.', '');

  if (ext === 'heic' || ext === 'heif') {
    console.log(`   🔄 Konverterer HEIC → JPG: ${basename(filePath)}`);
    const buffer = await heicConvert({
      buffer: readFileSync(filePath),
      format: 'JPEG',
      quality: 0.9,
    });
    return { mediaType: 'image/jpeg', data: Buffer.from(buffer).toString('base64') };
  }

  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  const mediaType = mimeMap[ext];
  if (!mediaType) {
    console.error(`\n❌  Støttede formater: jpg, png, webp, gif, heic. Fikk: .${ext}\n`);
    process.exit(1);
  }
  return { mediaType, data: readFileSync(filePath).toString('base64') };
}

// ── System prompt (cached) ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du er Instagram-redaktøren for Rocky Ocean, en 36-fots Cruiser/Racer i Ålesund, Norge.

## Om båten
Rocky Ocean (NOR 11782) er en one-off 36-fots Cruiser/Racer tegnet og bygget av H. Aaslestad i 2005. Hun har deltatt i Shetland Race, 2 Star og Ferderseilasen. GPH 657.5, deplasement 7 295 kg, ORC Club Non-Spinnaker sertifikat. LOA 11.100 m, bredde 3.470 m, dybgang 2.117 m.

## Om eieren
Eieren er skipsingeniørstudent ved NTNU som bor om bord og bruker båten som bolig og kontor. Kjøpte båten sommeren 2025 i Bergen og seilte den til Ålesund.

## Visjon
Moderne Cruiser/Racer-uttrykk: baugspyd, nytt storseiltrekk og forseilstrekk i marineblå, sprayhood og sandblåste rekkestøtter. Minimalistisk, sikkert og klar for langtur.

## Stemme og tone
- Autentisk og personlig – livet om bord, ikke reklame
- Teknisk troverdighet uten å bli nerd-ete
- Skandinavisk enkelhet: kort, presist, med sjel
- Naturen og sjøen i sentrum

## Målgruppe
Seilere, båtentusiaster, friluftsentusiaster, skipsingeniør-studenter og drømmere.

Følg alltid den eksakte strukturen i brukerens forespørsel.`;

// ── Prompt builders ───────────────────────────────────────────────────────────
const SINGLE_INSTRUCTIONS = `Generer Instagram-innhold for dette øyeblikket. Bruk EKSAKT denne strukturen og overskriftene:

## NORSK – CASUAL
[2-4 linjer. Avslappet, personlig, som melding til en venn]

## NORSK – TEKNISK
[2-4 linjer. Båt-spesifikasjoner, seilprestasjon, eller arbeid som gjøres]

## NORSK – ASPIRATIONAL
[2-4 linjer. Stemningsfull, naturfokusert, drømmende]

## ENGLISH – CASUAL
[2-4 lines. Relaxed, personal]

## ENGLISH – TECHNICAL
[2-4 lines. Specs, performance, work]

## ENGLISH – ASPIRATIONAL
[2-4 lines. Atmospheric, dreamy]

## HASHTAGS
[12-18 hashtags, blanding norsk/engelsk + seilingsspesifikke. Separer med mellomrom]

## OPTIMAL POSTETIDSPUNKT
[Anbefal dag og klokkeslett, 1-2 setninger begrunnelse]`;

const REEL_INSTRUCTIONS = `Generer en Instagram Reel/Story basert på dette øyeblikket. Bruk EKSAKT denne strukturen:

## HOOK (første 1.5 sekund)
[Én slagkraftig setning på norsk som stopper scrollen]

## VOICEOVER-SCRIPT (15-30 sek)
[Komplett norsk voiceover med naturlige pauser markert med /]

## TEKST-OVERLAYS (timing)
[3-5 korte tekstbiter som vises på skjermen, med tidspunkt]
- 0:00 – [tekst]
- 0:05 – [tekst]
- ...

## CAPTION
[Norsk caption, 2-4 linjer + 1-2 linjer engelsk]

## HASHTAGS
[12-18 reel-optimerte hashtags]

## MUSIKK-FORSLAG
[2-3 stemnings-stikkord, f.eks. "lo-fi piano, oseanisk, rolig" – ingen spesifikke låter]

## OPTIMAL POSTETIDSPUNKT
[Dag og klokkeslett + begrunnelse for Reels spesifikt]`;

const WEEK_INSTRUCTIONS = (n) => `Du har fått ${n} bilder/temaer. Lag en komplett Instagram-ukeplan med ett innlegg per bilde. Bruk EKSAKT denne strukturen for HVERT innlegg:

## INNLEGG 1 — [kort tittel]
**Bilde:** [hvilket bilde dette refererer til – beskriv kort]
**Caption (norsk):**
[3-5 linjer]

**Caption (engelsk):**
[3-5 linjer]

**Hashtags:** [10-15 hashtags]
**Postetidspunkt:** [ukedag + klokkeslett + kort begrunnelse]
**Type:** [Feed | Reel | Carousel]

---

[Gjenta for hvert innlegg, nummerert 2, 3, ...]

## UKESAMMENHENG
[2-3 setninger om hvordan postene henger sammen som en helhet og bygger en fortelling gjennom uka]`;

// ── Build user message content ────────────────────────────────────────────────
async function buildUserContent() {
  const parts = [];

  for (const p of photoPaths) {
    const { mediaType, data } = await loadImageAsBase64(p);
    parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    parts.push({ type: 'text', text: `Bilde: ${basename(p)}` });
  }

  if (description) parts.push({ type: 'text', text: `Kontekst: ${description}` });

  if (mode === 'single') parts.push({ type: 'text', text: SINGLE_INSTRUCTIONS });
  else if (mode === 'reel') parts.push({ type: 'text', text: REEL_INSTRUCTIONS });
  else if (mode === 'week') parts.push({ type: 'text', text: WEEK_INSTRUCTIONS(photoPaths.length || 5) });

  return parts;
}

// ── Run ───────────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log('\n🌊  Rocky Ocean – Instagram Agent');
console.log('─'.repeat(52));
console.log(`📌  Modus: ${mode.toUpperCase()}`);
if (photoPaths.length) console.log(`📷  Bilder: ${photoPaths.map((p) => basename(p)).join(', ')}`);
if (description) console.log(`📝  Beskrivelse: ${description}`);
console.log('\n⏳  Genererer innhold...\n');

const userContent = await buildUserContent();

const stream = await client.messages.stream({
  model: 'claude-opus-4-7',
  max_tokens: mode === 'week' ? 4000 : 1800,
  system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: userContent }],
});

let fullText = '';
process.stdout.write('\n');
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
    fullText += chunk.delta.text;
  }
}

const finalMsg = await stream.finalMessage();

// ── Save to instagram-drafts/ ─────────────────────────────────────────────────
const draftsDir = 'instagram-drafts';
if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const slug = photoPaths.length
  ? basename(photoPaths[0], extname(photoPaths[0])).slice(0, 30)
  : (description.slice(0, 30) || 'post').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
const fileName = `${ts}_${mode}_${slug}.md`;
const filePath = `${draftsDir}/${fileName}`;

const header = `---
generated: ${new Date().toISOString()}
mode: ${mode}
photos: ${JSON.stringify(photoPaths.map((p) => basename(p)))}
description: ${JSON.stringify(description)}
input_tokens: ${finalMsg.usage.input_tokens}
output_tokens: ${finalMsg.usage.output_tokens}
cache_read: ${finalMsg.usage.cache_read_input_tokens ?? 0}
cache_create: ${finalMsg.usage.cache_creation_input_tokens ?? 0}
---

`;
writeFileSync(filePath, header + fullText);

// Auto-regenerate viewer
generateViewer();

// ── Optional clipboard copy ───────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    const clipboardy = (await import('clipboardy')).default;
    await clipboardy.write(text);
    return true;
  } catch {
    // Windows fallback: use built-in `clip`
    return new Promise((res) => {
      const proc = spawn('clip', [], { shell: true });
      proc.on('error', () => res(false));
      proc.on('close', (code) => res(code === 0));
      proc.stdin.write(text);
      proc.stdin.end();
    });
  }
}

if (copyVariant) {
  const headingMap = {
    'casual-no': 'NORSK – CASUAL',
    'tech-no': 'NORSK – TEKNISK',
    'asp-no': 'NORSK – ASPIRATIONAL',
    'casual-en': 'ENGLISH – CASUAL',
    'tech-en': 'ENGLISH – TECHNICAL',
    'asp-en': 'ENGLISH – ASPIRATIONAL',
  };
  const heading = headingMap[copyVariant];
  if (!heading) {
    console.error(`\n⚠️  Ukjent --copy variant: ${copyVariant}`);
    console.error(`    Gyldige: ${Object.keys(headingMap).join(', ')}\n`);
  } else {
    const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
    const match = fullText.match(re);
    if (match) {
      const captionText = match[1].trim();
      // Også finn hashtags og legg på
      const hashMatch = fullText.match(/##\s+HASHTAGS\s*\n([\s\S]*?)(?=\n##\s|$)/);
      const hashtags = hashMatch ? '\n\n' + hashMatch[1].trim() : '';
      const ok = await copyToClipboard(captionText + hashtags);
      if (ok) console.log(`\n\n📋  Kopiert "${heading}" + hashtags til utklippstavle!`);
      else console.log(`\n\n⚠️  Klarte ikke kopiere til utklippstavle.`);
    } else {
      console.log(`\n\n⚠️  Fant ikke seksjon "${heading}" i output.`);
    }
  }
}

// ── Footer ────────────────────────────────────────────────────────────────────
const u = finalMsg.usage;
const cost = (u.input_tokens * 5 + (u.cache_read_input_tokens ?? 0) * 0.5 + u.output_tokens * 25) / 1_000_000;
console.log('\n\n' + '─'.repeat(52));
console.log(`✅  Ferdig!`);
console.log(`   💾 Lagret: ${filePath}`);
console.log(`   🔢 Tokens: in=${u.input_tokens} (cached=${u.cache_read_input_tokens ?? 0}) out=${u.output_tokens}`);
console.log(`   💰 Estimert kostnad: $${cost.toFixed(4)}`);
console.log('─'.repeat(52) + '\n');
