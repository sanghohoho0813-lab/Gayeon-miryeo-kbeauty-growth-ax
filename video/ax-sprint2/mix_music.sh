#!/bin/bash
# 배경음악 깔기 (V5) — 나레이션(voice.wav, 기존 렌더와 같은 0.6초 지연) + 음악 2곡
#  경로: 작업 폴더(scratchpad) 기준 — music/ 아래에 이 스크립트와 음원 2곡, ../video/v2/ 아래에 ffmpeg·voice.wav(V2 나레이션 처리 결과)
#  A(Bright Warm) 0 → 104초 (104~108.5초 페이드아웃) · B(Slower) 104초부터 끝까지 (2.5초 페이드인, B 자체 마무리가 영상 끝과 맞음)
#  음악: 큰 구간·작은 구간 차이 줄임(압축 2.5:1), 저역 70Hz 이하·고역 13kHz 이상 정리, 말소리 대역(2.5kHz) -4dB, 나레이션이 나올 때 3~6dB 더 낮춤(사이드체인), 끝 2.5초 전체 페이드
#  사용: bash mix.sh <음악 게인 dB> <출력 wav> [music_only]
set -e
cd "$(dirname "$0")"
G=$1; OUT=$2; MODE=$3
F=../video/v2/ffmpeg; V=../video/v2/voice.wav
LEN=$(python3 -c "print(round(217.02*30)/30)")
XF=104
BLEN=$(python3 -c "print($LEN-$XF+0.2)")
FADE=$(python3 -c "print($LEN-2.5)")
MUSIC="[1:a]atrim=0:108.5,asetpts=PTS-STARTPTS,volume=${G}dB,afade=t=in:st=0:d=1.5,afade=t=out:st=${XF}:d=4.5[a];\
[2:a]atrim=0:${BLEN},asetpts=PTS-STARTPTS,volume=${G}dB,afade=t=in:st=0:d=2.5,adelay=$((XF*1000))|$((XF*1000))[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest,apad,atrim=0:${LEN},asetpts=PTS-STARTPTS,acompressor=threshold=0.045:ratio=2.5:attack=150:release=1500:knee=4,highpass=f=70,lowpass=f=13000,equalizer=f=2500:t=q:w=1.2:g=-4[me];\
[0:a]adelay=600|600,apad,atrim=0:${LEN},asetpts=PTS-STARTPTS,asplit=2[vo][sc];\
[me][sc]sidechaincompress=threshold=0.063:ratio=2.5:attack=60:release=900:knee=6[md]"
if [ "$MODE" = music_only ]; then
  $F -hide_banner -loglevel error -y -i $V -i A_bright_warm.wav -i B_slower.wav -filter_complex "$MUSIC;[vo]anullsink" -map "[md]" -ar 48000 -ac 2 "$OUT"
else
  $F -hide_banner -loglevel error -y -i $V -i A_bright_warm.wav -i B_slower.wav -filter_complex "$MUSIC;[vo][md]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=${FADE}:d=2.5,alimiter=limit=0.89:level=false:latency=1[out]" -map "[out]" -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"
fi
