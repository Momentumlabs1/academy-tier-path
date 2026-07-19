import { chromium } from 'playwright-core';
const DIR='/tmp/claude-0/-home-user-academy-tier-path/9ba009f1-2f6b-5c0f-906e-e32ae1e36e90/scratchpad';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:1});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+DIR+'/bubblecam.html');
await pg.waitForFunction(()=>window.__ready===true);
for(let i=0;i<90;i++){ await pg.evaluate(n=>window.setFrame(n),i); await pg.waitForTimeout(15);
  await pg.screenshot({path:`${DIR}/bcam/f${String(i).padStart(3,'0')}.png`,omitBackground:true}); }
console.log(errs.join('|')||'ok'); await b.close();
