#!/bin/bash
# Build the complete video6.mp4: mix audio → render frames → encode scenes → concat → COSMO → finalize.
set -e
cd "$(dirname "$0")/.."
DIR=$(pwd)
FF=$(ls node_modules/@ffmpeg-installer/*/ffmpeg | head -1)
R=.render/v6
mkdir -p $R/mix $R/out

echo "=== [1/6] audio mix ==="
python3 render/mixv6.py

render_scene(){ # name page frames
  local name=$1 page=$2 frames=$3
  local out=$R/frames_$name
  if [ -f "$out/.done" ] && [ $(ls $out/f*.jpg 2>/dev/null | wc -l) -ge $frames ]; then
    echo "--- $name frames cached"; return
  fi
  rm -rf $out; mkdir -p $out
  echo "=== render $name ($frames frames) ==="
  local q=$((frames/4))
  PAGE=$page OUT=$out node render/rendseg.mjs 0 $q &
  PAGE=$page OUT=$out node render/rendseg.mjs $q $((q*2)) &
  PAGE=$page OUT=$out node render/rendseg.mjs $((q*2)) $((q*3)) &
  PAGE=$page OUT=$out node render/rendseg.mjs $((q*3)) $frames &
  wait
  local got=$(ls $out/f*.jpg | wc -l | tr -d ' ')
  if [ "$got" -lt "$frames" ]; then echo "FRAME COUNT MISMATCH $name: $got/$frames"; exit 3; fi
  touch $out/.done
}

encode_scene(){ # name frames wav
  local name=$1 frames=$2 wav=$3
  if [ -f "$R/out/$name.mp4" ]; then echo "--- $name.mp4 cached"; return; fi
  echo "=== encode $name ==="
  "$FF" -y -framerate 30 -i $R/frames_$name/f%05d.jpg -i $wav \
    -c:v libx264 -preset medium -crf 22 -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 48000 -shortest $R/out/$name.mp4 2>$R/out/$name.enc.log || { tail -5 $R/out/$name.enc.log; exit 4; }
}

echo "=== [2/6] frames ==="
render_scene s1 v6seg1.html 840
render_scene s2 v6seg2.html 1758
render_scene s3 v6seg3.html 4626
render_scene s4 v6seg4.html 5673
render_scene s6 v6seg5.html 1536

echo "=== [3/6] encode scenes ==="
encode_scene s1 840  $R/mix/s1.wav
encode_scene s2 1758 $R/mix/s2.wav
encode_scene s3 4626 $R/mix/s3.wav
encode_scene s4 5673 $R/mix/s4.wav
encode_scene s6 1536 $R/mix/s6.wav

echo "=== [4/6] concat ==="
cat > $R/out/concat.txt <<EOF
file 's1.mp4'
file 's2.mp4'
file 's3.mp4'
file 's4.mp4'
file 's6.mp4'
EOF
"$FF" -y -f concat -safe 0 -i $R/out/concat.txt -c copy $R/out/v6_body.mp4 2>$R/out/concat.log

echo "=== [5/6] COSMO overlay + finalize (max-compat) ==="
"$FF" -y -stream_loop -1 -i $R/bubble/bubble_loop.mov -i $R/out/v6_body.mp4 \
  -filter_complex "[0:v]scale=280:-1[b];[1:v][b]overlay=40:H-h-30:shortest=1[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset medium -crf 21 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k $R/out/video6.mp4 2>$R/out/final.log || { tail -5 $R/out/final.log; exit 5; }

echo "=== [6/6] validate + deliver ==="
"$FF" -v error -i $R/out/video6.mp4 -f null - 2>$R/out/validate.log
if [ -s $R/out/validate.log ]; then echo "VALIDATE ERRORS:"; cat $R/out/validate.log; exit 6; fi
cp $R/out/video6.mp4 ~/Downloads/video6.mp4
mkdir -p ~/Desktop/"EnterTrade Videos"
cp $R/out/video6.mp4 ~/Desktop/"EnterTrade Videos"/video6.mp4
"$FF" -i $R/out/video6.mp4 2>&1 | grep -E "Duration|Stream"
echo "BUILD COMPLETE: ~/Downloads/video6.mp4"
