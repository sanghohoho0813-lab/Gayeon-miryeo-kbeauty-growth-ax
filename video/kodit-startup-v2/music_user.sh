#!/bin/bash
# music_user.sh — 사용자 제공 배경음악 2곡 → music.wav (V2.1c)
#  ../usermusic/m1.wav 「새로운 비전」(171.6초, 바로 시작) : 0초 → XF (XF부터 4초 페이드아웃, 처음 1초 페이드인)
#  ../usermusic/m2.wav 「푸른 잔물결」(169.1초, 끝이 자연스럽게 끝남) : XF부터, 곡의 끝이 영상 끝과 맞도록 OFF2초 지점부터 (3초 페이드인)
#  XF = '수익모델' 장 표지 0.5초 전. 처리(AX 스프린트 II V7과 같음): 압축 2.5:1 · 70Hz 하이패스 · 13kHz 로우패스 · 2.5kHz −4dB → 2-pass loudnorm LU
#  말할 때 5dB 덕킹은 mix.py에서
set -e
cd "$(dirname "$0")"
DUR=$(cat out/dur.txt); LU=${LU:--26.5}
XF=$(python3 -c "import json;b=json.load(open('out/bounds_h.json'));print(round(b[13]-0.5,2))")
L2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 ../usermusic/m2.wav)
OFF2=$(python3 -c "print(round($L2-($DUR-$XF),3))")
echo "XF=$XF OFF2=$OFF2 DUR=$DUR LU=$LU"
FC="[0:a]atrim=0:$(python3 -c "print($XF+4.2)"),asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.0,afade=t=out:st=$XF:d=4[a];\
[1:a]atrim=start=$OFF2,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=3,adelay=$(python3 -c "print(int($XF*1000))")|$(python3 -c "print(int($XF*1000))")[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest,apad,atrim=0:$DUR,asetpts=PTS-STARTPTS,acompressor=threshold=0.045:ratio=2.5:attack=150:release=1500:knee=4,highpass=f=70,lowpass=f=13000,equalizer=f=2500:t=q:w=1.2:g=-4"
ffmpeg -nostdin -hide_banner -loglevel error -y -i ../usermusic/m1.wav -i ../usermusic/m2.wav -filter_complex "$FC" -ar 48000 -ac 2 music_arr.wav < /dev/null
J=$(ffmpeg -nostdin -hide_banner -i music_arr.wav -af loudnorm=I=$LU:TP=-8:LRA=11:print_format=json -f null - 2>&1 < /dev/null | sed -n '/^{/,/^}/p')
read II TP LRA TH OFF < <(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
ffmpeg -nostdin -hide_banner -loglevel error -y -i music_arr.wav -af "loudnorm=I=$LU:TP=-8:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true" -ar 48000 -ac 2 music.wav < /dev/null
ffmpeg -nostdin -hide_banner -i music.wav -af ebur128 -f null - 2>&1 < /dev/null | grep -A6 Summary | grep "I:"
