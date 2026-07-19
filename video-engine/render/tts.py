import sys, os, json, urllib.request
# tts.py "<text>" <voice_id> <out.mp3> [model_id]
text, voice_id, out = sys.argv[1], sys.argv[2], sys.argv[3]
model = sys.argv[4] if len(sys.argv) > 4 else "eleven_multilingual_v2"
key = os.environ["ELEVEN_API_KEY"]
body = json.dumps({
    "text": text, "model_id": model,
    "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True},
}).encode()
req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
    data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
with urllib.request.urlopen(req) as r, open(out, "wb") as f:
    f.write(r.read())
print("wrote", out, os.path.getsize(out), "bytes")
