import { chromium } from 'playwright-core';
const DIR=''+(process.env.WORK||'/Users/floramavrofrydis/academy-tier-path/video-engine/.render')+'';
const b=await chromium.launch({executablePath:process.env.CHROME||chromium.executablePath(),args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:1});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+DIR+'/bubblecam.html');
await pg.waitForFunction(()=>window.__ready===true);
for(let i=0;i<90;i++){ await pg.evaluate(n=>window.setFrame(n),i); await pg.waitForTimeout(15);
  await pg.screenshot({path:`${DIR}/bcam/f${String(i).padStart(3,'0')}.png`,omitBackground:true}); }
console.log(errs.join('|')||'ok'); await b.close();
