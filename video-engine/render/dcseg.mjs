import { chromium } from 'playwright-core';
const DIR='/tmp/claude-0/-home-user-academy-tier-path/9ba009f1-2f6b-5c0f-906e-e32ae1e36e90/scratchpad';
const [start,end]=[+process.argv[2],+process.argv[3]];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--force-color-profile=srgb','--hide-scrollbars']});
const pg=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await pg.goto('file://'+DIR+'/tim_src/deepchart_app.html');
await pg.waitForFunction(()=>window.__ready===true);
for(let i=start;i<end;i++){ await pg.evaluate(ms=>window.renderAt(ms), 5000 + i*(1000/30));
  await pg.screenshot({path:`${DIR}/dcseg/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:90}); }
await b.close();console.log('dcseg done',start,end);
