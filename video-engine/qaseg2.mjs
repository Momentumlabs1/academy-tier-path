import { chromium } from 'playwright-core';
const DIR='/Users/floramavrofrydis/academy-tier-path/video-engine';
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
pg.on('pageerror',e=>console.log('PAGEERROR',e.message));
pg.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
await pg.goto('file://'+DIR+'/'+(process.env.PAGE||'v6seg2.html'));
await pg.waitForFunction(()=>window.__ready===true,{timeout:15000});
const dur=await pg.evaluate(()=>window.__dur);
console.log('dur',dur);
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const probes=(process.env.PROBES||'1.5,5.5,11.5,20.4,23.0,26.5,38,45.5').split(',').map(Number);
for(const t of probes){
  await pg.evaluate(ms=>window.renderAt(ms), t*1000);
  await flush();
  await pg.screenshot({path:`${DIR}/.render/v6/qa_${(process.env.TAG||'s2')}_${t}.jpg`,type:'jpeg',quality:90});
  console.log('probe',t);
}
await b.close();
