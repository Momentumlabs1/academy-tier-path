import { chromium } from 'playwright-core';
const DIR='/Users/floramavrofrydis/academy-tier-path/video-engine';
const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await pg.goto('file://'+DIR+'/iftest.html');
await pg.waitForFunction(()=>window.__ready===true);
const total=await pg.evaluate(()=>window.__total);
const flush=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
await pg.evaluate(()=>window.renderPath()); await flush();
await pg.screenshot({path:DIR+'/.render/v6/cursor_path.jpg',type:'jpeg',quality:92});
const ts=[500, total*0.18|0, total*0.32|0, total*0.55|0, total*0.7|0, total*0.9|0];
for(let i=0;i<ts.length;i++){await pg.evaluate(ms=>window.renderAt(ms),ts[i]);await flush();await pg.screenshot({path:`${DIR}/.render/v6/cursor_t${i}.jpg`,type:'jpeg',quality:92});}
await b.close();
console.log('done total='+(total|0));
