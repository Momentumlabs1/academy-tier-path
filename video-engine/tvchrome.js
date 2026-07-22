/* ============================================================================
   tvchrome.js — shared MIRROR components for Video 6 (EDITING-BRAIN §10)
   Faithful recreation of Tim's screen: dark Chrome browser + light Windows 11
   taskbar + TradingView (dark toolbars, WHITE canvas, blue replay candles,
   VP/position/footprint) + Deepchart® orderflow terminal.
   Pure deterministic draw functions — no RNG at render time.
   Requires: interface-engine.js (IFE) loaded first. Exposes global TVC.
   ============================================================================ */
(function (root) {
'use strict';
const P = Math.round;
const clamp = (u,a,b)=>u<a?a:u>b?b:u;
const eo = u=>{u=clamp(u,0,1);return 1-Math.pow(1-u,3);};
const es = u=>{u=clamp(u,0,1);return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;};
const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;};

// ---- palette (measured from refs) -----------------------------------------
const C = {
  // chrome (dark browser)
  tabStrip:'#202124', tabInactive:'#202124', tabActive:'#3c4043', tabText:'#bdc1c6',
  tabTextActive:'#e8eaed', addrBar:'#35363a', omnibox:'#282a2d', addrText:'#c8cbcf',
  // TradingView
  tvDark:'#131722', tvDark2:'#1e222d', tvBorder:'#2a2e39', tvText:'#d1d4dc',
  tvSub:'#787b86', tvBlue:'#2962ff', tvUp:'#089981', tvDn:'#f23645',
  tvWhite:'#ffffff', tvGrid:'#f0f3fa', tvLine:'#e0e3eb', tvInk:'#131722',
  candleBlue:'#2962ff',
  // Deepchart
  dcBg:'#17181c', dcBar:'#1e1f24', dcPill:'#2a2b31', dcText:'#c9ccd1',
  dcUp:'#26a69a', dcDn:'#ef5350', dcBuy:'#2ecc71', dcSell:'#e91e8c',
  // taskbar (light Win11)
  tbBg:'#f3f6fa', tbText:'#444a52',
};
const SANS='"Segoe UI",system-ui,-apple-system,"Trebuchet MS",Roboto,sans-serif';

// layout constants (1920×1080, mirrors refs)
const TAB={y0:0,h:36}, ADDR={y0:36,h:46}, PAGE={y0:82};
const TASK={y0:1040,h:40};

// ============================================================================
// BROWSER CHROME (dark) — tab strip + address bar
// ============================================================================
function browserChrome(X, o){
  o=o||{};
  const tabs=o.tabs||['R | Trader Pro™ — Professional','Your Membership Information','XAUUSD 4.120,670 ▼ −0.08% F'];
  const act=o.active==null?tabs.length-1:o.active;
  const url=o.url||'de.tradingview.com/chart/RFuJLURc/?symbol=OANDA%3AXAUUSD';
  // tab strip
  X.fillStyle=C.tabStrip;X.fillRect(0,0,1920,TAB.h);
  X.textBaseline='middle';
  let tx=10;const tw=o.tabW||236;
  X.fillStyle='#9aa0a6';X.font='400 15px '+SANS;X.textAlign='left';X.fillText('⌄',14,TAB.h/2+1);
  tx=44;
  for(let i=0;i<tabs.length;i++){
    const a=i===act;
    if(a){X.fillStyle=C.tabActive;
      // rounded-top tab
      X.beginPath();X.moveTo(tx,TAB.h);X.lineTo(tx,10);X.arcTo(tx,2,tx+8,2,8);X.lineTo(tx+tw-8,2);X.arcTo(tx+tw,2,tx+tw,10,8);X.lineTo(tx+tw,TAB.h);X.closePath();X.fill();}
    // favicon
    X.fillStyle=a?'#8ab4f8':'#5f6368';X.beginPath();X.arc(tx+18,TAB.h/2+1,6,0,7);X.fill();
    X.fillStyle=a?C.tabTextActive:C.tabText;X.font='400 13px '+SANS;X.textAlign='left';
    let lbl=tabs[i];if(lbl.length>26)lbl=lbl.slice(0,25)+'…';
    X.fillText(lbl,tx+32,TAB.h/2+1);
    X.fillStyle='#9aa0a6';X.textAlign='center';X.font='400 15px '+SANS;X.fillText('×',tx+tw-14,TAB.h/2+1);
    if(!a&&i+1!==act){X.strokeStyle='#3c4043';X.beginPath();X.moveTo(tx+tw+1,10);X.lineTo(tx+tw+1,TAB.h-8);X.stroke();}
    tx+=tw+2;
  }
  X.fillStyle='#bdc1c6';X.font='300 20px '+SANS;X.textAlign='left';X.fillText('+',tx+12,TAB.h/2+1);
  // window controls
  X.fillStyle='#bdc1c6';X.font='400 15px '+SANS;X.textAlign='center';
  X.fillText('−',1832,TAB.h/2);X.fillText('□',1866,TAB.h/2);X.fillText('×',1900,TAB.h/2);
  // address bar
  X.fillStyle=C.addrBar;X.fillRect(0,ADDR.y0,1920,ADDR.h);
  X.fillStyle='#c8cbcf';X.font='400 19px '+SANS;X.textAlign='center';
  X.fillText('←',22,ADDR.y0+ADDR.h/2);X.fillText('→',58,ADDR.y0+ADDR.h/2);X.fillText('⟳',94,ADDR.y0+ADDR.h/2);
  X.fillStyle=C.omnibox;rr(X,120,ADDR.y0+7,1470,ADDR.h-14,16);X.fill();
  X.fillStyle='#9aa0a6';X.font='400 14px '+SANS;X.textAlign='left';
  X.fillText('◉',138,ADDR.y0+ADDR.h/2+1);
  X.fillStyle=C.addrText;X.fillText(url,162,ADDR.y0+ADDR.h/2+1);
  // right icons: star, extensions, profile, restart pill, menu
  X.fillStyle='#bdc1c6';X.textAlign='center';X.font='400 16px '+SANS;
  X.fillText('☆',1612,ADDR.y0+ADDR.h/2);X.fillText('⌘',1646,ADDR.y0+ADDR.h/2);
  X.fillStyle='#c94f42';X.beginPath();X.arc(1684,ADDR.y0+ADDR.h/2,11,0,7);X.fill();
  X.fillStyle='#fff';X.font='600 12px '+SANS;X.fillText('T',1684,ADDR.y0+ADDR.h/2+1);
  X.fillStyle='#3c4043';rr(X,1706,ADDR.y0+9,178,ADDR.h-18,14);X.fill();
  X.fillStyle='#e8eaed';X.font='400 12px '+SANS;X.textAlign='left';X.fillText('Zum Aktualisieren neu starten',1716,ADDR.y0+ADDR.h/2+1);
  X.fillStyle='#bdc1c6';X.textAlign='center';X.font='600 14px '+SANS;X.fillText('⋮',1902,ADDR.y0+ADDR.h/2);
}

// ============================================================================
// WINDOWS 11 TASKBAR (light) — weather left, centered icons, tray + clock
// ============================================================================
function winTaskbar(X, o){
  o=o||{};
  const clock=o.clock||'22:42', date=o.date||'12.07.2026';
  const wx=o.weather||['Hot weather','Now'];
  X.fillStyle=C.tbBg;X.fillRect(0,TASK.y0,1920,TASK.h);
  X.strokeStyle='#e2e6ec';X.beginPath();X.moveTo(0,TASK.y0+0.5);X.lineTo(1920,TASK.y0+0.5);X.stroke();
  // weather left
  X.fillStyle='#f5a623';X.beginPath();X.arc(26,TASK.y0+20,9,0,7);X.fill();
  X.fillStyle=C.tbText;X.font='500 12px '+SANS;X.textAlign='left';X.textBaseline='alphabetic';
  X.fillText(wx[0],44,TASK.y0+18);
  X.fillStyle='#8a919b';X.font='400 11px '+SANS;X.fillText(wx[1],44,TASK.y0+32);
  // centered icons
  const icons=['win','search','copilot','folder','edge','store','mail','chrome','note','m365','obs','tv'];
  let ix=1920/2-((icons.length-1)*46+(icons[1]==='search'?150:0))/2-20;
  X.textBaseline='middle';
  for(const ic of icons){
    const cy=TASK.y0+TASK.h/2;
    if(ic==='win'){X.fillStyle='#2f7fe0';const s=8;X.fillRect(ix,cy-s-1,s,s);X.fillRect(ix+s+2,cy-s-1,s,s);X.fillRect(ix,cy+1,s,s);X.fillRect(ix+s+2,cy+1,s,s);ix+=46;}
    else if(ic==='search'){X.fillStyle='#ffffff';rr(X,ix,cy-14,190,28,14);X.fill();X.strokeStyle='#dde2e9';rr(X,ix,cy-14,190,28,14);X.stroke();
      X.strokeStyle='#5f6368';X.lineWidth=1.6;X.beginPath();X.arc(ix+18,cy-2,5,0,7);X.moveTo(ix+22,cy+2);X.lineTo(ix+26,cy+6);X.stroke();X.lineWidth=1;
      X.fillStyle='#5f6368';X.font='400 13px '+SANS;X.textAlign='left';X.fillText('Suche',ix+34,cy+1);
      X.fillStyle='#2e8b57';X.beginPath();X.arc(ix+172,cy,9,0,7);X.fill();X.fillStyle='#fff';X.font='600 10px '+SANS;X.textAlign='center';X.fillText('⚽',ix+172,cy+1);
      ix+=190+26;}
    else{
      // simple app tiles
      const cyy=cy;const s=13;
      if(ic==='copilot'){const g=X.createLinearGradient(ix-s,cyy-s,ix+s,cyy+s);g.addColorStop(0,'#59c2f0');g.addColorStop(1,'#c17ef5');X.fillStyle=g;X.beginPath();X.arc(ix,cyy,11,0,7);X.fill();}
      if(ic==='folder'){X.fillStyle='#f7c86b';rr(X,ix-12,cyy-8,24,17,3);X.fill();X.fillStyle='#e8ae45';rr(X,ix-12,cyy-11,11,6,2);X.fill();}
      if(ic==='edge'){const g=X.createLinearGradient(ix-s,cyy,ix+s,cyy);g.addColorStop(0,'#35c1f1');g.addColorStop(1,'#0d64c0');X.fillStyle=g;X.beginPath();X.arc(ix,cyy,11,0,7);X.fill();X.fillStyle=C.tbBg;X.beginPath();X.arc(ix+3,cyy+3,5,0,7);X.fill();}
      if(ic==='store'){X.fillStyle='#2f7fe0';rr(X,ix-10,cyy-8,20,17,3);X.fill();X.fillStyle='#fff';rr(X,ix-4,cyy-11,8,5,1);X.fill();}
      if(ic==='mail'){X.fillStyle='#4a90d9';rr(X,ix-11,cyy-8,22,16,3);X.fill();X.strokeStyle='#fff';X.lineWidth=1.4;X.beginPath();X.moveTo(ix-9,cyy-6);X.lineTo(ix,cyy+1);X.lineTo(ix+9,cyy-6);X.stroke();X.lineWidth=1;}
      if(ic==='chrome'){X.fillStyle='#e8443a';X.beginPath();X.arc(ix,cyy,11,0,7);X.fill();X.fillStyle='#f7c744';X.beginPath();X.moveTo(ix,cyy);X.arc(ix,cyy,11,Math.PI*0.6,Math.PI*1.15);X.closePath();X.fill();X.fillStyle='#5aa55c';X.beginPath();X.moveTo(ix,cyy);X.arc(ix,cyy,11,Math.PI*1.15,Math.PI*1.75);X.closePath();X.fill();X.fillStyle='#fff';X.beginPath();X.arc(ix,cyy,5.5,0,7);X.fill();X.fillStyle='#4a90d9';X.beginPath();X.arc(ix,cyy,3.6,0,7);X.fill();}
      if(ic==='note'){X.fillStyle='#8f6ac2';rr(X,ix-9,cyy-11,18,22,3);X.fill();X.strokeStyle='#fff';X.beginPath();for(let k=-4;k<=4;k+=4){X.moveTo(ix-5,cyy+k);X.lineTo(ix+5,cyy+k);}X.stroke();}
      if(ic==='m365'){X.fillStyle='#d64a22';X.beginPath();X.moveTo(ix-9,cyy+10);X.lineTo(ix-9,cyy-7);X.lineTo(ix+3,cyy-11);X.lineTo(ix+9,cyy-9);X.lineTo(ix+9,cyy+9);X.lineTo(ix+3,cyy+11);X.closePath();X.fill();X.fillStyle='#fff';X.font='700 11px '+SANS;X.textAlign='center';X.fillText('M',ix+1,cyy+1);}
      if(ic==='obs'){X.fillStyle='#22242a';X.beginPath();X.arc(ix,cyy,11,0,7);X.fill();X.fillStyle='#dfe3e8';X.beginPath();X.arc(ix-2,cyy-3,4,0,7);X.arc(ix+4,cyy+2,4,0,7);X.arc(ix-3,cyy+4,4,0,7);X.fill();
        X.fillStyle='#d43a2f';rr(X,ix+2,cyy-13,20,12,6);X.fill();X.fillStyle='#fff';X.font='700 9px '+SANS;X.textAlign='center';X.fillText('536',ix+12,cyy-7);}
      if(ic==='tv'){X.fillStyle='#1848c8';rr(X,ix-10,cyy-10,20,20,4);X.fill();X.fillStyle='#fff';X.font='800 12px '+SANS;X.textAlign='center';X.fillText('17',ix,cyy+1);}
      ix+=46;
    }
  }
  // tray right
  X.fillStyle=C.tbText;X.font='400 12px '+SANS;X.textAlign='center';
  X.fillText('⌃',1652,TASK.y0+20);
  X.fillText('▤',1680,TASK.y0+20);
  X.fillText('♚',0,-50); // noop glyph guard
  // mic
  X.strokeStyle=C.tbText;X.lineWidth=1.4;X.beginPath();X.arc(1706,TASK.y0+18,4,Math.PI,0);X.moveTo(1702,TASK.y0+18);X.lineTo(1702,TASK.y0+19);X.moveTo(1710,TASK.y0+18);X.lineTo(1710,TASK.y0+19);X.moveTo(1706,TASK.y0+23);X.lineTo(1706,TASK.y0+26);X.stroke();X.lineWidth=1;
  X.textAlign='center';X.font='600 10px '+SANS;
  X.fillText('DEU',1744,TASK.y0+15);X.fillText('INTL',1744,TASK.y0+27);
  // wifi + speaker
  X.strokeStyle=C.tbText;X.lineWidth=1.5;
  for(let r=3;r<=9;r+=3){X.beginPath();X.arc(1782,TASK.y0+24,r,Math.PI*1.22,Math.PI*1.78);X.stroke();}
  X.fillStyle=C.tbText;X.beginPath();X.arc(1782,TASK.y0+24,1.4,0,7);X.fill();
  X.beginPath();X.moveTo(1806,TASK.y0+17);X.lineTo(1810,TASK.y0+17);X.lineTo(1816,TASK.y0+12);X.lineTo(1816,TASK.y0+28);X.lineTo(1810,TASK.y0+23);X.lineTo(1806,TASK.y0+23);X.closePath();X.fill();
  X.lineWidth=1;
  // clock
  X.fillStyle='#3d434b';X.textAlign='right';X.font='500 12px '+SANS;
  X.fillText(clock,1908,TASK.y0+16);X.fillText(date,1908,TASK.y0+31);
}

// ============================================================================
// TRADINGVIEW chart page chrome (dark toolbar + white canvas furniture)
// ============================================================================
const TV={rail:{x0:0,w:46}, tool:{y0:PAGE.y0,h:42}, scaleW:64, axisH:28};

function tvToolbar(X, o){
  o=o||{};
  const iv=o.interval||'1m';
  const y=TV.tool.y0,h=TV.tool.h;
  X.fillStyle=C.tvDark;X.fillRect(0,y,1920,h);
  X.strokeStyle=C.tvBorder;X.beginPath();X.moveTo(0,y+h+0.5);X.lineTo(1920,y+h+0.5);X.stroke();
  X.textBaseline='middle';
  // symbol
  X.fillStyle=C.tvText;X.font='700 16px '+SANS;X.textAlign='left';X.fillText(o.symbol||'XAUUSD',64,y+h/2);
  X.fillStyle=C.tvSub;X.font='400 14px '+SANS;X.fillText('⊕',150,y+h/2);X.fillText('+',176,y+h/2);
  X.strokeStyle=C.tvBorder;X.beginPath();X.moveTo(200,y+8);X.lineTo(200,y+h-8);X.stroke();
  // intervals
  const ivs=['1s','5s','10s','15s','30s','1m','2m','3m','4m','5m','10m','15m','20m','25m','30m','45m','1h','2h','3h','4h','8h','12h','16h','T','2T','3T','W','M'];
  let x=220;X.font='500 13px '+SANS;
  for(const s of ivs){
    const w=X.measureText(s).width;
    if(s===iv){X.fillStyle=C.tvBlue;X.font='700 13px '+SANS;}
    else X.fillStyle=C.tvSub;
    X.textAlign='left';X.fillText(s,x,y+h/2);
    if(s===iv)X.font='500 13px '+SANS;
    x+=w+13;
  }
  X.fillStyle=C.tvSub;X.fillText('⌄',x,y+h/2);x+=28;
  X.strokeStyle=C.tvBorder;X.beginPath();X.moveTo(x,y+8);X.lineTo(x,y+h-8);X.stroke();x+=16;
  // candle-type icon
  X.strokeStyle=C.tvText;X.lineWidth=1.4;
  X.strokeRect(x+2,y+h/2-6,5,12);X.beginPath();X.moveTo(x+4.5,y+h/2-10);X.lineTo(x+4.5,y+h/2-6);X.moveTo(x+4.5,y+h/2+6);X.lineTo(x+4.5,y+h/2+10);X.stroke();
  X.strokeRect(x+12,y+h/2-8,5,10);X.lineWidth=1;
  x+=36;X.fillStyle=C.tvSub;X.fillText('⌄',x,y+h/2);x+=26;
  // indicators etc.
  X.fillStyle=C.tvText;X.font='400 14px '+SANS;X.fillText('ƒₓ  Indikatoren',x,y+h/2);x+=120;
  X.fillStyle=C.tvSub;X.fillText('▦',x,y+h/2);x+=34;X.fillText('⏰',x,y+h/2);x+=40;
  // replay (active blue when o.replay)
  X.fillStyle=o.replay?C.tvBlue:C.tvSub;X.font='700 15px '+SANS;X.fillText('◀◀',x,y+h/2);
  X.fillStyle=o.replay?C.tvBlue:C.tvSub;X.font='400 12px '+SANS;X.fillText('⌄',x+34,y+h/2);
  x+=56;X.fillStyle=C.tvSub;X.font='400 15px '+SANS;X.fillText('↶',x,y+h/2);x+=28;X.fillText('↷',x,y+h/2);
  // right side
  X.textAlign='right';
  X.fillStyle='#2962ff';rr(X,1774,y+7,132,h-14,6);X.fill();
  X.fillStyle='#fff';X.font='600 14px '+SANS;X.textAlign='center';X.fillText('Veröffentlichen',1840,y+h/2+1);
  X.fillStyle=C.tvSub;X.font='400 13px '+SANS;X.textAlign='right';X.fillText('Fibc',1706,y+h/2-8);X.fillText('Speiche',1706,y+h/2+9);
  X.fillStyle='#f7931a';X.beginPath();X.arc(1728,y+h/2,4,0,7);X.fill();
  X.fillStyle=C.tvText;X.font='500 14px '+SANS;X.fillText('Trade',1764,y+h/2);
}

function tvLeftRail(X, o){
  o=o||{};
  const y0=TV.tool.y0+TV.tool.h+1, y1=o.y1==null?1012:o.y1;
  X.fillStyle='#fff';X.fillRect(0,y0,TV.rail.w,y1-y0);
  X.strokeStyle=C.tvLine;X.beginPath();X.moveTo(TV.rail.w+0.5,y0);X.lineTo(TV.rail.w+0.5,y1);X.stroke();
  const cx=TV.rail.w/2;
  const draw=(i,fn,active,hover)=>{
    const cy=y0+30+i*44;
    if(active){X.fillStyle=hexA(C.tvBlue,0.14);rr(X,cx-15,cy-15,30,30,6);X.fill();}
    else if(hover){X.fillStyle='#f0f3fa';rr(X,cx-15,cy-15,30,30,6);X.fill();}
    X.strokeStyle=active?C.tvBlue:'#5d616b';X.fillStyle=active?C.tvBlue:'#5d616b';X.lineWidth=1.5;
    fn(cx,cy);X.lineWidth=1;
  };
  const icons=[
    (x,y)=>{X.beginPath();X.moveTo(x-9,y);X.lineTo(x+9,y);X.moveTo(x,y-9);X.lineTo(x,y+9);X.stroke();}, // cross
    (x,y)=>{X.beginPath();X.moveTo(x-9,y+7);X.lineTo(x+9,y-7);X.stroke();X.beginPath();X.arc(x-9,y+7,2,0,7);X.arc(x+9,y-7,2,0,7);X.fill();}, // trendline
    (x,y)=>{X.beginPath();for(let k=-6;k<=6;k+=4){X.moveTo(x-9,y+k);X.lineTo(x+9,y+k);}X.stroke();}, // fib
    (x,y)=>{X.beginPath();X.moveTo(x-9,y+8);X.lineTo(x-3,y-6);X.lineTo(x+3,y+2);X.lineTo(x+9,y-8);X.stroke();}, // pattern
    (x,y)=>{X.strokeRect(x-8,y-5,16,10);X.beginPath();X.moveTo(x,y-9);X.lineTo(x,y-5);X.moveTo(x,y+5);X.lineTo(x,y+9);X.stroke();}, // position
    (x,y)=>{X.beginPath();X.moveTo(x-8,y+8);X.quadraticCurveTo(x-2,y-10,x+8,y-4);X.stroke();X.beginPath();X.arc(x+8,y-4,2.4,0,7);X.fill();}, // brush
    (x,y)=>{X.font='600 15px '+SANS;X.textAlign='center';X.textBaseline='middle';X.fillText('T',x,y+1);}, // text
    (x,y)=>{X.beginPath();X.arc(x,y,8,0,7);X.stroke();X.beginPath();X.arc(x-3,y-2,1.2,0,7);X.arc(x+3,y-2,1.2,0,7);X.fill();X.beginPath();X.arc(x,y+1,4.4,0.15*Math.PI,0.85*Math.PI);X.stroke();}, // emoji
    (x,y)=>{X.save();X.translate(x,y);X.rotate(-Math.PI/4);X.strokeRect(-9,-3,18,6);X.beginPath();for(let k=-5;k<=5;k+=3){X.moveTo(k,-3);X.lineTo(k,0);}X.stroke();X.restore();}, // ruler
    (x,y)=>{X.beginPath();X.arc(x-1,y-1,6,0,7);X.stroke();X.beginPath();X.moveTo(x+4,y+4);X.lineTo(x+9,y+9);X.stroke();}, // zoom
    (x,y)=>{X.beginPath();X.arc(x,y+2,7,Math.PI,0);X.stroke();X.beginPath();X.moveTo(x-7,y+2);X.lineTo(x-7,y+7);X.moveTo(x+7,y+2);X.lineTo(x+7,y+7);X.stroke();}, // magnet
    (x,y)=>{X.beginPath();X.moveTo(x-7,y+8);X.lineTo(x+5,y-7);X.lineTo(x+8,y-4);X.lineTo(x-4,y+11);X.closePath();X.stroke();}, // pencil
    (x,y)=>{X.strokeRect(x-7,y-3,14,10);X.beginPath();X.arc(x,y-5,4,Math.PI,0);X.stroke();}, // lock
    (x,y)=>{X.beginPath();X.arc(x,y,3,0,7);X.stroke();X.beginPath();X.moveTo(x-10,y);X.quadraticCurveTo(x,y-9,x+10,y);X.quadraticCurveTo(x,y+9,x-10,y);X.closePath();X.stroke();}, // eye
    (x,y)=>{X.strokeRect(x-6,y-6,12,14);X.beginPath();X.moveTo(x-9,y-6);X.lineTo(x+9,y-6);X.moveTo(x-2,y-9);X.lineTo(x+2,y-9);X.stroke();}, // trash
  ];
  for(let i=0;i<icons.length;i++)draw(i,icons[i],o.active===i,o.hover===i);
}

// floating drawing toolbar (top-center white bar)
function tvFloatBar(X, o){
  o=o||{};
  const bx=o.x==null?470:o.x, by=o.y==null?PAGE.y0+96:o.y, bw=560, bh=40;
  X.save();X.shadowColor='rgba(30,40,60,0.18)';X.shadowBlur=14;X.shadowOffsetY=3;
  X.fillStyle='#fff';rr(X,bx,by,bw,bh,8);X.fill();X.restore();
  X.strokeStyle=C.tvLine;rr(X,bx,by,bw,bh,8);X.stroke();
  X.fillStyle='#b2b5be';X.font='600 11px '+SANS;X.textAlign='left';X.textBaseline='middle';
  X.fillText('⁙',bx+12,by+bh/2);
  X.strokeStyle='#5d616b';X.lineWidth=1.4;
  const cy=by+bh/2;let x=bx+44;
  const mini=[
    ()=>{X.beginPath();X.moveTo(x-7,cy+5);X.lineTo(x+7,cy-5);X.stroke();},
    ()=>{X.strokeRect(x-7,cy-5,14,10);},
    ()=>{X.beginPath();X.moveTo(x-7,cy+6);X.lineTo(x+7,cy-6);X.stroke();X.beginPath();X.arc(x-7,cy+6,1.8,0,7);X.arc(x+7,cy-6,1.8,0,7);X.fill();},
    ()=>{X.beginPath();X.moveTo(x-7,cy+4);X.quadraticCurveTo(x,cy-8,x+7,cy-2);X.stroke();},
    ()=>{X.font='600 13px '+SANS;X.textAlign='center';X.fillStyle='#5d616b';X.fillText('T',x,cy+1);},
    ()=>{X.beginPath();X.moveTo(x-7,cy+6);X.lineTo(x,cy-6);X.lineTo(x+7,cy+6);X.stroke();},
    ()=>{X.beginPath();X.moveTo(x-8,cy);X.lineTo(x+8,cy);X.stroke();X.beginPath();X.moveTo(x+3,cy-4);X.lineTo(x+8,cy);X.lineTo(x+3,cy+4);X.stroke();},
    ()=>{X.beginPath();X.arc(x,cy,6,0,7);X.stroke();},
    ()=>{X.beginPath();X.moveTo(x-6,cy-6);X.lineTo(x+6,cy+6);X.moveTo(x+6,cy-6);X.lineTo(x-6,cy+6);X.stroke();},
    ()=>{X.strokeRect(x-6,cy-6,12,12);X.beginPath();X.moveTo(x-6,cy);X.lineTo(x+6,cy);X.moveTo(x,cy-6);X.lineTo(x,cy+6);X.stroke();},
    ()=>{X.font='600 12px '+SANS;X.textAlign='center';X.fillStyle='#5d616b';X.fillText('☰',x,cy+1);},
  ];
  for(const m of mini){X.fillStyle='#5d616b';m();x+=46;}
  X.lineWidth=1;
  if(o.brush){ // brush-size mini panel (like Tim's 20px)
    X.save();X.shadowColor='rgba(30,40,60,0.18)';X.shadowBlur=14;X.shadowOffsetY=3;
    X.fillStyle='#fff';rr(X,bx+bw+16,by,220,bh,8);X.fill();X.restore();
    X.strokeStyle=C.tvLine;rr(X,bx+bw+16,by,220,bh,8);X.stroke();
    X.fillStyle='#5d616b';X.font='500 13px '+SANS;X.textAlign='left';
    X.fillText('✎',bx+bw+34,cy);X.fillText(o.brush+'px',bx+bw+60,cy);
    X.fillStyle=C.tvBlue;X.beginPath();X.arc(bx+bw+130,cy,7,0,7);X.fill();
    X.fillStyle='#5d616b';X.fillText('⚙',bx+bw+160,cy);X.fillText('…',bx+bw+192,cy);
  }
}

// legend (top-left over white canvas) + buy/sell pills
function tvLegend(X, o){
  o=o||{};
  const x=64,y=PAGE.y0+TV.tool.h+22;
  X.textBaseline='alphabetic';X.textAlign='left';
  X.fillStyle=C.tvInk;X.font='500 15px '+SANS;
  let t=(o.name||'Gold Spot / U.S. Dollar')+' · '+(o.int||'1')+' · '+(o.src||'OANDA')+(o.ind?' · '+o.ind:'');
  X.fillText(t,x,y);
  const tW=X.measureText(t).width;
  // OHLC values
  let vx=x+tW+30;
  X.font='500 14px '+SANS;
  const oc=o.up==null?true:o.up, col=oc?C.tvUp:C.tvDn;
  const vals=[['O',o.o||'4.076,125'],['H',o.h||'4.078,030'],['L',o.l||'4.076,065'],['C',o.c||'4.077,615']];
  for(const [k,v] of vals){
    X.fillStyle=C.tvSub;X.fillText(k,vx,y);vx+=X.measureText(k).width+3;
    X.fillStyle=col;X.fillText(v,vx,y);vx+=X.measureText(v).width+9;
  }
  X.fillStyle=col;X.fillText(o.chg||'+1,425 (+0,03%)',vx,y);
  // red flag icon
  X.fillStyle=C.tvDn;rr(X,x+tW+10,y-12,10,9,1);X.fill();
  // sell/buy pills
  const py=y+18;
  X.fillStyle=C.tvDn;rr(X,x-4,py,120,34,4);X.fill();
  X.fillStyle='#fff';X.font='700 13px '+SANS;X.textAlign='center';
  X.fillText(o.sell||'4.080,070',x+56,py+14);X.font='500 10px '+SANS;X.fillText('VERKAUF',x+56,py+27);
  X.fillStyle='#fff';X.strokeStyle=C.tvLine;rr(X,x+120,py,52,34,0);X.fill();X.stroke();
  X.fillStyle=C.tvSub;X.font='500 10px '+SANS;X.fillText(o.spr||'0,000',x+146,py+13);X.fillStyle=C.tvInk;X.font='600 11px '+SANS;X.fillText('1',x+146,py+26);
  X.fillStyle=C.tvBlue;rr(X,x+176,py,120,34,4);X.fill();
  X.fillStyle='#fff';X.font='700 13px '+SANS;X.fillText(o.buy||'4.080,070',x+236,py+14);X.font='500 10px '+SANS;X.fillText('KAUF',x+236,py+27);
  // indicator line
  X.fillStyle=C.tvSub;X.font='400 13px '+SANS;X.textAlign='left';
  X.fillText((o.svp||'SVP HD All Up/Down')+'  👁',x,py+56);
  X.fillStyle='#b2b5be';X.font='400 12px '+SANS;X.fillText('⌃',x+8,py+80);
}

// watermark
function tvWatermark(X, o){
  o=o||{};
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.fillStyle='rgba(178,181,190,0.18)';X.font='700 84px '+SANS;
  X.fillText((o.sym||'XAUUSD')+(o.int?' , '+o.int:''),960,470);
  X.font='400 56px '+SANS;X.fillText(o.name||'Gold Spot / U.S. Dollar',960,545);
  if(o.replay){X.font='400 40px '+SANS;X.fillText('◉  Wiedergabemodus',960,608);}
  X.restore();
}

// price scale + grid. maps price→y. returns yOf.
function priceScale(X, o){
  const x=1920-TV.scaleW, y0=o.y0, y1=o.y1, pmin=o.pmin, pmax=o.pmax;
  const yOf=p=>y1-(p-pmin)/(pmax-pmin)*(y1-y0);
  X.fillStyle='#fff';X.fillRect(x,y0,TV.scaleW,y1-y0);
  X.strokeStyle=C.tvLine;X.beginPath();X.moveTo(x+0.5,y0);X.lineTo(x+0.5,y1);X.stroke();
  const step=o.step||2500, fmt=o.fmt||(v=>fmtDE(v,o.dec==null?0:o.dec));
  X.font='400 11px '+SANS;X.textAlign='left';X.textBaseline='middle';
  for(let p=Math.ceil(pmin/step)*step;p<=pmax;p+=step){
    const y=yOf(p);
    if(y<y0+8||y>y1-8)continue;
    X.strokeStyle=C.tvGrid;X.beginPath();X.moveTo(o.x0||TV.rail.w+1,P(y)+0.5);X.lineTo(x,P(y)+0.5);X.stroke();
    X.fillStyle='#9598a1';X.fillText(fmt(p),x+8,y);
  }
  return yOf;
}
function priceTag(X, p, yOf, txt, bg, fg){
  const y=yOf(p), x=1920-TV.scaleW;
  X.fillStyle=bg;rr(X,x+1,y-9,TV.scaleW-2,18,2);X.fill();
  X.fillStyle=fg||'#fff';X.font='600 11px '+SANS;X.textAlign='left';X.textBaseline='middle';
  X.fillText(txt,x+7,y+0.5);
}
function fmtDE(v,dec){
  const s=v.toFixed(dec==null?0:dec);
  const [a,b]=s.split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(b?','+b:'');
}

// time axis
function timeAxis(X, o){
  const y=o.y, labels=o.labels||[], x0=o.x0||TV.rail.w+1, x1=o.x1||1920-TV.scaleW;
  X.fillStyle='#fff';X.fillRect(x0,y,x1-x0,TV.axisH);
  X.strokeStyle=C.tvLine;X.beginPath();X.moveTo(x0,y+0.5);X.lineTo(1920,y+0.5);X.stroke();
  X.fillStyle='#9598a1';X.font='400 12px '+SANS;X.textAlign='center';X.textBaseline='middle';
  for(const [fx,lbl] of labels)X.fillText(lbl,fx,y+TV.axisH/2);
}

// replay furniture: dashed line + shade + toolbar + info bar + bottom row
function replayCut(X, o){ // o={x, y0,y1, chip:'09 Jul \'26 05:22'}
  X.save();X.strokeStyle='#9598a1';X.setLineDash([4,4]);
  X.beginPath();X.moveTo(P(o.x)+0.5,o.y0);X.lineTo(P(o.x)+0.5,o.y1);X.stroke();X.setLineDash([]);
  X.fillStyle='rgba(41,98,255,0.055)';X.fillRect(o.x,o.y0,(o.x1||1920-TV.scaleW)-o.x,o.y1-o.y0);
  if(o.chip){
    X.fillStyle='#2a2e39';rr(X,o.x-52,o.y1+4,104,20,3);X.fill();
    X.fillStyle='#fff';X.font='500 11px '+SANS;X.textAlign='center';X.textBaseline='middle';
    X.fillText(o.chip,o.x,o.y1+14);
  }
  X.restore();
}
function replayToolbar(X, o){
  o=o||{};
  const bw=430,bh=44,bx=(1920-bw)/2,by=o.y==null?946:o.y;
  X.save();X.shadowColor='rgba(30,40,60,0.16)';X.shadowBlur=16;X.shadowOffsetY=4;
  X.fillStyle='#fff';rr(X,bx,by,bw,bh,8);X.fill();X.restore();
  X.strokeStyle=C.tvLine;rr(X,bx,by,bw,bh,8);X.stroke();
  X.fillStyle='#434651';X.font='500 14px '+SANS;X.textAlign='left';X.textBaseline='middle';
  X.fillText('⏮',bx+22,by+bh/2);
  X.fillText('Balken auswählen  ⌄',bx+52,by+bh/2);
  X.fillText(o.playing?'⏸':'▶',bx+236,by+bh/2);
  X.fillText('⏭',bx+272,by+bh/2);
  X.fillStyle=C.tvInk;X.font='600 14px '+SANS;X.fillText(o.speed||'10x',bx+312,by+bh/2);
  X.fillText(o.int||'1m',bx+356,by+bh/2);
  X.fillStyle='#787b86';X.fillText('⏹',bx+398,by+bh/2);
}
function replayInfoBar(X){
  const y=1012;
  X.fillStyle='#fff';X.fillRect(0,y-26,1920,26+TASK.y0-y+26);
  X.fillStyle='#eef4ff';X.fillRect(0,y-26,1920,26);
  X.fillStyle=C.tvBlue;X.font='600 13px '+SANS;X.textAlign='left';X.textBaseline='middle';
  X.fillText('◀◀',70,y-13);
  X.fillStyle='#434651';X.font='500 13px '+SANS;X.fillText('Handel im Wiedergabemodus',100,y-13);
  X.fillStyle='#787b86';X.textAlign='right';X.fillText('⌃      ⛶',1880,y-13);
}
function tvBottomRow(X, o){
  o=o||{};
  const y=1012;
  X.fillStyle='#fff';X.fillRect(0,y,1920,TASK.y0-y);
  X.strokeStyle=C.tvLine;X.beginPath();X.moveTo(0,y+0.5);X.lineTo(1920,y+0.5);X.stroke();
  X.fillStyle='#787b86';X.font='500 12px '+SANS;X.textAlign='left';X.textBaseline='middle';
  const rngs=['1T','5T','1M','3M','6M','YTD','1J','5J','Alle'];
  let x=70;for(const r of rngs){X.fillText(r,x,y+14);x+=X.measureText(r).width+18;}
  X.fillText('⏲',x+8,y+14);
  X.textAlign='right';X.fillStyle='#434651';
  X.fillText((o.clockUTC||'21:24:45')+' UTC+2',1850,y+14);
  X.fillStyle='#787b86';X.fillText('⤡',1900,y+14);
}
// CVD indicator row (bottom-left above axis)
function cvdRow(X, o){
  o=o||{};
  X.textBaseline='middle';X.textAlign='left';
  X.fillStyle=C.tvInk;X.font='500 13px '+SANS;X.fillText('CVD 1D 1',66,o.y);
  X.fillStyle='#7e57c2';X.beginPath();X.arc(140,o.y,7,0,7);X.fill();
  X.fillStyle='#fff';X.font='700 8px '+SANS;X.textAlign='center';X.fillText('↻',140,o.y+1);
  X.font='500 13px '+SANS;X.textAlign='left';
  let x=158;for(const [v,neg] of (o.vals||[['-32,61K',1],['-31,78K',1],['-33,91K',1],['-32,4K',1]])){
    X.fillStyle=neg?C.tvDn:C.tvUp;X.fillText(v,x,o.y);x+=X.measureText(v).width+10;}
}

// ============================================================================
// CANDLES (blue replay style + green/red) + series generator
// ============================================================================
// deterministic keyframed series: anchors=[[idx,price],...] + noise
function mkSeries(n, anchors, seed, vol){
  const rng=IFE.mulberry32(seed);
  const anchor=i=>{
    let a=anchors[0], b=anchors[anchors.length-1];
    for(let k=0;k<anchors.length-1;k++)if(i>=anchors[k][0]&&i<=anchors[k+1][0]){a=anchors[k];b=anchors[k+1];break;}
    const u=(i-a[0])/Math.max(1,b[0]-a[0]);
    return a[1]+(b[1]-a[1])*(u*u*(3-2*u));
  };
  const out=[];let prev=anchor(0);
  for(let i=0;i<n;i++){
    const base=anchor(i);
    const drift=(base-prev);
    const wob=IFE.noise1D(i*0.35,1,seed)*vol;
    const o=prev;
    const c=base+wob*0.6;
    const hi=Math.max(o,c)+Math.abs(IFE.noise1D(i*0.7+31,1,seed^0x55))*vol*0.9;
    const lo=Math.min(o,c)-Math.abs(IFE.noise1D(i*0.7+77,1,seed^0xaa))*vol*0.9;
    const v=200+Math.abs(IFE.noise1D(i*0.5+7,1,seed^0x11))*900+Math.abs(drift)*18;
    out.push({o,h:hi,l:lo,c,v});
    prev=c;
  }
  return out;
}
// draw candles: style 'blue' (replay) or 'gr'
function candles(X, o){
  const s=o.series, x0=o.x0, cw=o.cw, yOf=o.yOf;
  const upN=o.reveal==null?s.length:Math.min(s.length,o.reveal);
  const bw=Math.max(2,cw*0.62);
  for(let i=0;i<upN;i++){
    const k=s[i], x=x0+i*cw+cw/2;
    const up=k.c>=k.o;
    let bodyFill,bodyStroke,wick;
    if(o.style==='gr'){bodyFill=up?C.dcUp:C.dcDn;bodyStroke=bodyFill;wick=bodyFill;}
    else{bodyFill=up?'#ffffff':C.candleBlue;bodyStroke=C.candleBlue;wick=C.candleBlue;}
    X.strokeStyle=wick;X.lineWidth=Math.max(1,cw*0.10);
    X.beginPath();X.moveTo(P(x)+0.5,yOf(k.h));X.lineTo(P(x)+0.5,yOf(k.l));X.stroke();
    X.lineWidth=1;
    const yA=yOf(Math.max(k.o,k.c)), yB=yOf(Math.min(k.o,k.c));
    X.fillStyle=bodyFill;X.strokeStyle=bodyStroke;
    const bh=Math.max(1.5,yB-yA);
    X.fillRect(P(x-bw/2),P(yA),P(bw),P(bh));
    if(o.style!=='gr'&&up){X.strokeRect(P(x-bw/2)+0.5,P(yA)+0.5,P(bw)-1,Math.max(1,P(bh)-1));}
  }
}

// ============================================================================
// VOLUME PROFILE overlay (Fixed Range look) — VAL/VAH/POC
// ============================================================================
// prof: {x0,x1(px range), pLo,pHi, yOf, rows:[{p,up,dn}], poc, val, vah, alpha, drawFrac}
function volProfile(X, o){
  const a=o.alpha==null?1:o.alpha; if(a<=0)return;
  X.save();X.globalAlpha=a;
  const rows=o.rows, maxV=o.maxV||rows.reduce((m,r)=>Math.max(m,r.up+r.dn),0);
  const wMax=o.wMax||(o.x1-o.x0)*0.42;
  const frac=o.drawFrac==null?1:o.drawFrac;
  const nShow=Math.ceil(rows.length*frac);
  // range border box
  X.strokeStyle=hexA(C.tvBlue,0.55);X.setLineDash([3,3]);
  X.strokeRect(P(o.x0)+0.5,P(o.yOf(o.pHi))+0.5,P(o.x1-o.x0),P(o.yOf(o.pLo)-o.yOf(o.pHi)));
  X.setLineDash([]);
  for(let i=0;i<nShow;i++){
    const r=rows[i], y=o.yOf(r.p), rh=Math.max(2,o.rowH-1);
    const w=(r.up+r.dn)/maxV*wMax;
    const inVA=r.p>=o.val&&r.p<=o.vah;
    if(o.svp!==false){
      // Tim's SVP HD look: gold/amber filled profile, value-area rows brighter
      X.fillStyle=inVA?'rgba(232,176,64,0.92)':'rgba(232,176,64,0.55)';
      X.fillRect(o.x0,y-rh/2,w,rh);
    }else{
      const wUp=w*(r.up/(r.up+r.dn||1));
      X.fillStyle=inVA?'rgba(41,98,255,0.34)':'rgba(120,123,134,0.28)';
      X.fillRect(o.x0,y-rh/2,w,rh);
      X.fillStyle=inVA?'rgba(255,152,0,0.75)':'rgba(255,152,0,0.45)';
      X.fillRect(o.x0,y-rh/2,Math.min(w,wUp*0.55),rh);
    }
  }
  // VA shade across range
  X.fillStyle=o.svp!==false?'rgba(41,98,255,0.045)':'rgba(41,98,255,0.05)';
  X.fillRect(o.x0,o.yOf(o.vah),o.x1-o.x0,o.yOf(o.val)-o.yOf(o.vah));
  // POC / VAH / VAL lines
  const line=(p,col,dash,lw)=>{X.strokeStyle=col;X.lineWidth=lw||1.6;if(dash)X.setLineDash([5,4]);
    X.beginPath();X.moveTo(o.x0,P(o.yOf(p))+0.5);X.lineTo(o.x1,P(o.yOf(p))+0.5);X.stroke();X.setLineDash([]);X.lineWidth=1;};
  if(frac>0.55)line(o.poc,C.tvDn,false,2);
  if(frac>0.8){line(o.vah,C.tvBlue,true);line(o.val,C.tvBlue,true);}
  X.restore();
}
function vpHandles(X,o){ // drag handles on the range box
  const pts=[[o.x0,o.yOf(o.pLo)],[o.x1,o.yOf(o.pHi)],[o.x0,o.yOf(o.pHi)],[o.x1,o.yOf(o.pLo)],[(o.x0+o.x1)/2,o.yOf(o.pLo)],[(o.x0+o.x1)/2,o.yOf(o.pHi)]];
  for(const [x,y] of pts){X.fillStyle='#fff';X.strokeStyle=C.tvBlue;X.beginPath();X.arc(x,y,4.5,0,7);X.fill();X.stroke();}
}
function vpLabel(X, p, yOf, txt, col){
  const y=yOf(p);
  X.fillStyle=col;rr(X,1920-TV.scaleW+1,y-9,TV.scaleW-2,18,2);X.fill();
  X.fillStyle='#fff';X.font='700 10px '+SANS;X.textAlign='left';X.textBaseline='middle';
  X.fillText(txt,1920-TV.scaleW+5,y+0.5);
}

// ============================================================================
// POSITION TOOL (long/short) — Ziel/Stopp/G&V chips
// ============================================================================
function positionTool(X, o){
  // o={x0,x1, entry, stop, target, yOf, alpha, openPnl, qty, rr, dir:'long'|'short', amounts:{...}}
  const a=o.alpha==null?1:o.alpha; if(a<=0)return;
  X.save();X.globalAlpha=a;
  const yE=o.yOf(o.entry), yS=o.yOf(o.stop), yT=o.yOf(o.target);
  // zones
  X.fillStyle='rgba(8,153,129,0.15)';X.fillRect(o.x0,Math.min(yE,yT),o.x1-o.x0,Math.abs(yE-yT));
  X.fillStyle='rgba(242,54,69,0.13)';X.fillRect(o.x0,Math.min(yE,yS),o.x1-o.x0,Math.abs(yE-yS));
  X.strokeStyle='rgba(8,153,129,0.8)';X.setLineDash([4,3]);
  X.strokeRect(P(o.x0)+0.5,P(Math.min(yE,yT))+0.5,P(o.x1-o.x0),P(Math.abs(yE-yT)));
  X.strokeStyle='rgba(242,54,69,0.8)';
  X.strokeRect(P(o.x0)+0.5,P(Math.min(yE,yS))+0.5,P(o.x1-o.x0),P(Math.abs(yE-yS)));
  X.setLineDash([]);
  // handles
  for(const y of [yE,yS,yT]){X.fillStyle='#fff';X.strokeStyle='#787b86';X.strokeRect(P((o.x0+o.x1)/2-4),P(y-4),8,8);X.fillRect(P((o.x0+o.x1)/2-4)+1,P(y-4)+1,6,6);}
  // chips
  const chip=(y,txt,bg)=>{
    X.font='600 12px '+SANS;const w=X.measureText(txt).width+18;
    const cx=clamp((o.x0+o.x1)/2-w/2,o.x0,o.x1-w);
    X.fillStyle=bg;rr(X,cx,y-10,w,20,3);X.fill();
    X.fillStyle='#fff';X.textAlign='left';X.textBaseline='middle';X.fillText(txt,cx+9,y+0.5);
  };
  if(o.targetTxt)chip(yT,o.targetTxt,'#089981');
  if(o.stopTxt)chip(yS,o.stopTxt,'#f23645');
  if(o.midTxt)chip((yE+((o.dir==='short')?yS:yS))/2- (o.dir==='short'?0:0) , '', 'rgba(0,0,0,0)'); // placeholder no-op
  if(o.pnlTxt){ // center gray-blue box (2 lines)
    X.font='600 12px '+SANS;
    const lines=o.pnlTxt.split('\n');
    const w=Math.max(...lines.map(l=>X.measureText(l).width))+20;
    const cx=clamp((o.x0+o.x1)/2-w/2,o.x0,o.x1-w), cy=yE+(o.dir==='short'?18:-34);
    X.fillStyle='#5b7aa8';rr(X,cx,cy,w,lines.length*17+8,3);X.fill();
    X.fillStyle='#fff';X.textAlign='left';X.textBaseline='middle';
    lines.forEach((l,i)=>X.fillText(l,cx+10,cy+13+i*17));
  }
  X.restore();
}

// hand-drawn blue marker scribble (20px brush) — pts precomputed, progress 0..1
function scribble(X, pts, progress, o){
  o=o||{};
  const n=Math.floor(pts.length*clamp(progress,0,1));
  if(n<2)return;
  X.save();X.strokeStyle=o.col||'rgba(41,98,255,0.42)';X.lineWidth=o.w||14;X.lineCap='round';X.lineJoin='round';
  X.beginPath();X.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<n;i++)X.lineTo(pts[i][0],pts[i][1]);
  X.stroke();X.restore();
}
// build an ellipse-ish scribble path (deterministic wobble)
function scribbleEllipse(cx,cy,rx,ry,seed,turns){
  const pts=[];const N=64*(turns||1.15);
  for(let i=0;i<=N;i++){
    const th=-Math.PI/2+i/64*Math.PI*2;
    const wob=1+IFE.noise1D(i*0.13,1,seed)*0.09;
    pts.push([cx+Math.cos(th)*rx*wob,cy+Math.sin(th)*ry*wob]);
  }
  return pts;
}

// ============================================================================
// TV FOOTPRINT (Volumen-Fußabdruck) columns
// ============================================================================
// col: {x, rows:[{bid,ask,bi,ai}], up, delta:'-260', total:'1,38K', tot2:['820','560']}
function footprintCol(X, o){
  const cw=o.cw, rh=o.rh;
  const x=o.x, rows=o.rows;
  X.textBaseline='middle';X.textAlign='center';
  const fs=Math.max(9,Math.min(15,rh-4));
  X.font='600 '+fs+'px '+SANS;
  for(let i=0;i<rows.length;i++){
    const r=rows[i], y=o.y0+i*rh;
    // sell cell (left)
    let bg=r.bi?'#f23645':(r.bid>0?'#fbdfe2':'#fdf1f2');
    X.fillStyle=bg;X.fillRect(P(x-cw),P(y),P(cw-1),P(rh-1));
    X.fillStyle=r.bi?'#fff':'#b1353f';X.fillText(String(r.bid),x-cw/2,y+rh/2);
    // buy cell (right)
    bg=r.ai?'#089981':(r.ask>0?'#d6f0e5':'#eef8f3');
    X.fillStyle=bg;X.fillRect(P(x+1),P(y),P(cw-1),P(rh-1));
    X.fillStyle=r.ai?'#fff':'#0a7a56';X.fillText(String(r.ask),x+cw/2,y+rh/2);
  }
  // skeleton candle through middle
  const yTop=o.y0-8, yBot=o.y0+rows.length*rh+8;
  X.strokeStyle=o.up?C.tvUp:C.tvDn;X.lineWidth=2;
  X.beginPath();X.moveTo(P(x)+0.5,yTop);X.lineTo(P(x)+0.5,yBot);X.stroke();X.lineWidth=1;
  // totals above
  if(o.tot2){X.font='700 '+(fs+1)+'px '+SANS;
    X.fillStyle=C.tvDn;X.fillText(o.tot2[0],x-cw/2,o.y0-14);
    X.fillStyle=C.tvUp;X.fillText(o.tot2[1],x+cw/2,o.y0-14);}
  // Delta box below
  if(o.delta!=null){
    const by=o.y0+rows.length*rh+16, bw=cw*2.4, neg=String(o.delta).trim().startsWith('−')||String(o.delta).trim().startsWith('-');
    X.fillStyle='#1e222d';rr(X,x-bw/2,by,bw,34,3);X.fill();
    X.fillStyle='#9598a1';X.font='500 10px '+SANS;X.textAlign='left';
    X.fillText('Delta',x-bw/2+7,by+10);X.fillText('Gesamt',x-bw/2+7,by+24);
    X.textAlign='right';
    X.fillStyle=neg?'#ff7a86':'#39d689';X.font='700 11px '+SANS;X.fillText(String(o.delta),x+bw/2-7,by+10);
    X.fillStyle='#fff';X.fillText(String(o.total),x+bw/2-7,by+24);
  }
}

// ============================================================================
// DEEPCHART® orderflow terminal
// ============================================================================
const DC={top:{y0:0,h:34}, rail:{w:32}, bottom:{h:26}};
function dcChrome(X, o){
  o=o||{};
  // window fills 0..TASK.y0
  X.fillStyle=C.dcBg;X.fillRect(0,0,1920,TASK.y0);
  // top bar
  X.fillStyle=C.dcBar;X.fillRect(0,0,1920,DC.top.h);
  X.textBaseline='middle';X.fillStyle=C.dcText;X.font='400 15px '+SANS;X.textAlign='left';
  X.fillText('☰',14,DC.top.h/2);X.fillText('☷',48,DC.top.h/2);X.fillText('⬤',0,-99);
  X.fillText('⚙',82,DC.top.h/2);X.fillText('$',114,DC.top.h/2);X.fillText('▣',140,DC.top.h/2);
  // selects (center-left)
  const sel=(x,w,txt)=>{X.fillStyle=C.dcPill;rr(X,x,5,w,DC.top.h-10,4);X.fill();
    X.fillStyle=C.dcText;X.font='500 13px '+SANS;X.textAlign='left';X.fillText(txt,x+10,DC.top.h/2+1);
    X.fillStyle='#8b8e94';X.textAlign='right';X.fillText('⌄',x+w-8,DC.top.h/2+1);};
  sel(o.selX||330,120,o.symbol||'MNQ-202609');
  sel((o.selX||330)+130,86,o.preset||'10D - BT');
  sel((o.selX||330)+226,96,o.int||'1 Minute');
  X.fillStyle=C.dcText;X.textAlign='left';X.font='400 15px '+SANS;
  X.fillText('⧉',(o.selX||330)+338,DC.top.h/2);X.fillText('⊕',(o.selX||330)+366,DC.top.h/2);
  // window controls
  X.fillStyle=C.dcText;X.textAlign='center';X.font='400 15px '+SANS;
  X.fillText('◳',1822,DC.top.h/2);X.fillText('−',1850,DC.top.h/2);X.fillText('□',1876,DC.top.h/2);X.fillText('×',1902,DC.top.h/2);
}
function dcRail(X, x0, o){
  o=o||{};
  const y0=DC.top.h, y1=TASK.y0-DC.bottom.h;
  X.fillStyle=C.dcBar;X.fillRect(x0,y0,DC.rail.w,y1-y0);
  const glyphs=['▸','✋','+','⊕','⌕','◎','✦','◈','−','|','↤','✎','✿','▭','◯','T','☰','≡','✂','⚑'];
  X.textAlign='center';X.textBaseline='middle';X.font='400 13px '+SANS;
  for(let i=0;i<glyphs.length;i++){
    const cy=y0+18+i*34;if(cy>y1-12)break;
    const active=o.active===i;
    if(active){X.fillStyle='#34363c';rr(X,x0+3,cy-12,DC.rail.w-6,24,4);X.fill();}
    X.fillStyle=active?'#7ec3f0':'#8b8e94';X.fillText(glyphs[i],x0+DC.rail.w/2,cy);
  }
}
function dcBottomBar(X, o){
  o=o||{};
  const y=TASK.y0-DC.bottom.h;
  X.fillStyle=C.dcBar;X.fillRect(0,y,1920,DC.bottom.h);
  X.textBaseline='middle';X.font='400 11px '+SANS;
  X.fillStyle=C.dcText;X.textAlign='left';
  X.fillText('▤  Templates',o.x0||46,y+DC.bottom.h/2);
  const items=o.items||['Order Flow - Vol. Profile','Order Flow - Bid/Ask','Dly Vol. Profile','Dly Delta Profile','Dly Profile Values','Wkly Vol. Profile','Wkly Delta Profile','Comp. Vol. Profile'];
  let x=(o.x0||46)+120;
  for(let i=0;i<items.length;i++){
    const on=i===(o.selected==null?0:o.selected);
    X.strokeStyle=on?'#7ec3f0':'#6b6e74';X.beginPath();X.arc(x+6,y+DC.bottom.h/2,5,0,7);X.stroke();
    if(on){X.fillStyle='#7ec3f0';X.beginPath();X.arc(x+6,y+DC.bottom.h/2,2.6,0,7);X.fill();}
    X.fillStyle=on?'#e8eaed':'#9b9ea4';X.fillText(items[i],x+16,y+DC.bottom.h/2);
    x+=X.measureText(items[i]).width+34;
  }
  X.textAlign='right';X.fillStyle='#9b9ea4';
  X.fillText('DOM Trading',1770,y+DC.bottom.h/2);
  X.strokeStyle='#6b6e74';X.beginPath();X.arc(1690,y+DC.bottom.h/2,5,0,7);X.stroke();
  X.fillText('Trading panel',1878,y+DC.bottom.h/2);
  X.fillStyle='#7ec3f0';rr(X,1884,y+DC.bottom.h/2-6,26,12,6);X.fill();
  X.fillStyle='#fff';X.beginPath();X.arc(1902,y+DC.bottom.h/2,5,0,7);X.fill();
}
// orderflow bubble
function dcBubble(X, x, y, val, buy, big){
  const w=Math.max(16,Math.min(44,8+String(val).length*7+(big?10:0))), h=big?20:16;
  X.fillStyle=buy?'rgba(46,204,113,0.92)':'rgba(233,30,140,0.92)';
  rr(X,x-w/2,y-h/2,w,h,h/2);X.fill();
  X.strokeStyle=buy?'#1f9e57':'#b81570';X.stroke();
  X.fillStyle='#fff';X.font='600 '+(big?12:10)+'px '+SANS;X.textAlign='center';X.textBaseline='middle';
  X.fillText(String(val),x,y+0.5);
}
// zone box with label chip
function dcZone(X, o){
  const a=o.alpha==null?1:o.alpha;if(a<=0)return;
  X.save();X.globalAlpha=a;
  X.fillStyle=o.kind==='sup'?'rgba(46,204,113,0.20)':'rgba(239,83,80,0.16)';
  X.fillRect(o.x0,o.y0,o.x1-o.x0,o.y1-o.y0);
  X.strokeStyle=o.kind==='sup'?'rgba(38,166,154,0.9)':'rgba(239,83,80,0.9)';
  X.setLineDash([5,3]);X.strokeRect(P(o.x0)+0.5,P(o.y0)+0.5,P(o.x1-o.x0),P(o.y1-o.y0));X.setLineDash([]);
  if(o.label){
    X.font='600 12px '+SANS;const w=X.measureText(o.label).width+16;
    X.fillStyle='rgba(30,32,38,0.92)';rr(X,o.x0+6,o.y0+6,w,20,3);X.fill();
    X.fillStyle=o.kind==='sup'?'#7de8a8':'#ff9c99';X.textAlign='left';X.textBaseline='middle';
    X.fillText(o.label,o.x0+14,o.y0+16);
  }
  X.restore();
}
// delta heatmap footer (right panel): ΣV orange row + ΔV/Δ% purple-green rows
function dcDeltaFooter(X, o){
  // o={x0,x1,y0, cols:[{sv:'12K', dv:-440, dp:-4}], rowH}
  const n=o.cols.length, cw=(o.x1-o.x0)/n, rh=o.rowH||42;
  X.textAlign='center';X.textBaseline='middle';
  for(let i=0;i<n;i++){
    const c=o.cols[i], x=o.x0+i*cw;
    // ΣV
    X.fillStyle='#f5a623';X.fillRect(P(x),P(o.y0),P(cw-2),P(rh-2));
    X.fillStyle='#3b2c05';X.font='700 15px '+SANS;X.fillText(c.sv,x+cw/2,o.y0+rh/2);
    // ΔV
    const dvNeg=c.dv<0;
    const mag=Math.min(1,Math.abs(c.dv)/(o.dvMax||2300));
    X.fillStyle=dvNeg?hexA('#7b1fa2',0.35+0.6*mag):hexA('#43a047',0.30+0.6*mag);
    X.fillRect(P(x),P(o.y0+rh),P(cw-2),P(rh-2));
    X.fillStyle=dvNeg&&mag>0.4?'#fff':'#1c2b1e';if(dvNeg&&mag<=0.4)X.fillStyle='#fff';
    X.font='600 14px '+SANS;X.fillText(fmtDelta(c.dv),x+cw/2,o.y0+rh+rh/2);
    // Δ%
    const dpNeg=c.dp<0, mag2=Math.min(1,Math.abs(c.dp)/(o.dpMax||15));
    X.fillStyle=dpNeg?hexA('#7b1fa2',0.30+0.55*mag2):hexA('#43a047',0.25+0.55*mag2);
    X.fillRect(P(x),P(o.y0+rh*2),P(cw-2),P(rh-2));
    X.fillStyle=dpNeg&&mag2>0.4?'#fff':'#1c2b1e';if(dpNeg&&mag2<=0.4)X.fillStyle='#fff';
    X.fillText(String(c.dp),x+cw/2,o.y0+rh*2+rh/2);
  }
  // row labels right
  X.fillStyle='#c9ccd1';X.font='500 12px '+SANS;X.textAlign='left';
  X.fillText('Σ V',o.x1+8,o.y0+rh/2);
  X.fillText('Δ V',o.x1+8,o.y0+rh+rh/2);
  X.fillText('Δ %',o.x1+8,o.y0+rh*2+rh/2);
}
function fmtDelta(v){
  if(Math.abs(v)>=1000){const s=(Math.abs(v)/1000).toFixed(1).replace('.',',');return (v<0?'−':'')+s+'K';}
  return (v<0?'−':'')+Math.abs(v);
}
// footprint number grid (right panel) — per-candle stacked bid|ask cells
function dcFpColumn(X, o){
  // o={x, y0, rh, cells:[{b,a,hb,ha,poc}], volUp} — hb/ha: 0 none,1 green,2 purple
  X.textBaseline='middle';X.font='500 11px '+SANS;
  const cw=o.cw||34;
  for(let i=0;i<o.cells.length;i++){
    const c=o.cells[i], y=o.y0+i*o.rh;
    // bid cell
    X.fillStyle=c.hb===1?'#b5e6b7':c.hb===2?'#d1a8e8':'#ffffff';
    X.fillRect(P(o.x),P(y),P(cw-1),P(o.rh-1));
    X.fillStyle='#8a4a52';X.textAlign='center';X.fillText(String(c.b),o.x+cw/2,y+o.rh/2);
    // ask cell
    X.fillStyle=c.ha===1?'#b5e6b7':c.ha===2?'#d1a8e8':'#ffffff';
    X.fillRect(P(o.x+cw),P(y),P(cw-1),P(o.rh-1));
    X.fillStyle='#2e7d49';X.fillText(String(c.a),o.x+cw*1.5,y+o.rh/2);
    if(c.poc){X.strokeStyle='#f5c542';X.lineWidth=1.4;X.strokeRect(P(o.x)+0.5,P(y)+0.5,P(cw*2-1),P(o.rh-1));X.lineWidth=1;}
  }
  // thin volume bar at left
  if(o.volH){X.fillStyle=o.volUp?'#26a69a':'#ef5350';X.fillRect(P(o.x-6),P(o.y0+o.volOff||0),4,P(o.volH));}
}

// helper: rounded rect on arbitrary ctx
function rr(X,x,y,w,h,r){x=P(x);y=P(y);w=P(w);h=P(h);X.beginPath();X.moveTo(x+r,y);X.arcTo(x+w,y,x+w,y+h,r);X.arcTo(x+w,y+h,x,y+h,r);X.arcTo(x,y+h,x,y,r);X.arcTo(x,y,x+w,y,r);X.closePath();}

// ============================================================================
// VO gap time-map: gaps=[{at:voSec,dur:gapSec}] sorted by at
// sceneT(voT) = voT + Σ dur(at<=voT); voOf(sceneT) inverse (voice frozen in gaps)
// ============================================================================
function mkTimeMap(gaps){
  gaps=(gaps||[]).slice().sort((a,b)=>a.at-b.at);
  function sceneT(voT){let s=voT;for(const g of gaps)if(g.at<=voT)s+=g.dur;return s;}
  function voOf(t){
    let off=0;
    for(const g of gaps){
      const gs=g.at+off;
      if(t<gs)break;
      if(t<gs+g.dur)return g.at;   // inside gap → voice frozen at gap start
      off+=g.dur;
    }
    return t-off;
  }
  return {sceneT, voOf, total:d=>sceneT(d)};
}
// word onset lookup: find nth occurrence of word (prefix match, case-insens)
function onsetFinder(words){
  return function on(txt, nth){
    nth=nth||1;let c=0;const q=txt.toLowerCase();
    for(const w of words){
      const ww=w.w.toLowerCase().replace(/[^a-z0-9'%-]/g,'');
      if(ww.startsWith(q)){c++;if(c===nth)return w.t;}
    }
    return 0;
  };
}

root.TVC={C,SANS,TAB,ADDR,PAGE,TASK,TV,DC,
  browserChrome,winTaskbar,tvToolbar,tvLeftRail,tvFloatBar,tvLegend,tvWatermark,
  priceScale,priceTag,fmtDE,timeAxis,replayCut,replayToolbar,replayInfoBar,tvBottomRow,cvdRow,
  mkSeries,candles,volProfile,vpHandles,vpLabel,positionTool,scribble,scribbleEllipse,
  footprintCol,dcChrome,dcRail,dcBottomBar,dcBubble,dcZone,dcDeltaFooter,dcFpColumn,fmtDelta,
  rr,mkTimeMap,onsetFinder,clamp,eo,es,hexA};
})(typeof window!=='undefined'?window:globalThis);
