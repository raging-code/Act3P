#!/usr/bin/env node
/**
 * apply-split-screen-redesign.mjs
 * ---------------------------------------------------------------
 * Perimeter — "Split-Screen Duel" redesign patch.
 *
 * Applies the chosen Option 1 (Split-Screen Duel) design + layout to:
 *   - templates/menu.html      -> full structural rewrite (two full-height
 *                                  panels meeting at a seam, "OR" badge)
 *   - templates/camera.html    -> Fig. 3.1, restyled to match (green side),
 *                                  header markup patched, IDs untouched
 *   - templates/buzzer.html    -> Fig. 3.3, restyled to match (violet side),
 *                                  header markup patched, IDs untouched
 *   - static/style.css         -> :root tokens + shell/panel rules
 *                                  repointed to the new visual language
 *   - static/style-split.css   -> NEW file, additional split-screen-only
 *                                  rules (seam badges, panel accents)
 *
 * Design source: "Split-Screen Duel" concept (perimeter-layout-concepts-v2,
 * Layout A) — the site is no longer a centered-title + card-grid menu with
 * frosted glass blobs. It is now two full-bleed vertical panels divided by
 * a literal seam, and the two dashboards inherit the same green/violet
 * side identity so Fig. 3.1 and Fig. 3.3 read as continuations of whichever
 * half the user picked.
 *
 * SAFE TO RE-RUN: every write is idempotent. A timestamped backup of every
 * file this script touches is made before any change.
 *
 * Usage:
 *   node apply-split-screen-redesign.mjs            (run from repo root)
 *   node apply-split-screen-redesign.mjs --root ./ACT3embedd
 *   node apply-split-screen-redesign.mjs --dry-run   (show what would change)
 * ---------------------------------------------------------------
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rootFlagIdx = args.indexOf("--root");
const ROOT = path.resolve(
  rootFlagIdx !== -1 && args[rootFlagIdx + 1] ? args[rootFlagIdx + 1] : __dirname
);

const P = {
  menuHtml: path.join(ROOT, "templates", "menu.html"),
  cameraHtml: path.join(ROOT, "templates", "camera.html"),
  buzzerHtml: path.join(ROOT, "templates", "buzzer.html"),
  styleCss: path.join(ROOT, "static", "style.css"),
  splitCss: path.join(ROOT, "static", "style-split.css"),
  backupDir: path.join(
    ROOT,
    "backup",
    new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  ),
};

const log = (...a) => console.log("[split-screen]", ...a);
const warn = (...a) => console.warn("[split-screen][warn]", ...a);

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function backup(filePath) {
  if (!(await exists(filePath))) return;
  await fs.mkdir(P.backupDir, { recursive: true });
  const rel = path.relative(ROOT, filePath);
  const dest = path.join(P.backupDir, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(filePath, dest);
  log(`backed up ${rel}`);
}

async function writeFile(filePath, content) {
  if (dryRun) {
    log(`(dry-run) would write ${path.relative(ROOT, filePath)} (${content.length} bytes)`);
    return;
  }
  await backup(filePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  log(`wrote ${path.relative(ROOT, filePath)}`);
}

/* Idempotent str_replace: no-ops (with a warning) if the anchor text is
   already gone, throws only if the target file itself is missing. */
function replaceOnce(source, oldStr, newStr, label) {
  const idx = source.indexOf(oldStr);
  if (idx === -1) {
    warn(`anchor not found, skipping "${label}" (already patched, or upstream file changed)`);
    return source;
  }
  return source.slice(0, idx) + newStr + source.slice(idx + oldStr.length);
}

/* =================================================================
   1. templates/menu.html  — full structural rewrite
   ================================================================= */

const MENU_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Perimeter — Choose Activity</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
<link rel="stylesheet" href="/static/style-split.css">
</head>
<body class="split-body">

<div class="split-screen">

  <a class="split-half split-half--left" href="/camera">
    <div class="split-top">
      <span class="split-fig">FIG. 3.1</span>
      <div class="split-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/>
          <path d="M18 11l4-3v9l-4-3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          <circle cx="10" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/>
        </svg>
      </div>
      <h2 class="split-title">Camera<br>Watch</h2>
      <p class="split-desc">Live webcam stream, motion-triggered snapshots, and a full event log with arm / disarm control.</p>
      <div class="split-stats">
        <div><span>Sensor</span><b>PIR</b></div>
        <div><span>Status</span><b>Armed</b></div>
      </div>
    </div>
    <span class="split-cta">Enter camera watch <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </a>

  <a class="split-half split-half--right" href="/buzzer">
    <div class="split-top">
      <span class="split-fig">FIG. 3.3</span>
      <div class="split-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M7 12a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="1.8" fill="currentColor"/>
        </svg>
      </div>
      <h2 class="split-title">Buzzer +<br>Graph</h2>
      <p class="split-desc">Active buzzer alert, a live sensor-reading graph, and 5-second motion recordings.</p>
      <div class="split-stats">
        <div><span>Cooldown</span><b>5s</b></div>
        <div><span>Log</span><b>100 evt</b></div>
      </div>
    </div>
    <span class="split-cta">Enter buzzer + graph <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </a>

  <div class="split-seam" aria-hidden="true"></div>
  <div class="split-seam-badge" aria-hidden="true">OR</div>

</div>

</body>
</html>
`;

/* =================================================================
   2. static/style-split.css  — new stylesheet, split-screen shell
      + the shared side-accent system Fig 3.1 / Fig 3.3 plug into.
   ================================================================= */

const SPLIT_CSS = `/* ==========================================================================
   Perimeter — "Split-Screen Duel" layer
   Loaded after style.css. Overrides the menu shell entirely and adds a
   thin "which side are you on" accent strip to the two dashboards so
   Fig. 3.1 (green) and Fig. 3.3 (violet) read as continuations of the
   half the user picked on the menu, rather than two disconnected pages.
   ========================================================================== */

:root {
  --split-left:      #7de3a8;
  --split-left-dim:  rgba(125, 227, 168, 0.14);
  --split-right:     #c993e8;
  --split-right-dim: rgba(201, 147, 232, 0.14);
  --split-font:      'Bricolage Grotesque', var(--grot, sans-serif);
  --split-mono:      'JetBrains Mono', var(--mono, monospace);
}

/* ---------- menu: full split-screen shell ---------- */

html, body.split-body {
  margin: 0;
  min-height: 100vh;
  background: #0d0d0e;
}

.split-screen {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  min-height: 100vh;
}

.split-half {
  flex: 1 1 480px;
  min-height: 50vh;
  padding: 64px 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-decoration: none;
  color: var(--text, #eee);
  font-family: var(--split-font);
  position: relative;
  transition: flex-grow 0.35s ease, background 0.35s ease;
}
.split-half:hover { flex-grow: 1.08; }

.split-half--left  { background: #0f1a14; }
.split-half--right { background: #150f18; }
.split-half--left:hover  { background: #12201a; }
.split-half--right:hover { background: #19121d; }

.split-fig {
  font-family: var(--split-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
}
.split-half--left  .split-fig { color: var(--split-left); }
.split-half--right .split-fig { color: var(--split-right); }

.split-icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 22px 0 26px;
}
.split-half--left  .split-icon { background: var(--split-left-dim);  color: var(--split-left); }
.split-half--right .split-icon { background: var(--split-right-dim); color: var(--split-right); }

.split-title {
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 700;
  line-height: 1.05;
  margin: 0 0 14px;
}

.split-desc {
  font-size: 14px;
  line-height: 1.7;
  max-width: 340px;
  margin: 0;
  opacity: 0.72;
}

.split-stats {
  display: flex;
  gap: 24px;
  margin-top: 30px;
}
.split-stats div {
  font-family: var(--split-mono);
  font-size: 11px;
  opacity: 0.55;
}
.split-stats b {
  display: block;
  font-size: 17px;
  font-family: var(--split-font);
  opacity: 1;
  margin-top: 2px;
}

.split-cta {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--split-mono);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  padding: 13px 20px;
  border-radius: 999px;
  border: 1px solid;
  margin-top: 36px;
}
.split-half--left  .split-cta { border-color: rgba(125,227,168,0.4); }
.split-half--right .split-cta { border-color: rgba(201,147,232,0.4); }
.split-half:hover .split-cta { background: rgba(255,255,255,0.04); }

.split-seam {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.25), transparent);
  pointer-events: none;
}
.split-seam-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #0d0d0e;
  border: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--split-mono);
  font-size: 11px;
  color: #888;
  z-index: 3;
  pointer-events: none;
}

@media (max-width: 700px) {
  .split-seam { left: 0; right: 0; top: 50%; bottom: auto; width: auto; height: 1px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent); }
  .split-seam-badge { top: 50%; left: 50%; }
  .split-half { padding: 48px 28px; }
}

/* ---------- dashboards: side-identity accent strip ----------
   Fig. 3.1 (camera) and Fig. 3.3 (buzzer) each get a 3px top accent
   in their half's color, plus the same accent tinting the arm-toggle
   and pulse dot, so the dashboard feels like "the other side of the
   door" you just walked through on the menu. Structural IDs the JS
   depends on (armToggle, liveFrame, logList, etc.) are untouched —
   this file only adds paint, never changes markup contracts. */

body[data-split-side] .console {
  position: relative;
}
body[data-split-side] .console::before {
  content: "";
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  z-index: 5;
}
body[data-split-side="left"] .console::before { background: var(--split-left); }
body[data-split-side="right"] .console::before { background: var(--split-right); }

body[data-split-side="left"] .bar-sub,
body[data-split-side="left"] #pulse-dot { color: var(--split-left); }
body[data-split-side="right"] .bar-sub,
body[data-split-side="right"] #pulse-dot { color: var(--split-right); }

body[data-split-side="left"] #pulse-dot {
  background: var(--split-left) !important;
  box-shadow: 0 0 0 4px var(--split-left-dim), 0 0 10px 1px var(--split-left) !important;
}
body[data-split-side="right"] #pulse-dot {
  background: var(--split-right) !important;
  box-shadow: 0 0 0 4px var(--split-right-dim), 0 0 10px 1px var(--split-right) !important;
}

body[data-split-side="left"] .arm-toggle[data-armed="true"] {
  background: linear-gradient(155deg, rgba(125,227,168,0.85), rgba(125,227,168,0.45));
}
body[data-split-side="right"] .arm-toggle[data-armed="true"] {
  background: linear-gradient(155deg, rgba(201,147,232,0.85), rgba(201,147,232,0.45));
}

body[data-split-side="left"] .back-link:hover { color: var(--split-left); }
body[data-split-side="right"] .back-link:hover { color: var(--split-right); }
`;

/* =================================================================
   3. static/style.css — repoint :root tokens + shell rules so the
      whole app (blobs, glass fills, bar, grid) reads flatter and
      matches the split-screen language instead of the old sky-blue
      obsidian glass. Small, targeted replacements only — every
      selector the JS toggles (.on, .open, .hot, .fail, .ok,
      .sounding, .has-image, .grabbing) is left completely alone.
   ================================================================= */

function patchStyleCss(css) {
  let out = css;

  out = replaceOnce(
    out,
    `  --panel:      rgba(255,255,255,0.10);
  --panel-2:    rgba(255,255,255,0.06);
  --edge:       rgba(255,255,255,0.22);
  --edge-soft:  rgba(255,255,255,0.14);

  --text:       #F1F2F4;
  --text-dim:   #A7ACB5;
  --text-faint: #6B7078;

  --signal:     #5FB0F0;   /* sky blue — motion / live / accent */
  --signal-dim: rgba(95, 176, 240, 0.18);
  --signal-glow:rgba(95, 176, 240, 0.45);
  --ok:         #6FE3BE;   /* muted mint — system nominal */
  --ok-dim:     rgba(111, 227, 190, 0.18);
  --off:        #E08585;   /* muted red — offline/disarmed */
  --off-dim:    rgba(224, 133, 133, 0.18);

  --radius-s: 10px;
  --radius-m: 18px;

  --mono: 'Geist Mono', ui-monospace, monospace;
  --grot: 'Outfit', system-ui, sans-serif;
}`,
    `  --panel:      rgba(255,255,255,0.06);
  --panel-2:    rgba(255,255,255,0.04);
  --edge:       rgba(255,255,255,0.14);
  --edge-soft:  rgba(255,255,255,0.10);

  --text:       #F1F2F4;
  --text-dim:   #A7ACB5;
  --text-faint: #6B7078;

  --signal:     #7DE3A8;   /* split-left green — motion / live / accent */
  --signal-dim: rgba(125, 227, 168, 0.16);
  --signal-glow:rgba(125, 227, 168, 0.45);
  --ok:         #7DE3A8;   /* system nominal, shares the left-side green */
  --ok-dim:     rgba(125, 227, 168, 0.16);
  --off:        #E08585;   /* muted red — offline/disarmed */
  --off-dim:    rgba(224, 133, 133, 0.18);

  --radius-s: 10px;
  --radius-m: 16px;

  --mono: 'JetBrains Mono', ui-monospace, monospace;
  --grot: 'Bricolage Grotesque', system-ui, sans-serif;
}`,
    "root tokens"
  );

  out = replaceOnce(
    out,
    `.blob-a { width: 560px; height: 560px; top: -180px; left: -140px;
  background: radial-gradient(circle, #4C4F55 0%, transparent 72%); opacity: 0.8; }
.blob-b { width: 620px; height: 620px; bottom: -220px; right: -160px;
  background: radial-gradient(circle, #3A3D42 0%, transparent 70%); opacity: 0.85; }
.blob-c { width: 460px; height: 460px; top: 30%; left: 55%;
  background: radial-gradient(circle, #55585F 0%, transparent 72%); opacity: 0.55; }
.blob-d { width: 380px; height: 380px; top: 5%; right: 8%;
  background: radial-gradient(circle, #2A2C30 0%, transparent 72%); opacity: 0.6; }
.blob-e { width: 420px; height: 420px; bottom: 10%; left: 8%;
  background: radial-gradient(circle, #45474D 0%, transparent 72%); opacity: 0.5; }`,
    `.blob-a { width: 560px; height: 560px; top: -180px; left: -140px;
  background: radial-gradient(circle, #16221c 0%, transparent 72%); opacity: 0.7; }
.blob-b { width: 620px; height: 620px; bottom: -220px; right: -160px;
  background: radial-gradient(circle, #1a1420 0%, transparent 70%); opacity: 0.75; }
.blob-c { width: 460px; height: 460px; top: 30%; left: 55%;
  background: radial-gradient(circle, #14201a 0%, transparent 72%); opacity: 0.4; }
.blob-d { width: 380px; height: 380px; top: 5%; right: 8%;
  background: radial-gradient(circle, #1c1420 0%, transparent 72%); opacity: 0.5; }
.blob-e { width: 420px; height: 420px; bottom: 10%; left: 8%;
  background: radial-gradient(circle, #131f19 0%, transparent 72%); opacity: 0.4; }`,
    "ambient blobs"
  );

  out = replaceOnce(
    out,
    `  background:
    linear-gradient(160deg,
      #3A3D42 0%,
      #2C2E33 14%,
      #202226 28%,
      #17181B 42%,
      #0E0F11 55%,
      #191A1D 68%,
      #26282C 80%,
      #313336 92%,
      #3A3D42 100%);
  background-attachment: fixed;
}`,
    `  background:
    linear-gradient(160deg,
      #10151f 0%,
      #0d1119 20%,
      #0a0c10 45%,
      #0a0c10 55%,
      #100d19 80%,
      #10151f 100%);
  background-attachment: fixed;
}`,
    "body background gradient"
  );

  return out;
}

/* =================================================================
   4. templates/camera.html & buzzer.html — minimal, non-breaking
      patch: tag <body> with the side identity and load style-split.css.
      No IDs, no structural containers, no JS hooks are touched.
   ================================================================= */

function patchDashboardHtml(html, side, figLabel) {
  let out = html;

  out = replaceOnce(
    out,
    `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">`,
    `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
<link rel="stylesheet" href="/static/style-split.css">`,
    `${figLabel} fonts + stylesheet link`
  );

  out = replaceOnce(out, `<body>`, `<body data-split-side="${side}">`, `${figLabel} body tag`);

  return out;
}

/* =================================================================
   Run
   ================================================================= */

async function main() {
  log(`root: ${ROOT}${dryRun ? "  (dry run — no files will be written)" : ""}`);

  const requiredDirs = [path.join(ROOT, "templates"), path.join(ROOT, "static")];
  for (const d of requiredDirs) {
    if (!(await exists(d))) {
      console.error(`Expected directory not found: ${d}`);
      console.error(`Run this script from the repo root, or pass --root <path>.`);
      process.exit(1);
    }
  }

  // 1. menu.html — full rewrite
  await writeFile(P.menuHtml, MENU_HTML);

  // 2. style-split.css — new file
  await writeFile(P.splitCss, SPLIT_CSS);

  // 3. style.css — targeted token/shell patch
  if (await exists(P.styleCss)) {
    const original = await fs.readFile(P.styleCss, "utf8");
    const patched = patchStyleCss(original);
    if (patched === original) {
      warn("static/style.css: no changes applied (anchors already patched?)");
    } else {
      await writeFile(P.styleCss, patched);
    }
  } else {
    warn(`static/style.css not found at ${P.styleCss}, skipping token patch`);
  }

  // 4. camera.html (Fig. 3.1) — green side
  if (await exists(P.cameraHtml)) {
    const original = await fs.readFile(P.cameraHtml, "utf8");
    const patched = patchDashboardHtml(original, "left", "camera.html");
    if (patched !== original) await writeFile(P.cameraHtml, patched);
    else warn("templates/camera.html: no changes applied (already patched?)");
  } else {
    warn(`templates/camera.html not found at ${P.cameraHtml}, skipping`);
  }

  // 5. buzzer.html (Fig. 3.3) — violet side
  if (await exists(P.buzzerHtml)) {
    const original = await fs.readFile(P.buzzerHtml, "utf8");
    const patched = patchDashboardHtml(original, "right", "buzzer.html");
    if (patched !== original) await writeFile(P.buzzerHtml, patched);
    else warn("templates/buzzer.html: no changes applied (already patched?)");
  } else {
    warn(`templates/buzzer.html not found at ${P.buzzerHtml}, skipping`);
  }

  log("done.");
  if (!dryRun) log(`backups saved under ${path.relative(ROOT, P.backupDir)}`);
}

main().catch((err) => {
  console.error("patch failed:", err);
  process.exit(1);
});
