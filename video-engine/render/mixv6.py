#!/usr/bin/env python3
"""Build per-scene audio tracks for video6: insert action-gap silences into the
VO mp3s so audio matches each scene's renderAt timeline exactly."""
import subprocess, sys, os, glob

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF=glob.glob(HERE+'/node_modules/@ffmpeg-installer/*/ffmpeg')[0]
VO=HERE+'/.render/v6/vo'
OUT=HERE+'/.render/v6/mix'
os.makedirs(OUT,exist_ok=True)

def run(args):
    r=subprocess.run(args,capture_output=True,text=True)
    if r.returncode!=0:
        sys.exit('FFMPEG FAIL: '+' '.join(args)+'\n'+r.stderr[-1200:])

def gapped(src, gaps, total, out, lead=0.0):
    """src mp3 → wav with silences of gaps=[(at,dur)] inserted at VO-times; padded to total sec."""
    gaps=sorted(gaps)
    parts=[];fc=[];idx=0
    def silence(d):
        return f"anullsrc=r=48000:cl=stereo:d={d:.3f}"
    chain=[];labels=[]
    if lead>0:
        fc.append(f"{silence(lead)}[l0]");labels.append('[l0]')
    prev=0.0
    for i,(at,dur) in enumerate(gaps):
        fc.append(f"[0:a]atrim={prev:.3f}:{at:.3f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a{i}]")
        labels.append(f"[a{i}]")
        fc.append(f"{silence(dur)}[s{i}]")
        labels.append(f"[s{i}]")
        prev=at
    fc.append(f"[0:a]atrim={prev:.3f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[aE]")
    labels.append("[aE]")
    fc.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[cat];[cat]apad[padded]")
    run([FF,'-y','-i',src,'-filter_complex',';'.join(fc),'-map','[padded]','-t',f"{total:.3f}",
         '-c:a','pcm_s16le','-ar','48000','-ac','2',out])
    print('wrote',out,total)

# S1 — intro (no gaps), 28.0
gapped(VO+'/intro.mp3',[],28.0,OUT+'/s1.wav')
# S2
gapped(VO+'/s2.mp3',[(11.97,2.2),(19.8,1.6),(21.5,1.6),(24.7,2.2),(34.9,2.8)],58.6,OUT+'/s2.wav')
# S3
gapped(VO+'/s3.mp3',[(14.85,3.0),(26.90,2.0),(41.60,4.0),(57.00,2.5),(71.40,2.0),(84.00,3.0),(111.50,2.0),(115.30,10.0)],154.2,OUT+'/s3.wav')
# S4+S5 combined track (S5 starts at OFF5=153.576, from page __off5)
gapped(VO+'/s4.mp3',[(13.95,3.5),(34.90,3.5),(39.75,1.2),(43.95,1.2),(49.00,3.0),(63.00,2.0),(80.80,2.0),(99.30,2.5),(109.70,2.0),(116.40,9.0)],153.576,OUT+'/s4a.wav')
gapped(VO+'/s5.mp3',[(15.10,1.5),(21.90,3.0)],189.1-153.576,OUT+'/s4b.wav')
run([FF,'-y','-i',OUT+'/s4a.wav','-i',OUT+'/s4b.wav','-filter_complex','[0:a][1:a]concat=n=2:v=0:a=1[o]','-map','[o]','-c:a','pcm_s16le',OUT+'/s4.wav'])
print('wrote',OUT+'/s4.wav',189.1)
# S6
gapped(VO+'/s6.mp3',[(13.9,3.2)],51.2,OUT+'/s6.wav')
print('ALL MIXED')
