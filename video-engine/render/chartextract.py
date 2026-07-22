#!/usr/bin/env python3
"""Extract real chart data from Tim's TradingView frames using OpenCV + OCR.
Outputs: price-axis calibration, red POC line, yellow VP distribution, blue candle OHLC.
Usage: chartextract.py <frame.jpg> [--dump out.json]
"""
import sys, json, re
import cv2, numpy as np, pytesseract

img = cv2.imread(sys.argv[1])
H, W = img.shape[:2]
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# ---------------------------------------------------------------- price axis
# TradingView price scale is the right strip. OCR the numbers + y positions.
def calibrate_axis():
    x0 = int(W*0.935); SC = 3                # right price-scale strip, scale factor
    strip = img[120:H-140, x0:W]
    gray = cv2.cvtColor(strip, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=SC, fy=SC, interpolation=cv2.INTER_CUBIC)
    _, th = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
    data = pytesseract.image_to_data(th, config='--psm 6 -c tessedit_char_whitelist=0123456789.,',
                                     output_type=pytesseract.Output.DICT)
    pts = []
    for i, t in enumerate(data['text']):
        digits = re.sub(r'\D', '', t.strip())
        if len(digits) != 7: continue          # gold labels are X.XXX,XXX = 7 digits
        price = int(digits) / 1000.0           # separator-agnostic (OCR mixes . and ,)
        if not (3500 < price < 5000): continue
        yc = 120 + (data['top'][i] + data['height'][i]/2)/SC
        pts.append((yc, price))
    if len(pts) < 2: return None
    ys = np.array([p[0] for p in pts]); ps = np.array([p[1] for p in pts])
    A = np.polyfit(ys, ps, 1)               # price = A[0]*y + A[1]
    return {'slope': float(A[0]), 'intercept': float(A[1]),
            'price_at': lambda y: A[0]*y + A[1],
            'y_at': lambda p: (p - A[1]) / A[0], 'labels': pts}

# ---------------------------------------------------------------- red POC line
def find_poc(cal):
    r, g, b = rgb[:,:,0].astype(int), rgb[:,:,1].astype(int), rgb[:,:,2].astype(int)
    red = (r > 180) & (g < 90) & (b < 90)
    rowsum = red[:, int(W*0.1):int(W*0.9)].sum(axis=1)
    y = int(np.argmax(rowsum))
    if rowsum[y] < W*0.15: return None       # no strong horizontal red line
    return {'y': y, 'price': round(cal['price_at'](y), 3) if cal else None, 'strength': int(rowsum[y])}

# ---------------------------------------------------------------- yellow VP
def find_vp(cal):
    r, g, b = rgb[:,:,0].astype(int), rgb[:,:,1].astype(int), rgb[:,:,2].astype(int)
    yellow = (r > 180) & (g > 140) & (b < 130) & (r - b > 70)
    # restrict to chart CANVAS only (exclude toolbar, time-axis, taskbar, side rails)
    mask = np.zeros_like(yellow); mask[150:880, 90:1200] = True
    yellow = yellow & mask
    # a VP profile column has many yellow rows; find the densest x-band
    colcnt = yellow.sum(axis=0)
    if colcnt.max() < 30: return None        # no real profile present
    xl = int(np.argmax(colcnt[:1200] > 15))  # first x with a tall yellow column = profile left edge
    width = yellow[:, xl:xl+int(W*0.30)].sum(axis=1)   # per-row horizontal extent
    ys = np.where(width > 2)[0]
    if len(ys) == 0: return None
    poc_y = int(np.argmax(width))
    top_y, bot_y = int(ys.min()), int(ys.max())
    # value area ~70% by row-width
    tot = width.sum(); acc = width[poc_y]; a = b2 = poc_y
    while acc < tot*0.7 and (a > top_y or b2 < bot_y):
        up = width[a-1] if a > top_y else -1
        dn = width[b2+1] if b2 < bot_y else -1
        if up >= dn: a -= 1; acc += width[a]
        else: b2 += 1; acc += width[b2]
    out = {'x_left': int(xl), 'poc_y': poc_y, 'top_y': top_y, 'bot_y': bot_y, 'vah_y': a, 'val_y': b2}
    if cal:
        out.update(poc_price=round(cal['price_at'](poc_y),3),
                   vah_price=round(cal['price_at'](a),3),
                   val_price=round(cal['price_at'](b2),3),
                   hi_price=round(cal['price_at'](top_y),3),
                   lo_price=round(cal['price_at'](bot_y),3))
    return out

# ---------------------------------------------------------------- blue candles
def find_candles(cal):
    r, g, b = rgb[:,:,0].astype(int), rgb[:,:,1].astype(int), rgb[:,:,2].astype(int)
    blue = (b > 150) & (r < 120) & (g < 150) & (b - r > 60)      # TV replay blue
    x0, x1 = int(W*0.02), int(W*0.955)
    colcount = blue[120:H-140, :].sum(axis=0)
    cols = np.where(colcount > 4)[0]
    cols = cols[(cols > x0) & (cols < x1)]
    if len(cols) == 0: return []
    # group contiguous columns into candles
    groups = []; start = cols[0]; prev = cols[0]
    for c in cols[1:]:
        if c - prev > 3:
            groups.append((start, prev)); start = c
        prev = c
    groups.append((start, prev))
    candles = []
    for (cs, ce) in groups:
        if ce - cs < 1: continue
        sub = blue[120:H-140, cs:ce+1]
        rows = np.where(sub.any(axis=1))[0]
        if len(rows) == 0: continue
        hi_y, lo_y = 120+rows.min(), 120+rows.max()
        # body = columns where blue is dense (the wick is 1-2px wide, body wider)
        widths = sub.sum(axis=1)
        thr = max(2, (ce-cs)*0.5)
        body_rows = np.where(widths >= thr)[0]
        if len(body_rows):
            bt_y, bb_y = 120+body_rows.min(), 120+body_rows.max()
        else:
            bt_y, bb_y = hi_y, lo_y
        # drop artifacts: crosshair / replay dashed line = full-height thin verticals
        if cal and (cal['price_at'](hi_y) - cal['price_at'](lo_y)) > 25: continue
        cand = {'x': int((cs+ce)/2), 'hi_y': int(hi_y), 'lo_y': int(lo_y), 'bt_y': int(bt_y), 'bb_y': int(bb_y)}
        if cal:
            cand.update(high=round(cal['price_at'](hi_y),3), low=round(cal['price_at'](lo_y),3),
                        body_top=round(cal['price_at'](bt_y),3), body_bot=round(cal['price_at'](bb_y),3))
        candles.append(cand)
    return candles

cal = calibrate_axis()
res = {'file': sys.argv[1], 'W': W, 'H': H}
if cal:
    res['axis'] = {'slope': cal['slope'], 'intercept': cal['intercept'],
                   'n_labels': len(cal['labels']),
                   'sample_labels': [(round(y), p) for y, p in cal['labels'][:6]]}
res['poc'] = find_poc(cal)
res['vp'] = find_vp(cal)
c = find_candles(cal)
res['candles_n'] = len(c)
res['candles'] = c

print(json.dumps({k:v for k,v in res.items() if k!='candles'}, indent=1, default=str))
print(f"\n{len(c)} candles. first 8 OHLC-ish (high/low/bodyTop/bodyBot):")
for cc in c[:8]:
    if 'high' in cc: print(f"  x={cc['x']:4d}  H={cc['high']:.3f} L={cc['low']:.3f} bT={cc['body_top']:.3f} bB={cc['body_bot']:.3f}")
if '--dump' in sys.argv:
    out = sys.argv[sys.argv.index('--dump')+1]
    json.dump(res, open(out,'w'), default=str, indent=1)
    print('dumped', out)
