#!/bin/bash
# 배경음악 + 효과음 (V7 — V6 + 특허 출원번호 표시 효과음) — 나레이션(voice.wav, 0.6초 지연) + 음악 2곡 + 'AX 활용 예시' 카드 효과음
#  경로: 작업 폴더(scratchpad) 기준 — music/ 아래에 이 스크립트·음원 2곡·sfx_raw.wav, ../video/v2/ 아래에 ffmpeg·voice.wav·out/dur.txt
#  A(Bright Warm) 0 → 106초 (106~110.5초 페이드아웃) · B(Slower) 106초('즉, 단순히 지금' 장면)부터 끝까지 (2.5초 페이드인)
#  V7: 장면 10 'AX 시스템 개발 중' 옆 특허 출원번호가 나타날 때 같은 효과음 (PAT_AT = build.py가 쓴 out/patent_at.txt − 0.3초, 차임이 번호와 함께)
#  69초 쉼 카드(2초): 나레이션만 멈추고 음악은 계속(사이드체인이 풀려 살짝 올라옴) + 효과음(휙 + D 장조 차임) 68.85초
#  음악: 큰/작은 구간 차이 줄임(압축 2.5:1), 저역 70Hz 이하·고역 13kHz 이상 정리, 말소리 대역(2.5kHz) -4dB, 나레이션이 나올 때 3~6dB 더 낮춤
#  사용: bash mix.sh <음악 게인 dB> <출력 wav> [music_only]
set -e
cd "$(dirname "$0")"
G=$1; OUT=$2; MODE=$3
F=../video/v2/ffmpeg; V=../video/v2/voice.wav
DUR=$(cat ../video/v2/out/dur.txt)
LEN=$(python3 -c "print(round($DUR*30)/30)")
XF=106; SFX_AT=68850; SFX_G=-5
PAT_AT=$(python3 -c "print(round(($(cat ../video/v2/out/patent_at.txt)-0.3)*1000))")
BLEN=$(python3 -c "print($LEN-$XF+0.2)")
FADE=$(python3 -c "print($LEN-2.5)")
MUSIC="[1:a]atrim=0:$((XF+4)).5,asetpts=PTS-STARTPTS,volume=${G}dB,afade=t=in:st=0:d=1.5,afade=t=out:st=${XF}:d=4.5[a];\
[2:a]atrim=0:${BLEN},asetpts=PTS-STARTPTS,volume=${G}dB,afade=t=in:st=0:d=2.5,adelay=$((XF*1000))|$((XF*1000))[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest,apad,atrim=0:${LEN},asetpts=PTS-STARTPTS,acompressor=threshold=0.045:ratio=2.5:attack=150:release=1500:knee=4,highpass=f=70,lowpass=f=13000,equalizer=f=2500:t=q:w=1.2:g=-4[me];\
[0:a]adelay=600|600,apad,atrim=0:${LEN},asetpts=PTS-STARTPTS,asplit=2[vo][sc];\
[me][sc]sidechaincompress=threshold=0.063:ratio=2.5:attack=60:release=900:knee=6[md];\
[3:a]volume=${SFX_G}dB,asplit=2[s1][s2];[s1]adelay=${SFX_AT}|${SFX_AT},apad,atrim=0:${LEN}[f1];[s2]adelay=${PAT_AT}|${PAT_AT},apad,atrim=0:${LEN}[f2];[f1][f2]amix=inputs=2:normalize=0[fx]"
IN="-i $V -i A_bright_warm.wav -i B_slower.wav -i sfx_raw.wav"
if [ "$MODE" = music_only ]; then
  $F -hide_banner -loglevel error -y $IN -filter_complex "$MUSIC;[vo]anullsink;[fx]anullsink" -map "[md]" -ar 48000 -ac 2 "$OUT"
else
  $F -hide_banner -loglevel error -y $IN -filter_complex "$MUSIC;[vo][md][fx]amix=inputs=3:normalize=0:duration=first,afade=t=out:st=${FADE}:d=2.5,alimiter=limit=0.89:level=false:latency=1[out]" -map "[out]" -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"
fi
