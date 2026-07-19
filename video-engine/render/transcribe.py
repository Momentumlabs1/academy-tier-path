import sys, json
from faster_whisper import WhisperModel
audio = sys.argv[1]; out = sys.argv[2]
m = WhisperModel("base.en", device="cpu", compute_type="int8")
segs,_ = m.transcribe(audio, word_timestamps=True, vad_filter=False)
words=[]; segl=[]
for s in segs:
    segl.append({"t":round(s.start,2),"txt":s.text.strip()})
    for w in (s.words or []):
        words.append({"w":w.word.strip(),"t":round(w.start,2)})
json.dump({"words":words,"segs":segl}, open(out,"w"))
print("segments:",len(segl),"words:",len(words))
for s in segl: print(f'{s["t"]:7.2f}  {s["txt"]}')
