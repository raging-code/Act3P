#!/usr/bin/env node
/**
 * patch-redesign.mjs
 * ---------------------------------------------------------------
 * Rewrites templates/camera.html (Fig. 3.1) and templates/buzzer.html
 * (Fig. 3.3) so that:
 *
 *   1. The header hero is restyled to reuse the landing page's own
 *      .split-half tile look (fig tag, icon badge, big title,
 *      description, stat pairs) instead of the old console header.
 *   2. The live camera feed block (#liveFrame / #liveImg / LIVE+REC
 *      tags / feed caption) is removed completely.
 *   3. The two-column layout (.grid > .feed-panel + .side) is
 *      flattened into a single column (.stack), one section per row:
 *      hero -> motion graph -> stats -> modules/buzzer -> gallery -> log.
 *
 * All existing element IDs used by static/graph.js, static/camera.js
 * and static/buzzer.js (motionGraph, galleryStrip, logList, statTotal,
 * statUptime, modSensorState, modCameraState, modBuzzerState,
 * buzzerVisual, buzzerHint, buzzerTestBtn, armToggle, clock,
 * pulse-dot, footStatus, etc.) are preserved unchanged, so no JS
 * file needs to be edited for the page to keep working.
 *
 * New CSS is appended to static/style-split.css (nothing in
 * style.css is modified or removed) so the patch is additive and
 * easy to review/revert.
 *
 * Usage:
 *   node patch-redesign.mjs            # apply patch (writes .bak backups)
 *   node patch-redesign.mjs --dry-run  # show what would change, write nothing
 *   node patch-redesign.mjs --revert   # restore the .bak backups
 * ---------------------------------------------------------------
 */

import { readFile, writeFile, access, copyFile } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REVERT = args.includes("--revert");

const FILES = {
  camera: path.join(ROOT, "templates", "camera.html"),
  buzzer: path.join(ROOT, "templates", "buzzer.html"),
  cameraJs: path.join(ROOT, "static", "camera.js"),
  buzzerJs: path.join(ROOT, "static", "buzzer.js"),
  splitCss: path.join(ROOT, "static", "style-split.css"),
};

async function exists(p) {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function backup(file) {
  const bak = `${file}.bak`;
  if (!(await exists(bak))) {
    await copyFile(file, bak);
    log(`  backed up -> ${path.relative(ROOT, bak)}`);
  } else {
    log(`  backup already exists, leaving it -> ${path.relative(ROOT, bak)}`);
  }
}

function log(...m) {
  console.log(...m);
}

// -----------------------------------------------------------------
// CSS appended once to static/style-split.css
// -----------------------------------------------------------------
const APPENDED_CSS = `
/* =================================================================
   Appended by patch-redesign.mjs
   Landing-page tile styling reused on the inner Fig. 3.1 / Fig. 3.3
   dashboards, stacked single-column, live feed removed.
   ================================================================= */

.console .fig-hero {
  padding: 30px 30px 26px;
  margin-bottom: 4px;
}

.fig-tag {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 12px;
  letter-spacing: 0.12em;
}
body[data-split-side="left"]  .fig-tag { color: var(--split-left, #7de3a8); }
body[data-split-side="right"] .fig-tag { color: var(--split-right, #c993e8); }

.fig-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0 18px;
}
body[data-split-side="left"]  .fig-icon { background: var(--split-left-dim, rgba(125,227,168,0.14));  color: var(--split-left, #7de3a8); }
body[data-split-side="right"] .fig-icon { background: var(--split-right-dim, rgba(201,147,232,0.14)); color: var(--split-right, #c993e8); }

.fig-title {
  font-size: clamp(24px, 4vw, 30px);
  font-weight: 700;
  margin: 0 0 10px;
}

.fig-desc {
  font-size: 14px;
  line-height: 1.65;
  opacity: 0.72;
  margin: 0 0 18px;
  max-width: 480px;
}

.fig-stats {
  display: flex;
  gap: 24px;
}
.fig-stats div {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 11px;
  opacity: 0.55;
}
.fig-stats b {
  display: block;
  font-size: 16px;
  font-family: var(--grot, 'Bricolage Grotesque', sans-serif);
  opacity: 1;
  margin-top: 2px;
  color: var(--text, #F1F2F4);
}

/* single-column stack replacing the old .grid (.feed-panel + .side) */
.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.stack .motion-graph,
.stack .gallery,
.stack .log,
.stack .buzzer-card,
.stack .stat-row,
.stack .module-row {
  width: 100%;
}
`;

// -----------------------------------------------------------------
// HTML fragments
// -----------------------------------------------------------------

function cameraHero() {
  return `  <section class="fig-hero glass">
    <span class="fig-tag">FIG. 3.1</span>
    <div class="fig-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/>
        <path d="M18 11l4-3v9l-4-3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <circle cx="10" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/>
      </svg>
    </div>
    <h1 class="fig-title">Camera Watch</h1>
    <p class="fig-desc">Motion-triggered snapshots and a full event log with arm / disarm control.</p>
    <div class="fig-stats">
      <div><span>Sensor</span><b>PIR</b></div>
      <div><span>Camera</span><b>USB webcam</b></div>
      <div><span>Events</span><b id="statTotalHero">0 logged</b></div>
    </div>
  </section>`;
}

function buzzerHero() {
  return `  <section class="fig-hero glass">
    <span class="fig-tag">FIG. 3.3</span>
    <div class="fig-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
        <path d="M7 12a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="1.8" fill="currentColor"/>
      </svg>
    </div>
    <h1 class="fig-title">Buzzer + Graph</h1>
    <p class="fig-desc">Active buzzer alert, a motion-reading graph, and 5-second motion recordings.</p>
    <div class="fig-stats">
      <div><span>Cooldown</span><b>5s</b></div>
      <div><span>Buzzer</span><b>Active</b></div>
      <div><span>Events</span><b id="statTotalHero">0 logged</b></div>
    </div>
  </section>`;
}

// -----------------------------------------------------------------
// camera.html transform
// -----------------------------------------------------------------
function transformCamera(html) {
  if (html.includes('<main class="stack">') && html.includes("fig-hero")) {
    return { alreadyPatched: true };
  }
  // 1. Replace <main class="grid"> ... the feed-panel opening + motion-graph
  //    is kept, but rewritten as the new hero + a flat .stack.
  const mainStart = html.indexOf('<main class="grid">');
  const mainEnd = html.indexOf("</main>") + "</main>".length;
  if (mainStart === -1 || mainEnd === -1) {
    throw new Error(
      "camera.html: could not locate <main class=\"grid\"> ... </main> " +
      "(and it doesn't look already-patched either — the file may have changed structure)."
    );
  }

  const before = html.slice(0, mainStart);
  const after = html.slice(mainEnd);

  const newMain = `<main class="stack">

${cameraHero()}

    <section class="motion-graph glass" id="motionGraph">
      <div class="mg-head">
        <span>Motion timeline · last 24h</span>
        <div class="mg-head-right">
          <span class="mg-seg"><button class="on" disabled title="This dashboard always opens the snapshot">Fig 3.1 · image</button></span>
          <span class="mg-count">0 events</span>
        </div>
      </div>
      <div class="mg-stage">
        <canvas class="mg-canvas"></canvas>
        <div class="mg-tip"></div>
        <p class="mg-empty">Waiting for motion events...</p>
      </div>
      <div class="mg-foot">
        <span>Zoom <b class="mg-zoom">1.0×</b> · scroll to zoom, drag to pan</span>
        <span class="mg-range">00:00 – 24:00</span>
      </div>

      <div class="mg-pop" aria-modal="true" role="dialog">
        <div class="mg-pop-frame">
          <div class="mg-pop-bar">
            <div class="mg-pop-title"></div>
            <button class="mg-pop-x">close ✕</button>
          </div>
        </div>
      </div>
    </section>

    <div class="stat-row">
      <div class="stat glass">
        <span class="stat-value" id="statTotal">0</span>
        <span class="stat-label">events logged</span>
      </div>
      <div class="stat glass">
        <span class="stat-value" id="statUptime">0m</span>
        <span class="stat-label">watch time</span>
      </div>
    </div>

    <div class="module-row">
      <div class="module glass" id="modSensor">
        <span class="module-name">PIR sensor</span>
        <span class="module-state" id="modSensorState">checking</span>
      </div>
      <div class="module glass" id="modCamera">
        <span class="module-name">Webcam</span>
        <span class="module-state" id="modCameraState">checking</span>
      </div>
    </div>

    <div class="gallery glass">
      <div class="gallery-head">
        <span>Motion captures</span>
        <div class="gallery-head-right">
          <span class="log-head-count" id="galleryCount">0</span>
          <button class="gallery-view-all-btn" id="galleryViewAllBtn" type="button">View all</button>
        </div>
      </div>
      <div class="gallery-strip gallery-strip--latest" id="galleryStrip">
        <p class="gallery-empty" id="galleryEmpty">Snapshots taken on motion will appear here.</p>
      </div>
    </div>

    <div class="gallery-all-pop" id="galleryAllPop" aria-modal="true" role="dialog">
      <div class="gallery-all-frame">
        <div class="gallery-all-bar">
          <span>All motion captures</span>
          <button class="mg-pop-x" id="galleryAllClose" type="button">close ✕</button>
        </div>
        <div class="gallery-all-list" id="galleryAllList"></div>
      </div>
    </div>

    <div class="log glass">
      <div class="log-head">
        <span>Event log</span>
        <span class="log-head-count" id="logCount">0</span>
      </div>
      <ol class="log-list" id="logList">
        <li class="log-empty">No motion recorded yet. The log fills in here the moment the sensor trips.</li>
      </ol>
    </div>

  </main>`;

  return { alreadyPatched: false, html: before + newMain + after };
}

// -----------------------------------------------------------------
// buzzer.html transform
// -----------------------------------------------------------------
function transformBuzzer(html) {
  if (html.includes('<main class="stack">') && html.includes("fig-hero")) {
    return { alreadyPatched: true };
  }
  const mainStart = html.indexOf('<main class="grid">');
  const mainEnd = html.indexOf("</main>") + "</main>".length;
  if (mainStart === -1 || mainEnd === -1) {
    throw new Error(
      "buzzer.html: could not locate <main class=\"grid\"> ... </main> " +
      "(and it doesn't look already-patched either — the file may have changed structure)."
    );
  }

  const before = html.slice(0, mainStart);
  const after = html.slice(mainEnd);

  const newMain = `<main class="stack">

${buzzerHero()}

    <section class="motion-graph glass" id="motionGraph">
      <div class="mg-head">
        <span>Motion timeline · last 24h</span>
        <div class="mg-head-right">
          <span class="mg-seg"><button class="on" disabled title="This dashboard always opens the recorded clip">Fig 3.3 · video</button></span>
          <span class="mg-count">0 events</span>
        </div>
      </div>
      <div class="mg-stage">
        <canvas class="mg-canvas"></canvas>
        <div class="mg-tip"></div>
        <p class="mg-empty">Waiting for motion events...</p>
      </div>
      <div class="mg-foot">
        <span>Zoom <b class="mg-zoom">1.0×</b> · scroll to zoom, drag to pan</span>
        <span class="mg-range">00:00 – 24:00</span>
      </div>

      <div class="mg-pop" aria-modal="true" role="dialog">
        <div class="mg-pop-frame">
          <div class="mg-pop-bar">
            <div class="mg-pop-title"></div>
            <button class="mg-pop-x">close ✕</button>
          </div>
        </div>
      </div>
    </section>

    <div class="buzzer-card glass">
      <div class="buzzer-card-top">
        <span class="module-name">Active buzzer</span>
        <span class="module-state" id="modBuzzerState">checking</span>
      </div>
      <div class="buzzer-visual" id="buzzerVisual">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="24" stroke="currentColor" stroke-width="2"/>
          <path d="M18 28a10 10 0 0 1 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M14 28a14 14 0 0 1 28 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <circle cx="28" cy="28" r="3.5" fill="currentColor"/>
        </svg>
      </div>
      <p class="buzzer-hint" id="buzzerHint">Sounds automatically whenever motion is detected while armed. A 5-second video also records.</p>
      <button class="arm-toggle buzzer-test-btn" id="buzzerTestBtn">
        <span>Test buzzer</span>
      </button>
    </div>

    <div class="stat-row">
      <div class="stat glass">
        <span class="stat-value" id="statTotal">0</span>
        <span class="stat-label">events logged</span>
      </div>
      <div class="stat glass">
        <span class="stat-value" id="statUptime">0m</span>
        <span class="stat-label">watch time</span>
      </div>
    </div>

    <div class="gallery glass" id="recordingGallery">
      <div class="gallery-head">
        <span>Motion recordings</span>
        <div class="gallery-head-right">
          <span class="log-head-count" id="recordingCount">0</span>
          <button class="gallery-view-all-btn" id="recordingViewAllBtn" type="button">View all</button>
        </div>
      </div>
      <div class="gallery-strip gallery-strip--video gallery-strip--latest" id="recordingStrip">
        <p class="gallery-empty" id="recordingEmpty">Clips recorded on motion will appear here.</p>
      </div>
    </div>

    <div class="gallery-all-pop" id="recordingAllPop" aria-modal="true" role="dialog">
      <div class="gallery-all-frame">
        <div class="gallery-all-bar">
          <span>All motion recordings</span>
          <button class="mg-pop-x" id="recordingAllClose" type="button">close ✕</button>
        </div>
        <div class="gallery-all-list" id="recordingAllList"></div>
      </div>
    </div>

    <div class="log glass">
      <div class="log-head">
        <span>Event log</span>
        <span class="log-head-count" id="logCount">0</span>
      </div>
      <ol class="log-list" id="logList">
        <li class="log-empty">No motion recorded yet. The log fills in here the moment the sensor trips.</li>
      </ol>
    </div>

  </main>`;

  return { alreadyPatched: false, html: before + newMain + after };
}

// -----------------------------------------------------------------
// JS transform — the live-feed <img> is gone, so el.liveImg /
// el.liveFrame are now null. The el-object lookups themselves are
// harmless (getElementById on a missing id just returns null), but
// the two addEventListener calls on el.liveImg would throw on a
// null reference and halt the whole script. Comment those two
// blocks out; everything else (clock, polling, gallery, log,
// buzzer, recTag which is already null-guarded) is untouched.
// -----------------------------------------------------------------
const LIVE_IMG_LISTENER_RE =
  /el\.liveImg\.addEventListener\("load", \(\) => \{\s*\n\s*el\.liveFrame\.classList\.add\("has-image"\);\s*\n\}\);\s*\nel\.liveImg\.addEventListener\("error", \(\) => \{\s*\n\s*el\.liveFrame\.classList\.remove\("has-image"\);\s*\n\}\);/;

function transformJs(src, label) {
  if (!LIVE_IMG_LISTENER_RE.test(src)) {
    return { changed: false, out: src };
  }
  const replacement =
    "// [patch-redesign.mjs] live feed removed from the page; the load/error\n" +
    "// listeners that used to flip .has-image on #liveFrame no longer apply.";
  const out = src.replace(LIVE_IMG_LISTENER_RE, replacement);
  return { changed: true, out };
}

// -----------------------------------------------------------------
// runner
// -----------------------------------------------------------------
async function revert() {
  for (const [name, file] of Object.entries(FILES)) {
    if (name === "splitCss") continue; // CSS is additive/inert, left in place
    const bak = `${file}.bak`;
    if (await exists(bak)) {
      await copyFile(bak, file);
      log(`reverted ${path.relative(ROOT, file)} from backup`);
    } else {
      log(`no backup found for ${path.relative(ROOT, file)}, skipping`);
    }
  }
  log("\nNote: appended CSS in static/style-split.css was left in place");
  log("(it is additive/inert if the HTML no longer references .fig-hero/.stack).");
}

async function apply() {
  log(`Perimeter redesign patch ${DRY_RUN ? "(dry run)" : ""}`);
  log("=".repeat(50));

  // ---- camera.html ----
  log("\ntemplates/camera.html");
  const cameraSrc = await readFile(FILES.camera, "utf8");
  const cameraResult = transformCamera(cameraSrc);
  if (cameraResult.alreadyPatched) {
    log("  already patched, skipping.");
  } else if (!DRY_RUN) {
    await backup(FILES.camera);
    await writeFile(FILES.camera, cameraResult.html, "utf8");
    log("  patched.");
  } else {
    log("  would patch (main grid -> single-column stack, hero added, live feed removed).");
  }

  // ---- buzzer.html ----
  log("\ntemplates/buzzer.html");
  const buzzerSrc = await readFile(FILES.buzzer, "utf8");
  const buzzerResult = transformBuzzer(buzzerSrc);
  if (buzzerResult.alreadyPatched) {
    log("  already patched, skipping.");
  } else if (!DRY_RUN) {
    await backup(FILES.buzzer);
    await writeFile(FILES.buzzer, buzzerResult.html, "utf8");
    log("  patched.");
  } else {
    log("  would patch (main grid -> single-column stack, hero added, live feed removed).");
  }

  // ---- camera.js ----
  log("\nstatic/camera.js");
  const cameraJsSrc = await readFile(FILES.cameraJs, "utf8");
  const cameraJsResult = transformJs(cameraJsSrc, "camera.js");
  if (!cameraJsResult.changed) {
    log("  no dangling live-feed listeners found, skipping.");
  } else if (!DRY_RUN) {
    await backup(FILES.cameraJs);
    await writeFile(FILES.cameraJs, cameraJsResult.out, "utf8");
    log("  patched (removed el.liveImg load/error listeners).");
  } else {
    log("  would patch (remove el.liveImg load/error listeners that would throw on null).");
  }

  // ---- buzzer.js ----
  log("\nstatic/buzzer.js");
  const buzzerJsSrc = await readFile(FILES.buzzerJs, "utf8");
  const buzzerJsResult = transformJs(buzzerJsSrc, "buzzer.js");
  if (!buzzerJsResult.changed) {
    log("  no dangling live-feed listeners found, skipping.");
  } else if (!DRY_RUN) {
    await backup(FILES.buzzerJs);
    await writeFile(FILES.buzzerJs, buzzerJsResult.out, "utf8");
    log("  patched (removed el.liveImg load/error listeners).");
  } else {
    log("  would patch (remove el.liveImg load/error listeners that would throw on null).");
  }

  // ---- style-split.css ----
  log("\nstatic/style-split.css");
  const cssSrc = await readFile(FILES.splitCss, "utf8");
  const marker = "Appended by patch-redesign.mjs";
  if (cssSrc.includes(marker)) {
    log("  already patched, skipping append.");
  } else if (!DRY_RUN) {
    await backup(FILES.splitCss);
    await writeFile(FILES.splitCss, cssSrc + "\n" + APPENDED_CSS, "utf8");
    log("  appended new .fig-hero / .stack rules.");
  } else {
    log("  would append new .fig-hero / .stack rules.");
  }

  log("\n" + "=".repeat(50));
  if (DRY_RUN) {
    log("Dry run complete — no files were changed.");
    log("Run again without --dry-run to apply.");
  } else {
    log("Done. Backups saved alongside each file as *.bak.");
    log("Run `node patch-redesign.mjs --revert` to undo.");
  }
}

if (REVERT) {
  await revert();
} else {
  await apply();
}
