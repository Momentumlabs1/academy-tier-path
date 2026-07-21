import { chromium } from 'playwright-core';
const DIR='/Users/floramavrofrydis/academy-tier-path/video-engine';
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await pg.goto('file://'+DIR+'/v6seg1.html');
await pg.waitForFunction(()=>window.__ready===true);
console.log('errs',JSON.stringify(errs));
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const beats={b02:2000,b05:5600,b12:12000,b18:18600,b20:20800,b25:25500};
for(const[k,ms]of Object.entries(beats)){await pg.evaluate(m=>window.renderAt(m),ms);await flush();await pg.screenshot({path:`${DIR}/.render/v6/seg1_${k}.jpg`,type:'jpeg',quality:90});}
await b.close();console.log('done');
