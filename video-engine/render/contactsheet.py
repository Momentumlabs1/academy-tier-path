#!/usr/bin/env python3
"""Contact sheet for 5s-interval review: tiles frames at a fixed interval into
grids so each checkpoint can be compared with its neighbours (animation, logic,
formatting, causality). Usage: contactsheet.py <framesdir> <fps> [step] [cols]"""
import sys, os, glob
from PIL import Image, ImageDraw

frames_dir=sys.argv[1]
fps=float(sys.argv[2]) if len(sys.argv)>2 else 30.0
step=float(sys.argv[3]) if len(sys.argv)>3 else 5.0
cols=int(sys.argv[4]) if len(sys.argv)>4 else 4
name=os.path.basename(frames_dir.rstrip('/'))
OUTDIR=os.path.join(os.path.dirname(frames_dir.rstrip('/')),'sheets')
os.makedirs(OUTDIR,exist_ok=True)

fs=sorted(glob.glob(os.path.join(frames_dir,'f*.jpg')))
n=len(fs); dur=n/fps
TW,TH=480,270           # thumb size
PAD=6; LBL=20
per_page=cols*4         # 4 rows per page

picks=[]
t=0.0
while t<dur:
    picks.append((t,min(n-1,int(t*fps))))
    t+=step

pages=[picks[i:i+per_page] for i in range(0,len(picks),per_page)]
for pi,page in enumerate(pages):
    rows=(len(page)+cols-1)//cols
    W=cols*(TW+PAD)+PAD; H=rows*(TH+LBL+PAD)+PAD
    sheet=Image.new('RGB',(W,H),(12,14,20))
    dr=ImageDraw.Draw(sheet)
    for k,(t,i) in enumerate(page):
        r,c=divmod(k,cols)
        x=PAD+c*(TW+PAD); y=PAD+r*(TH+LBL+PAD)
        im=Image.open(fs[i]).convert('RGB').resize((TW,TH))
        sheet.paste(im,(x,y+LBL))
        dr.rectangle([x,y+LBL,x+TW-1,y+LBL+TH-1],outline=(60,66,78))
        dr.text((x+4,y+4),f'{name}  t={t:.0f}s  (f{i})',fill=(180,240,120))
    out=os.path.join(OUTDIR,f'sheet_{name}_p{pi+1}.jpg')
    sheet.save(out,quality=82)
    print('wrote',out)
print(f'{name}: {len(picks)} checkpoints, {len(pages)} page(s)')
