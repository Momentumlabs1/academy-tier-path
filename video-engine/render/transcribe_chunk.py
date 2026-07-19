import sys, json
from faster_whisper import WhisperModel
wav, out, offset = sys.argv[1], sys.argv[2], float(sys.argv[3])
model = sys.argv[4] if len(sys.argv) > 4 else "medium"
m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=2)
segs, info = m.transcribe(wav, language="de", word_timestamps=True, vad_filter=True,
                          beam_size=5, vad_parameters=dict(min_silence_duration_ms=400))
words, segl = [], []
for s in segs:
    segl.append({"t": round(s.start + offset, 2), "e": round(s.end + offset, 2), "txt": s.text.strip()})
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "t": round(w.start + offset, 2)})
json.dump({"words": words, "segs": segl}, open(out, "w"))
print(f"{out} done: {len(segl)} segs, offset={offset}", flush=True)
