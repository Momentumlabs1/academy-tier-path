import sys, os, json, base64, urllib.request
# tts_ts.py "<text>" <voice_id> <out_basepath>  -> writes <base>.mp3 + <base>.words.json
text, voice_id, base = sys.argv[1], sys.argv[2], sys.argv[3]
model = sys.argv[4] if len(sys.argv) > 4 else "eleven_multilingual_v2"
key = os.environ["ELEVEN_API_KEY"]
body = json.dumps({
    "text": text, "model_id": model,
    "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True},
}).encode()
req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
    data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req))
open(base + ".mp3", "wb").write(base64.b64decode(d["audio_base64"]))
al = d["alignment"]
chars, st = al["characters"], al["character_start_times_seconds"]
# group chars into words on whitespace
words, cur, cur_t = [], "", None
for c, t in zip(chars, st):
    if c.isspace():
        if cur: words.append({"w": cur, "t": round(cur_t, 3)}); cur, cur_t = "", None
    else:
        if cur == "": cur_t = t
        cur += c
if cur: words.append({"w": cur, "t": round(cur_t, 3)})
dur = al["character_end_times_seconds"][-1] if al["character_end_times_seconds"] else 0
json.dump({"dur": round(dur, 3), "words": words}, open(base + ".words.json", "w"))
print(f"{base}.mp3  dur={dur:.2f}s  words={len(words)}")
