/**
 * Generates instagram-drafts/index.html from all .md draft files.
 * Called automatically by instagram-agent.mjs after each run.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const DRAFTS_DIR = 'instagram-drafts';

export function generateViewer() {
  if (!existsSync(DRAFTS_DIR)) return;

  const files = readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // newest first

  const posts = files.map(f => parseDraft(join(DRAFTS_DIR, f), f));

  const html = buildHTML(posts);
  writeFileSync(join(DRAFTS_DIR, 'index.html'), html);
}

function parseDraft(filePath, fileName) {
  const raw = readFileSync(filePath, 'utf-8');

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let meta = {};
  let body = raw;

  if (fmMatch) {
    body = fmMatch[2];
    for (const line of fmMatch[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) meta[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }

  // Parse sections
  const sections = {};
  const sectionRe = /##\s+(.+?)\s*\n([\s\S]*?)(?=\n##\s|$)/g;
  let m;
  while ((m = sectionRe.exec(body)) !== null) {
    sections[m[1].trim()] = m[2].trim();
  }

  // Parse timestamp from filename: 2026-04-26T01-36-26_single_hero-main.md
  const tsMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})_(\w+)_(.+)\.md$/);
  const date = tsMatch ? `${tsMatch[1]} ${tsMatch[2].replace(/-/g, ':')}` : fileName;
  const mode = tsMatch ? tsMatch[3] : 'single';
  const slug = tsMatch ? tsMatch[4] : fileName;

  return { fileName, date, mode, slug, meta, sections };
}

function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function captionCard(key, label, emoji, content) {
  if (!content) return '';
  return `
    <div class="caption-card" data-key="${esc(key)}">
      <div class="caption-header">
        <span class="caption-label">${emoji} ${esc(label)}</span>
        <button class="copy-btn" onclick="copyText(this, '${esc(key)}')">Kopier</button>
      </div>
      <p class="caption-text" id="${esc(key)}">${esc(content)}</p>
    </div>`;
}

function buildHTML(posts) {
  const postItems = posts.map((p, i) => {
    const modeEmoji = { single: '📸', reel: '🎬', week: '🗓️' }[p.mode] || '📸';
    return `<li class="post-item ${i === 0 ? 'active' : ''}" onclick="showPost(${i})" id="item-${i}">
      <span class="post-emoji">${modeEmoji}</span>
      <div class="post-meta">
        <span class="post-slug">${esc(p.slug)}</span>
        <span class="post-date">${esc(p.date)}</span>
      </div>
    </li>`;
  }).join('\n');

  const postPanels = posts.map((p, i) => {
    const s = p.sections;
    const hashtags = s['HASHTAGS'] || s['HASHTAGS '] || '';
    const timing = s['OPTIMAL POSTETIDSPUNKT'] || '';
    const modeLabel = { single: 'Post', reel: 'Reel / Story', week: 'Ukeplan' }[p.mode] || p.mode;

    const captions = p.mode === 'single' || p.mode === 'reel' ? `
      <div class="captions-grid">
        ${captionCard(`${i}-casual-no`, 'Norsk – Casual', '🇳🇴', s['NORSK – CASUAL'])}
        ${captionCard(`${i}-tech-no`, 'Norsk – Teknisk', '⚙️', s['NORSK – TEKNISK'])}
        ${captionCard(`${i}-asp-no`, 'Norsk – Aspirational', '🌊', s['NORSK – ASPIRATIONAL'])}
        ${captionCard(`${i}-casual-en`, 'English – Casual', '🇬🇧', s['ENGLISH – CASUAL'])}
        ${captionCard(`${i}-tech-en`, 'English – Technical', '⚙️', s['ENGLISH – TECHNICAL'])}
        ${captionCard(`${i}-asp-en`, 'English – Aspirational', '🌊', s['ENGLISH – ASPIRATIONAL'])}
      </div>` : `<div class="week-body"><pre>${esc(Object.entries(s).map(([k,v]) => `## ${k}\n${v}`).join('\n\n'))}</pre></div>`;

    const reelSections = p.mode === 'reel' ? `
      <div class="reel-extras">
        ${s['HOOK (første 1.5 sekund)'] ? `<div class="reel-block"><h3>🎯 Hook</h3><p>${esc(s['HOOK (første 1.5 sekund)'])}</p></div>` : ''}
        ${s['VOICEOVER-SCRIPT (15-30 sek)'] ? `<div class="reel-block"><h3>🎙️ Voiceover</h3><p>${esc(s['VOICEOVER-SCRIPT (15-30 sek)'])}</p></div>` : ''}
        ${s['TEKST-OVERLAYS (timing)'] ? `<div class="reel-block"><h3>📝 Tekst-overlays</h3><p>${esc(s['TEKST-OVERLAYS (timing)'])}</p></div>` : ''}
        ${s['MUSIKK-FORSLAG'] ? `<div class="reel-block"><h3>🎵 Musikk</h3><p>${esc(s['MUSIKK-FORSLAG'])}</p></div>` : ''}
      </div>` : '';

    return `<div class="post-panel ${i === 0 ? 'active' : ''}" id="panel-${i}">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">${esc(p.slug.replace(/-/g, ' '))}</h2>
          <span class="panel-badge">${modeLabel}</span>
          <span class="panel-date">${esc(p.date)}</span>
        </div>
        <div class="panel-stats">
          <span title="Input tokens">in: ${esc(p.meta.input_tokens || '–')}</span>
          <span title="Output tokens">out: ${esc(p.meta.output_tokens || '–')}</span>
          <span title="Cached tokens">⚡ ${esc(p.meta.cache_read || '0')}</span>
        </div>
      </div>

      ${reelSections}
      ${captions}

      ${hashtags ? `<div class="hashtags-block">
        <div class="caption-header">
          <span class="caption-label"># Hashtags</span>
          <button class="copy-btn" onclick="copyText(this, '${i}-hashtags')">Kopier</button>
        </div>
        <p class="hashtags-text" id="${i}-hashtags">${esc(hashtags)}</p>
      </div>` : ''}

      ${timing ? `<div class="timing-block">
        <span class="timing-label">🕐 Postetidspunkt</span>
        <p>${esc(timing)}</p>
      </div>` : ''}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rocky Ocean – Instagram Drafts</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #f0f2f5;
      color: #1a2332;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      background: #1a2332;
      color: #fff;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }
    .header h1 { font-size: 1rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    .header-sub { font-size: 0.75rem; color: rgba(255,255,255,0.45); margin-left: auto; }

    /* ── Layout ── */
    .app { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px;
      background: #fff;
      border-right: 1px solid #e2e5ea;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar-title {
      padding: 0.85rem 1rem;
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #8892a0;
      border-bottom: 1px solid #e2e5ea;
    }
    .post-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f0f2f5;
      transition: background 0.15s;
    }
    .post-item:hover { background: #f7f8fa; }
    .post-item.active { background: #eef4fb; border-left: 3px solid #2b7fcc; }
    .post-emoji { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
    .post-meta { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
    .post-slug { font-size: 0.78rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .post-date { font-size: 0.65rem; color: #8892a0; }

    /* ── Main panel ── */
    .main { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .post-panel { display: none; }
    .post-panel.active { display: block; }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e5ea;
    }
    .panel-title { font-size: 1.2rem; font-weight: 700; text-transform: capitalize; margin-bottom: 0.35rem; }
    .panel-badge {
      display: inline-block;
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: #2b7fcc;
      color: #fff;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      margin-right: 0.5rem;
    }
    .panel-date { font-size: 0.72rem; color: #8892a0; }
    .panel-stats { font-size: 0.68rem; color: #8892a0; display: flex; gap: 0.75rem; }

    /* ── Caption cards ── */
    .captions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      margin-bottom: 1rem;
    }
    .caption-card {
      background: #fff;
      border: 1px solid #e2e5ea;
      border-radius: 6px;
      padding: 0.9rem 1rem;
    }
    .caption-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .caption-label { font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: #8892a0; font-weight: 600; }
    .caption-text { font-size: 0.88rem; line-height: 1.65; white-space: pre-wrap; }

    .copy-btn {
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: none;
      border: 1px solid #d0d5dd;
      border-radius: 3px;
      padding: 0.2rem 0.55rem;
      cursor: pointer;
      color: #475467;
      transition: background 0.15s, color 0.15s;
    }
    .copy-btn:hover { background: #2b7fcc; color: #fff; border-color: #2b7fcc; }
    .copy-btn.copied { background: #16a34a; color: #fff; border-color: #16a34a; }

    /* ── Hashtags ── */
    .hashtags-block {
      background: #fff;
      border: 1px solid #e2e5ea;
      border-radius: 6px;
      padding: 0.9rem 1rem;
      margin-bottom: 1rem;
    }
    .hashtags-text { font-size: 0.82rem; color: #2b7fcc; line-height: 1.8; white-space: pre-wrap; }

    /* ── Timing ── */
    .timing-block {
      background: #fff8ed;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 0.9rem 1rem;
    }
    .timing-label { font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: #92400e; font-weight: 600; display: block; margin-bottom: 0.4rem; }
    .timing-block p { font-size: 0.85rem; line-height: 1.6; }

    /* ── Reel extras ── */
    .reel-extras { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .reel-block { background: #fff; border: 1px solid #e2e5ea; border-radius: 6px; padding: 0.9rem 1rem; }
    .reel-block h3 { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #8892a0; margin-bottom: 0.5rem; }
    .reel-block p { font-size: 0.85rem; line-height: 1.65; white-space: pre-wrap; }

    /* ── Week body ── */
    .week-body pre { font-size: 0.82rem; line-height: 1.7; white-space: pre-wrap; background: #fff; border: 1px solid #e2e5ea; border-radius: 6px; padding: 1rem; }

    /* ── Empty state ── */
    .empty { text-align: center; padding: 4rem 2rem; color: #8892a0; }
    .empty h2 { font-size: 1.1rem; margin-bottom: 0.5rem; }

    @media (max-width: 700px) {
      .sidebar { width: 180px; }
      .captions-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span>🌊</span>
    <h1>Rocky Ocean — Instagram Drafts</h1>
    <span class="header-sub">${posts.length} poster • oppdatert ${new Date().toLocaleString('no-NO')}</span>
  </div>

  <div class="app">
    <nav class="sidebar">
      <div class="sidebar-title">Alle poster</div>
      <ul style="list-style:none">
        ${posts.length ? postItems : '<li style="padding:1rem;font-size:.8rem;color:#8892a0">Ingen drafts enda</li>'}
      </ul>
    </nav>

    <main class="main">
      ${posts.length ? postPanels : `<div class="empty"><h2>Ingen drafts enda</h2><p>Kjør agenten for å generere ditt første innlegg.</p></div>`}
    </main>
  </div>

  <script>
    function showPost(index) {
      document.querySelectorAll('.post-item').forEach((el, i) => el.classList.toggle('active', i === index));
      document.querySelectorAll('.post-panel').forEach((el, i) => el.classList.toggle('active', i === index));
    }

    async function copyText(btn, id) {
      const el = document.getElementById(id);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = el.textContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = '✓ Kopiert!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Kopier'; btn.classList.remove('copied'); }, 2000);
    }
  </script>
</body>
</html>`;
}

// Run directly if called as script
if (process.argv[1].includes('generate-draft-viewer')) {
  generateViewer();
  console.log('✅  Viewer oppdatert: instagram-drafts/index.html');
}
