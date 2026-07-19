import { chromium } from 'playwright-core';
const DIR = process.env.DIR || '/Users/floramavrofrydis/academy-tier-path/video-engine';
const OUT = process.env.OUT || (DIR + '/.render/v6/frames');
const PAGE = process.env.PAGE || (DIR + '/lesson6.html');
const [start, end] = [+process.argv[2], +process.argv[3]];
const b = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await pg.goto('file://' + PAGE);
await pg.waitForFunction(() => window.__ready === true);
const t0 = Date.now();
for (let i = start; i < end; i++) {
  await pg.evaluate(ms => window.renderAt(ms), i * 1000 / 30);
  await pg.screenshot({ path: `${OUT}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if ((i - start) % 120 === 0) console.log(`${i} (${((Date.now() - t0) / 1000) | 0}s)`);
}
await b.close();
console.log('chunk done', start, end);
