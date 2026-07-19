import { chromium } from 'playwright-core';
const DIR='/tmp/claude-0/-home-user-academy-tier-path/9ba009f1-2f6b-5c0f-906e-e32ae1e36e90/scratchpad/tim_src';
const [start,end]=[+process.argv[2],+process.argv[3]];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await pg.goto('file://'+DIR+'/l4.html');
await pg.waitForFunction(()=>window.__ready===true);
const t0=Date.now();
for(let i=start;i<end;i++){
  await pg.evaluate(ms=>window.renderAt(ms),i*1000/30);
  await pg.screenshot({path:`${DIR}/l4f/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:90});
  if((i-start)%300===0)console.log(`${i} (${((Date.now()-t0)/1000)|0}s)`);
}
await b.close();console.log('scene chunk done',start,end);
