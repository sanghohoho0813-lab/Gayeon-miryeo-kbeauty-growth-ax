#!/bin/bash
# 회사 사진 자료 다시 만들기 — 원본 회사소개서 PDF가 없어도, 저장소에 있는 AX 스프린트 II 영상 V7(16:9)의 장면에서 사진 부분만 잘라낸다
#   bash extract_company.sh <작업 폴더>   → <작업 폴더>/company/*.png (장면 시각·자르는 자리는 V7 장면표 기준)
set -e
OUT=${1:-.}/company; mkdir -p "$OUT"
V=$(cd "$(dirname "$0")/../.." && pwd)/public/media/ax-sprint2/gayeon-miryeo-ax-sprint2_16x9_v7.mp4
x(){ ffmpeg -hide_banner -loglevel error -y -ss $1 -i "$V" -frames:v 1 -vf "crop=$3:$4:$5:$6" "$OUT/$2.png"; }
x 4.0 jar 700 620 1090 140          # 장면 1 · 골드 아이패치 (Navy 배경 → 가장자리 흐리게 씀)
x 23 lineup 1090 500 770 240        # 장면 4 · 제품 라인업 (Ivory 배경)
x 28 store_w 1000 500 120 160       # 장면 5 · 국내 백화점 매장
x 28 store_1 315 240 1150 160; x 28 store_2 315 240 1485 160; x 28 store_3 315 240 1150 420; x 28 store_4 315 240 1485 420
x 30.35 map 900 510 120 150         # 장면 6 · 수출 지도 (중국 표시 원이 그려지기 전)
x 33.5 expo_a 340 250 1090 150; x 33.5 expo_b 340 250 1090 420   # 해외 박람회
x 33.5 shop 346 520 1452 150        # 중국 온라인 매장 화면
ls "$OUT"
