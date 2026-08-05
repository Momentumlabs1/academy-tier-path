/**
 * Renders the academy's header artwork from render.html.
 *
 * The banners are generated, not stock: every one is a variant of the same
 * particle field, so a new section can get its own picture that still belongs to
 * the family. Regenerate them any time — this is the source, the JPGs in
 * src/assets/ are the build output.
 *
 * Usage (needs playwright-core and a Chromium binary):
 *   node tools/particle-art/render.mjs                  # all banners → src/assets
 *   node tools/particle-art/render.mjs pulse 212 5      # one: variant hue seed
 *
 * Variants and what each one says — see the header comment in render.html.
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, "../../src/assets");
const PAGE = `file://${resolve(HERE, "render.html")}`;

/** Chromium location. Playwright finds its own unless PW_CHROMIUM points elsewhere. */
const EXECUTABLE = process.env.PW_CHROMIUM || undefined;

/** The shipped set: which variant, hue and seed each page's banner uses. */
const BANNERS = [
  { out: "a-signals", v: "pulse", hue: 212, seed: 5 },
  { out: "a-lessons", v: "ascent", hue: 224, seed: 11 },
  { out: "a-tools", v: "lattice", hue: 218, seed: 23 },
  { out: "a-settings", v: "calm", hue: 228, seed: 31 },
  { out: "a-inbox", v: "burst", hue: 210, seed: 47 },
  { out: "art-dome", v: "gate", hue: 222, seed: 93 },
  { out: "art-wave", v: "horizon", hue: 216, seed: 71 },
  // art-dune.jpg is deliberately NOT regenerated — it predates this renderer and
  // is the picture the whole family was modelled on. Leave it alone.
];

// Rendered large, then downscaled: the extra samples are what keep the dots fine
// instead of chunky, and the header never needs more than ~1400px.
const RENDER_W = 1800, RENDER_H = 750;
const OUT_W = 1400, OUT_H = 583;

const argv = process.argv.slice(2);
const jobs = argv.length
  ? [{ out: `custom-${argv[0]}`, v: argv[0], hue: +(argv[1] ?? 222), seed: +(argv[2] ?? 7) }]
  : BANNERS;

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox"] });
const tmp = mkdtempSync(resolve(tmpdir(), "particle-art-"));
try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: RENDER_W, height: RENDER_H } });
    const q = new URLSearchParams({ v: job.v, hue: job.hue, seed: job.seed, w: RENDER_W, h: RENDER_H });
    await page.goto(`${PAGE}?${q}`, { waitUntil: "load" });
    // render.html sets the title when the last particle is drawn
    await page.waitForFunction(() => document.title === "ready", { timeout: 180_000 });
    const png = resolve(tmp, `${job.out}.png`);
    await (await page.$("#c")).screenshot({ path: png });
    await page.close();

    // Canvas can only give us a PNG; the assets ship as JPG for size. sharp is a
    // devDependency-free way to do this if present, otherwise leave the PNG and
    // let the caller convert.
    let converted = false;
    try {
      const { default: sharp } = await import("sharp");
      await sharp(png).resize(OUT_W, OUT_H).jpeg({ quality: 80, chromaSubsampling: "4:2:0" })
        .toFile(resolve(ASSETS, `${job.out}.jpg`));
      converted = true;
    } catch { /* sharp not installed — fall through */ }
    console.log(converted
      ? `${job.out}.jpg  (${job.v}, hue ${job.hue}, seed ${job.seed})`
      : `${job.out}.png left at ${png} — install sharp, or convert it yourself`);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
