// generic scene frame renderer: PAGE=<html> OUT=<framesdir> node rendseg.mjs <start> <end>
import { chromium } from 'playwright-core';
import fs from 'fs';
const DIR=process.env.DIR||'/Users/floramavrofrydis/academy-tier-path/video-engine';
const OUT=process.env.OUT; const PAGE=process.env.PAGE;
const [start,end]=[+process.argv[2],+process.argv[3]];
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
pg.on('pageerror',e=>{console.error('PAGEERROR',PAGE,e.message);process.exit(2);});
await pg.goto('file://'+DIR+'/'+PAGE);
await pg.waitForFunction(()=>window.__ready===true,{timeout:20000});
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
for(let i=start;i<end;i++){
  await pg.evaluate(ms=>window.renderAt(ms), i*1000/30);
  await flush();
  await pg.screenshot({path:`${OUT}/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:90});
}
await b.close();console.log('chunk',PAGE,start,end,'done');
