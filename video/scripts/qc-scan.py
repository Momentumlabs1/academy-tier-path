# Automatischer End-QC: scannt das gerenderte Video auf Bubble-Masken-Fehler.
# Die Bubble ist ein Kreis (Mitte 540/338, r=230 + Ring). Helle, warme Pixel
# AUSSERHALB des Kreises (aber innerhalb der Bubble-Box) = Video-Content, der
# der Maske entkommen ist -> Fehler. Der blaue Ring-Glow ist erlaubt (B >= R).
# Usage: python3 scripts/qc-scan.py out/tim-volume-profile-reel.mp4 [fps]
import subprocess, sys
import numpy as np

video = sys.argv[1] if len(sys.argv) > 1 else 'out/tim-volume-profile-reel.mp4'
scan_fps = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0

W, H = 1080, 1920
# Bubble: SIZE 430 @ top 132, global SAFE-Scale 0.94 (Origin 540/806.4), Drift bis 1.022
CX, CY, R = 540.0, 370.0, 217.0
BOX = (250, 30, 830, 595)  # x0,y0,x1,y1 um die Bubble (endet VOR den skalierten Captions)

proc = subprocess.Popen(
    ['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={scan_fps}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    stdout=subprocess.PIPE,
)
frame_bytes = W * H * 3
yy, xx = np.mgrid[BOX[1]:BOX[3], BOX[0]:BOX[2]]
outside = ((xx - CX) ** 2 + (yy - CY) ** 2) > (R + 42) ** 2

bad = []
i = 0
while True:
    buf = proc.stdout.read(frame_bytes)
    if len(buf) < frame_bytes:
        break
    t = i / scan_fps
    i += 1
    img = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
    crop = img[BOX[1]:BOX[3], BOX[0]:BOX[2]].astype(np.int16)
    r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
    bright = (r + g + b) / 3
    # warm & bright content outside the circle = mask spill (blue glow allowed)
    spill = outside & (bright > 95) & (r >= b)
    n = int(spill.sum())
    if n > 150:
        bad.append((round(t, 1), n))
proc.wait()
print(f'geprüfte Frames: {i} (alle {1/scan_fps:.1f}s)')
if bad:
    print('FEHLER — Masken-Spill bei (sekunde, pixel):', bad[:20])
    sys.exit(1)
print('OK — keine Bubble-Masken-Fehler gefunden')
