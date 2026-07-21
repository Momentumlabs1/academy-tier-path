// Render N adjacent frames at given hold times and report if they're steady.
// PAGE=<html> node steadycheck.mjs t1 t2 t3 ...
import { chromium } from 'playwright-core';
import fs from 'fs';
const DIR='/Users/floramavrofrydis/academy-tier-path/video-engine';
const PAGE=process.env.PAGE;
const times=process.argv.slice(2).map(Number);
const OUT=DIR+'/.render/v6/steady'; fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
pg.on('pageerror',e=>console.log('PAGEERROR',e.message));
await pg.goto('file://'+DIR+'/'+PAGE);
await pg.waitForFunction(()=>window.__ready===true,{timeout:20000});
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
for(const t of times){
  for(let k=0;k<3;k++){
    await pg.evaluate(ms=>window.renderAt(ms),(t*1000)+k*(1000/30));
    await flush();
    await pg.screenshot({path:`${OUT}/${PAGE.replace('.html','')}_t${t}_${k}.png`,type:'png'});
  }
}
await b.close();console.log('rendered',times.length,'holds x3');
