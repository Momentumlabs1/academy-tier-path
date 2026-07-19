import sys, json
from faster_whisper import WhisperModel
audio = sys.argv[1]; out = sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "large-v3"
lang = sys.argv[4] if len(sys.argv) > 4 else None
m = WhisperModel(model, device="cpu", compute_type="int8")
segs, info = m.transcribe(
    audio, language=lang, word_timestamps=True, vad_filter=True,
    beam_size=5, vad_parameters=dict(min_silence_duration_ms=400),
)
print(f"lang={info.language} p={info.language_probability:.2f} dur={info.duration:.0f}s", flush=True)
words = []; segl = []
for s in segs:
    segl.append({"t": round(s.start, 2), "e": round(s.end, 2), "txt": s.text.strip()})
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "t": round(w.start, 2)})
    m_, sec = divmod(int(s.start), 60)
    print(f"[{m_:02d}:{sec:02d}] {s.text.strip()}", flush=True)
    json.dump({"lang": info.language, "words": words, "segs": segl}, open(out, "w"))
print(f"DONE segments={len(segl)} words={len(words)}", flush=True)
