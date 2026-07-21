#!/usr/bin/env python3
"""Motion audit: at each 5s checkpoint, diff adjacent frames and report which
regions changed. Flags 'movement when it should be still'. Also builds contact
sheets for visual review.

Usage: motionaudit.py <framesdir> <fps> [step_sec]
Outputs per-checkpoint: changed-pixel count, bounding boxes of change clusters.
"""
import sys, os, glob
from PIL import Image, ImageChops, ImageDraw
import numpy as np

frames_dir=sys.argv[1]
fps=float(sys.argv[2]) if len(sys.argv)>2 else 30.0
step=float(sys.argv[3]) if len(sys.argv)>3 else 5.0
THRESH=16   # per-channel diff to count a pixel as "changed"
OUT=os.path.join(os.path.dirname(frames_dir.rstrip('/')), 'audit_'+os.path.basename(frames_dir.rstrip('/')))
os.makedirs(OUT, exist_ok=True)

fs=sorted(glob.glob(os.path.join(frames_dir,'f*.jpg')))
n=len(fs)
if n==0: sys.exit('no frames in '+frames_dir)
dur=n/fps
print(f'{frames_dir}: {n} frames, {dur:.1f}s @ {fps}fps')

def load(i):
    return np.asarray(Image.open(fs[i]).convert('RGB'), dtype=np.int16)

# region labels for reporting (x0,y0,x1,y1) in 1920x1080
REGIONS=[
 ('top-chrome',0,0,1920,84),
 ('nav/toolbar',0,84,1920,150),
 ('chart-left',46,150,1180,1012),
 ('chart-right',1180,150,1856,1012),
 ('scale',1856,150,1920,1012),
 ('lower-third',560,980,1360,1046),
 ('taskbar',0,1040,1920,1080),
 ('cosmo',20,760,320,1080),
]
def region_of(x,y):
    for name,x0,y0,x1,y1 in REGIONS:
        if x0<=x<x1 and y0<=y<y1: return name
    return 'other'

checkpoints=[]
t=0.0
while t<dur-0.1:
    i=int(t*fps)
    if i+1<n: checkpoints.append((t,i))
    t+=step

report=[]
for t,i in checkpoints:
    a=load(i); b=load(i+1)
    d=np.abs(a-b).max(axis=2)   # per-pixel max channel diff
    mask=d>THRESH
    cnt=int(mask.sum())
    ys,xs=np.where(mask)
    reg={}
    if cnt>0:
        for x,y in zip(xs[::7],ys[::7]):
            r=region_of(x,y); reg[r]=reg.get(r,0)+1
    top=sorted(reg.items(),key=lambda kv:-kv[1])[:4]
    report.append((t,cnt,top))
    # save a diff-highlight thumbnail for big changes
    if cnt>2500:
        im=Image.open(fs[i]).convert('RGB')
        dr=ImageDraw.Draw(im)
        if len(xs):
            dr.rectangle([int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())],outline=(255,0,255),width=4)
        im.save(os.path.join(OUT,f'move_t{t:.0f}_{cnt}.jpg'),quality=70)

print('\n== per-5s adjacent-frame motion (pixels changed >%d) ==' % THRESH)
for t,cnt,top in report:
    flag='  <-- MOVING' if cnt>2500 else ('  (minor)' if cnt>400 else '')
    tops=', '.join(f'{r}:{c}' for r,c in top)
    print(f't={t:6.1f}s  changed={cnt:7d}  [{tops}]{flag}')

big=[r for r in report if r[1]>2500]
print(f'\n{len(big)}/{len(report)} checkpoints show significant motion. diffs in {OUT}')
