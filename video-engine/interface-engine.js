/* ============================================================================
   interface-engine.js — deterministic "real screen recording" engine
   Implements EDITING-BRAIN §11. Pure f(t): renderAt(ms) only interpolates
   precomputed, seeded descriptors. No RNG per frame, no Date.now / Math.random
   at render time (build time only). Embeddable in any lesson canvas HTML.

   Exposes global IFE = {
     mulberry32, hashSeed, noise1D,
     windMouse, arcLen, fittsMT, minJerk,
     Cursor,            // scenario builder → sample(t)
     drawCursor         // sharp OS cursor bitmap at hotspot
   }
   ============================================================================ */
(function (root) {
  'use strict';

  // ---- seeded PRNG (mulberry32) + integer hash (splitmix-ish) ----------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed() {
    // combine ints → uint32 seed
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      h ^= (arguments[i] | 0);
      h = Math.imul(h, 16777619) >>> 0;
      h ^= h >>> 13;
    }
    return h >>> 0;
  }
  // value noise over hashed integer lattice — pure f(t). freq in Hz.
  function frac(x) { return x - Math.floor(x); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function smooth(u) { return u * u * (3 - 2 * u); }
  function latticeRnd(i, seed) {
    // deterministic pseudo-random in [-1,1] for integer i
    let h = hashSeed(i, seed);
    return (h / 4294967296) * 2 - 1;
  }
  function noise1D(t, freq, seed) {
    const x = t * freq, i = Math.floor(x), f = smooth(frac(x));
    return lerp(latticeRnd(i, seed), latticeRnd(i + 1, seed), f);
  }

  // ---- WindMouse path (ben.land) — build-time only ---------------------------
  const SQ3 = Math.sqrt(3), SQ5 = Math.sqrt(5);
  function windMouse(x0, y0, x1, y1, rng, opt) {
    opt = opt || {};
    let G = opt.G == null ? 9 : opt.G;     // gravity
    let W = opt.W == null ? 3 : opt.W;     // wind
    let M = opt.M == null ? 15 : opt.M;    // max step
    const D = opt.D == null ? 12 : opt.D;  // damping dist
    let cx = x0, cy = y0, vX = 0, vY = 0, wX = 0, wY = 0;
    const pts = [[x0, y0]];
    let guard = 0;
    let dist = Math.hypot(x1 - cx, y1 - cy);
    while (dist > 1 && guard++ < 5000) {
      const Wm = Math.min(W, dist);
      if (dist >= D) {
        wX = wX / SQ3 + (2 * rng() - 1) * Wm / SQ5;
        wY = wY / SQ3 + (2 * rng() - 1) * Wm / SQ5;
      } else {
        wX /= SQ3; wY /= SQ3;
        if (M < 3) M = 3 + rng() * 3; else M /= SQ5;
      }
      vX += wX + G * (x1 - cx) / dist;
      vY += wY + G * (y1 - cy) / dist;
      const vm = Math.hypot(vX, vY);
      if (vm > M) {
        const clip = M / 2 + rng() * M / 2;
        const s = clip / vm; vX *= s; vY *= s;
      }
      cx += vX; cy += vY;
      pts.push([cx, cy]);
      dist = Math.hypot(x1 - cx, y1 - cy);
    }
    pts.push([x1, y1]);
    return pts;
  }

  // cumulative arc-length LUT + sampler at(fraction 0..1)
  function arcLen(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    const total = cum[cum.length - 1] || 1;
    return {
      total,
      at: function (frac0) {
        const target = Math.max(0, Math.min(1, frac0)) * total;
        // binary search
        let lo = 0, hi = cum.length - 1;
        while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m + 1; else hi = m; }
        const i = Math.max(1, lo);
        const seg = cum[i] - cum[i - 1] || 1;
        const u = (target - cum[i - 1]) / seg;
        return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
      }
    };
  }

  // ---- Fitts duration (ms) + min-jerk easing --------------------------------
  function fittsMT(D, W, rng) {
    const ID = Math.log2(D / Math.max(1, W) + 1);
    let mt = (120 + 180 * ID) * (0.9 + 0.25 * rng());
    return Math.max(220, Math.min(1300, mt));
  }
  function minJerk(tau) {
    tau = tau < 0 ? 0 : tau > 1 ? 1 : tau;
    const t = Math.pow(tau, 0.88); // warp: peak ~44% of MT
    return 10 * t * t * t - 15 * t * t * t * t + 6 * t * t * t * t * t;
  }

  // ---- Cursor scenario ------------------------------------------------------
  // actions: {move:[x,y], W?}, {click, hold?}, {dblclick}, {wait:ms},
  //          {drag:[x,y], W?, hold?}, {scroll:px, dur?}, {shape:'crosshair'|...}
  // opts: {start:[x,y], seed, os:'mac'|'win'}
  function Cursor(actions, opts) {
    opts = opts || {};
    const seed = opts.seed == null ? 1337 : opts.seed;
    const os = opts.os || 'win';
    let x = opts.start ? opts.start[0] : 960;
    let y = opts.start ? opts.start[1] : 540;
    let t = opts.t0 || 0;                 // ms clock
    let shape = 'default';
    const ev = [];                        // timeline segments

    function pushMove(tx, ty, W, isDrag) {
      const idx = ev.length;
      const rng = mulberry32(hashSeed(seed, idx, 11));
      const D = Math.hypot(tx - x, ty - y);
      if (D < 0.5) { return; }
      const path = windMouse(x, y, tx, ty, rng, isDrag ? { W: 2, G: 11, M: 10 } : {});
      const lut = arcLen(path);
      let mt = fittsMT(D, W || 24, rng);
      if (isDrag) mt *= 1.15;
      // undershoot / correction (skip for big targets or drags)
      const doCorr = !isDrag && (W || 24) < 80 && D > 60;
      const seg = { type: isDrag ? 'drag' : 'move', t0: t, mt, lut, x0: x, y0: y, seed: hashSeed(seed, idx, 7), drag: isDrag };
      ev.push(seg);
      t += mt;
      if (doCorr) {
        // primary landed slightly off; add dwell + small corrective hop
        const rc = mulberry32(hashSeed(seed, idx, 23));
        const pauseMs = 70 + 50 * rc();
        // scatter of primary landing
        const sd = (W || 24) / 5;
        const offx = (rc() * 2 - 1) * sd, offy = (rc() * 2 - 1) * sd;
        // rewrite primary end to the scattered point by adding a correction move
        ev.push({ type: 'wait', t0: t, dur: pauseMs, x: tx + offx, y: ty + offy });
        t += pauseMs;
        const cpath = windMouse(tx + offx, ty + offy, tx, ty, mulberry32(hashSeed(seed, idx, 31)), { G: 12 });
        const cl = arcLen(cpath);
        const cmt = 120 + 60 * rc();
        ev.push({ type: 'move', t0: t, mt: cmt, lut: cl, x0: tx + offx, y0: ty + offy, seed: hashSeed(seed, idx, 41), drag: false });
        t += cmt;
      }
      x = tx; y = ty;
    }

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      // absolute beat-lock: pad a wait so this action does not start before a.at (ms)
      if (a.at != null && a.at > t) { ev.push({ type: 'wait', t0: t, dur: a.at - t, x, y }); t = a.at; }
      if (a.shape) { shape = a.shape; ev.push({ type: 'shapeset', t0: t, shape }); }
      if (a.move) pushMove(a.move[0], a.move[1], a.W, false);
      if (a.wait) { ev.push({ type: 'wait', t0: t, dur: a.wait, x, y }); t += a.wait; }
      if (a.click || a.dblclick) {
        const rc = mulberry32(hashSeed(seed, i, 53));
        const dwell = (a.decision ? 400 : 120) + (a.decision ? 300 : 180) * rc() * rc();
        ev.push({ type: 'wait', t0: t, dur: dwell, x, y }); t += dwell;
        const hold = a.hold || (70 + 80 * rc());
        ev.push({ type: 'click', t0: t, dur: hold, x, y }); t += hold;
        if (a.dblclick) {
          const gap = 80 + 90 * rc(); ev.push({ type: 'wait', t0: t, dur: gap, x, y }); t += gap;
          ev.push({ type: 'click', t0: t, dur: hold * 0.9, x, y }); t += hold * 0.9;
        }
        ev.push({ type: 'wait', t0: t, dur: 60 + 60 * rc(), x, y }); t += 60 + 60 * rc();
      }
      if (a.drag) {
        // press (small dwell) then drag path
        const rc = mulberry32(hashSeed(seed, i, 67));
        ev.push({ type: 'press', t0: t, dur: 90 + 60 * rc(), x, y }); t += 90 + 60 * rc();
        pushMove(a.drag[0], a.drag[1], a.W || 6, true);
        ev.push({ type: 'release', t0: t, dur: 40, x, y }); t += 40;
      }
      if (a.scroll) {
        const dur = a.dur || 500; ev.push({ type: 'scroll', t0: t, dur, px: a.scroll, x, y }); t += dur;
      }
    }
    const totalMs = t;

    // sample(ms) → {x,y,pressed,shape,scrollY,clickAge}
    function sample(ms) {
      let px = opts.start ? opts.start[0] : 960, py = opts.start ? opts.start[1] : 540;
      let pressed = false, sh = 'default', scrollY = 0, clickAge = Infinity;
      for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        if (e.type === 'shapeset') { if (ms >= e.t0) sh = e.shape; continue; }
        if (e.type === 'scroll') { if (ms >= e.t0) scrollY += e.px * (1 - Math.pow(1 - Math.min(1, (ms - e.t0) / e.dur), 3)); }
        if (ms < e.t0) break;
        if (e.type === 'move' || e.type === 'drag') {
          if (ms <= e.t0 + e.mt) {
            const p = e.lut.at(minJerk((ms - e.t0) / e.mt));
            px = p[0]; py = p[1];
            // signal-dependent tremor
            const tt = ms / 1000;
            const v = Math.abs(e.lut.total / e.mt);
            const amp = 0.3 + 0.02 * v;
            const dirx = 0, diry = 0;
            px += amp * noise1D(tt, 9, e.seed) * 0.6;
            py += amp * noise1D(tt, 9, e.seed ^ 0x9e37) * 0.6;
            if (e.drag) pressed = true;
            return { x: px, y: py, pressed, shape: e.drag ? 'grabbing' : sh, scrollY, clickAge };
          } else { const end = e.lut.at(1); px = end[0]; py = end[1]; if (e.drag) pressed = true; }
        } else if (e.type === 'wait') {
          px = e.x; py = e.y;
        } else if (e.type === 'press' || e.type === 'click') {
          px = e.x; py = e.y; if (ms <= e.t0 + e.dur) { pressed = true; clickAge = 0; }
          else clickAge = Math.min(clickAge, ms - (e.t0 + e.dur));
        } else if (e.type === 'release') { px = e.x; py = e.y; pressed = false; }
      }
      // idle micro-drift when parked (rare, tiny) — keep essentially still
      return { x: px, y: py, pressed, shape: sh, scrollY, clickAge };
    }
    return { sample, totalMs, os, events: ev };
  }

  // ---- sharp OS cursor bitmap (drawn at hotspot) ----------------------------
  function drawCursor(ctx, x, y, shape, pressed, os) {
    os = os || 'win';
    x = Math.round(x); y = Math.round(y);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (shape === 'crosshair') {
      // TradingView-style thin crosshair is drawn by the chart; here draw a small plus
      ctx.strokeStyle = 'rgba(120,134,150,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 7, y + 0.5); ctx.lineTo(x + 7, y + 0.5);
      ctx.moveTo(x + 0.5, y - 7); ctx.lineTo(x + 0.5, y + 7); ctx.stroke();
      ctx.restore(); return;
    }
    if (shape === 'text') {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
      ctx.moveTo(x - 3, y - 9); ctx.lineTo(x + 3, y - 9); ctx.moveTo(x - 3, y + 9); ctx.lineTo(x + 3, y + 9);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
      ctx.restore(); return;
    }
    // arrow (default) or pointer (hand). draw filled polygon with white outline + shadow.
    const white = os === 'win' ? '#f6f6f6' : '#fff';
    const black = '#111';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    if (shape === 'pointer') {
      // hand cursor — simplified pointing hand
      ctx.translate(x - 5, y - 1);
      ctx.fillStyle = white; ctx.strokeStyle = black; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(4, 0); ctx.lineTo(4, 10); ctx.lineTo(2, 8); ctx.lineTo(0, 10);
      ctx.lineTo(2, 14); ctx.lineTo(2, 20); ctx.lineTo(12, 20); ctx.lineTo(13, 12);
      ctx.lineTo(13, 8); ctx.lineTo(11, 8); ctx.lineTo(11, 6); ctx.lineTo(9, 6);
      ctx.lineTo(9, 5); ctx.lineTo(7, 5); ctx.lineTo(7, 4); ctx.lineTo(6, 4); ctx.lineTo(6, 0);
      ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
      ctx.restore(); return;
    }
    // standard arrow, hotspot at top-left tip (x,y)
    ctx.fillStyle = black; ctx.strokeStyle = white; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    const s = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 16 * s);
    ctx.lineTo(x + 4 * s, y + 12 * s);
    ctx.lineTo(x + 7 * s, y + 18 * s);
    ctx.lineTo(x + 9.5 * s, y + 17 * s);
    ctx.lineTo(x + 6.5 * s, y + 11 * s);
    ctx.lineTo(x + 11 * s, y + 11 * s);
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.stroke(); ctx.shadowColor = 'transparent'; ctx.fill();
    if (pressed) { // subtle press ring
      ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(41,98,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  root.IFE = {
    mulberry32, hashSeed, noise1D, windMouse, arcLen, fittsMT, minJerk, Cursor, drawCursor
  };
})(typeof window !== 'undefined' ? window : globalThis);
