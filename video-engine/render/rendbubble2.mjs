import { chromium } from 'playwright-core';
const W='/Users/floramavrofrydis/academy-tier-path/video-engine/.render/v6/bubble';
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+W+'/bubblecam.html');
await pg.waitForFunction(()=>window.__ready===true);
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
for(let i=0;i<90;i++){await pg.evaluate(n=>window.setFrame(n),i);await flush();
  await pg.screenshot({path:`${W}/bcam/f${String(i).padStart(3,'0')}.png`,omitBackground:true});}
console.log('bubble errs:',errs.join('|')||'ok');await b.close();
