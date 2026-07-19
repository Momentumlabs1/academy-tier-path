import { chromium } from 'playwright-core';
const DIR=''+(process.env.WORK||'/Users/floramavrofrydis/academy-tier-path/video-engine/.render')+'/tim_src';
const b=await chromium.launch({executablePath:process.env.CHROME||chromium.executablePath(),args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+DIR+'/l1gsap.html');
await pg.waitForFunction(()=>window.__ready===true);
const times=process.argv.slice(2).map(Number);
for(const t of times){
  await pg.evaluate(ms=>window.renderAt(ms),t*1000);
  await pg.waitForTimeout(30);
  await pg.screenshot({path:`${DIR}/qa_${String(t).replace('.','_')}.png`});
}
console.log(errs.join('|')||'ok');
await b.close();
