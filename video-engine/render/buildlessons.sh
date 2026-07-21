#!/bin/bash
# Export lesson1/3/5 (delivered finals from ~/Downloads) under app names + render lesson4 fresh.
set -e
cd "$(dirname "$0")/.."
FF=$(ls node_modules/@ffmpeg-installer/*/ffmpeg | head -1)
R=.render/l4
OUTD=~/Downloads
DESK=~/Desktop/"EnterTrade Videos"
mkdir -p "$DESK" $R

echo "=== [1/3] export delivered finals under app filenames ==="
cp ~/Downloads/lesson1_v11_send.mp4    "$OUTD/lesson1.mp4"
cp ~/Downloads/lesson3_final5_send.mp4 "$OUTD/lesson3.mp4"
cp ~/Downloads/lesson5_FINAL3_send.mp4 "$OUTD/lesson5.mp4"

echo "=== [2/3] render lesson4 (12910 frames) ==="
FRAMES=12910
if [ ! -f "$R/frames/.done" ]; then
  rm -rf $R/frames; mkdir -p $R/frames
  q=$((FRAMES/4))
  PAGE=lesson4.html OUT=$R/frames node render/rendseg.mjs 0 $q &
  PAGE=lesson4.html OUT=$R/frames node render/rendseg.mjs $q $((q*2)) &
  PAGE=lesson4.html OUT=$R/frames node render/rendseg.mjs $((q*2)) $((q*3)) &
  PAGE=lesson4.html OUT=$R/frames node render/rendseg.mjs $((q*3)) $FRAMES &
  wait
  got=$(ls $R/frames/f*.jpg | wc -l | tr -d ' ')
  if [ "$got" -lt "$FRAMES" ]; then echo "L4 FRAME MISMATCH: $got/$FRAMES"; exit 3; fi
  touch $R/frames/.done
fi

echo "=== [3/3] encode + COSMO + finalize lesson4 ==="
"$FF" -y -framerate 30 -i $R/frames/f%05d.jpg -i audio/l4_audio.m4a \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest $R/l4_body.mp4 2>$R/enc.log || { tail -5 $R/enc.log; exit 4; }
"$FF" -y -stream_loop -1 -i .render/v6/bubble/bubble_loop.mov -i $R/l4_body.mp4 \
  -filter_complex "[0:v]scale=280:-1[b];[1:v][b]overlay=40:H-h-30:shortest=1[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset medium -crf 21 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k $R/lesson4.mp4 2>$R/final.log || { tail -5 $R/final.log; exit 5; }
"$FF" -v error -i $R/lesson4.mp4 -f null - 2>$R/validate.log
if [ -s $R/validate.log ]; then echo "L4 VALIDATE ERRORS:"; cat $R/validate.log; exit 6; fi
cp $R/lesson4.mp4 "$OUTD/lesson4.mp4"
cp "$OUTD"/lesson1.mp4 "$OUTD"/lesson3.mp4 "$OUTD"/lesson5.mp4 $R/lesson4.mp4 "$DESK/" 2>/dev/null || true
"$FF" -i $R/lesson4.mp4 2>&1 | grep -E "Duration"
echo "LESSONS COMPLETE: lesson1/3/4/5.mp4 in ~/Downloads + Desktop/EnterTrade Videos"
