#  build.py (V2) — 장면표 → comp_v.html(1080×1920) / comp_h.html(1920×1080)   (AX 영상 스타일 가이드 v4.1)
#  python build.py v|h
#  V1 대비: 실제 매장·제품·중국 판매 자료 확대, 데모에 실제 MIRYEO 제품 사진(수치는 시연용), 95일→D-4→추천 생산량 강조,
#           고객관심 간결화, 한국어 5단계 순환, 'AI 분석·예측 솔루션 도입·검증 중' 구조 (현재 구현 / 도입·검증 중 / 향후 고도화)
import json, html, re, sys, wave, math, random, struct

FMT = sys.argv[1]
v = FMT == "v"
W, H = (1080, 1920) if v else (1920, 1080)
SUBS = json.load(open("subs.json"))
CH = json.load(open("chars.json"))
S = [s["in"] for s in SUBS]
w_ = wave.open("voice.wav"); VOICE = w_.getnframes() / w_.getframerate()
DUR = round(VOICE + 0.6 + 2.6, 2)
open("out/dur.txt", "w").write(str(DUR))
NOTE = "화면 속 분석 수치는 시연용 예시(Demo·샘플) 데이터입니다 · 실제 회사 실적이 아닙니다"
NOTE_P = "제품 사진: 실제 MIRYEO 제품 · 재고·판매·생산 수치: 시연용 예시 (실제 실적 아님)"
PHOTO = "사진: 주식회사 가연인터내셔널 회사소개서"
GOLD, SEC, RED = "var(--gold)", "var(--sec)", "#c2513f"

if v:
    BX, BY, BW, BB = 72, 230, 888, 1300
    NOTE_Y = 1268
else:
    BX, BY, BW, BB = 120, 100, 1680, 818
    NOTE_Y = 800

def pv(a, b): return a if v else b
def norm(s): return re.sub(r"[^0-9A-Za-z가-힣]", "", s)
def K(phrase, after=0.0):
    n = norm(phrase); k = 0
    while True:
        k = CH["script"].find(n, k)
        if k < 0: raise SystemExit(f"대본에 없음: {phrase}")
        if CH["t0"][k] >= after: return round(CH["t0"][k], 2)
        k += 1
def esc(t): return html.escape(t).replace("\n", "<br>")
def em(t): return "".join(f'<span class="acc">{p}</span>' if i % 2 else p for i, p in enumerate(esc(t).split("**")))
def A(tin, tout, a="up", extra=""): return f'data-in="{tin:.2f}" data-out="{tout:.2f}" data-a="{a}" {extra}'
def el(cls, txt, tin, tout, style="", a="up", extra="", raw=False):
    return f'<div class="{cls}" style="{style}" {A(tin, tout, a, extra)}>{txt if raw else em(txt)}</div>'
def box(style, tin, tout, inner="", cls="", a="card", extra=""):
    return f'<div class="abs {cls}" style="{style}" {A(tin, tout, a, extra)}>{inner}</div>'

scenes, LIGHT = [], []
def scene(tin, tout, body, bg="D"):
    cls = {"D": "bgD", "L": "bgL", "S": "bgS"}[bg]
    light = " light" if bg == "L" else ""
    if bg == "L": LIGHT.append([tin, tout])
    scenes.append(f'<div class="scene{light}" {A(tin, tout, "fade")}><div class="{cls}"></div><div class="grid"></div>\n{body}\n</div>')

def eyebrow(t, tin, tout, top, left=None):
    return el("eyebrow abs", t, tin, tout, f"left:{left or BX}px;top:{top}px;right:{W - BX - BW}px", "fade")
def note(tin, tout, text=NOTE, top=None, left=None, width=None):
    return f'<div class="note" style="top:{top or NOTE_Y}px;left:{left or BX}px;max-width:{width or BW}px" {A(tin, tout, "fade")}>{esc(text)}</div>'
def chip(txt, tin, tout, style, c=GOLD, a="up", size=None, extra=""):
    fs = f";font-size:{size}px" if size else ""
    return el("chip abs", txt, tin, tout, f"{style};--c:{c}{fs}", a, extra)
def numtag(n, txt, tin, tout, style, dim=None, c=GOLD, size=None):
    d = f'data-dim="{dim:.2f}"' if dim else ""
    fs = f";font-size:{size}px" if size else ""
    return f'<div class="numtag abs" style="{style};--c:{c}{fs}" {A(tin, tout, "left", d)}><span class="num">{n}</span><span>{em(txt)}</span></div>'
def svg(inner, tin, tout):
    return f'<svg class="abs" width="{W}" height="{H}" viewBox="0 0 {W} {H}" style="left:0;top:0;overflow:visible" {A(tin, tout, "fade")}>{inner}</svg>'
def line(x1, y1, x2, y2, t0, t1, w=5, col="var(--gold)", dash=""):
    dr = "" if dash else f'data-draw="{t0:.2f},{t1:.2f}"'
    da = f'stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{w}" stroke-linecap="round" {dr} {da}/>'
def arrow(x1, y1, x2, y2, t0, t1, w=6, col="var(--gold)"):
    ang = math.atan2(y2 - y1, x2 - x1); L = 26
    p1 = (x2 - L * math.cos(ang - .5), y2 - L * math.sin(ang - .5)); p2 = (x2 - L * math.cos(ang + .5), y2 - L * math.sin(ang + .5))
    return (line(x1, y1, x2, y2, t0, t1, w, col) +
            f'<path d="M{p1[0]:.1f},{p1[1]:.1f} L{x2},{y2} L{p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" data-draw="{t1 - .15:.2f},{t1 + .2:.2f}"/>')
def img(src, style, tin, tout, a="card", extra=""):
    return f'<img class="abs" src="{src}" style="{style}" {A(tin, tout, a, extra)}>'
def photo(src, x, y, w, h, tin, tout, pos="center", a="card", radius=24, extra="", zoom=None):
    zm = f' data-move="{zoom[0]:.2f},{zoom[1]:.2f},0,0,1,0,0,{zoom[2] if len(zoom) > 2 else 1.08}"' if zoom else ""
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{radius}px;overflow:hidden;'
            f'box-shadow:0 36px 70px -34px rgba(60,40,20,.55);background:#ddd" {A(tin, tout, a, extra)}>'
            f'<img src="{src}" style="width:100%;height:100%;object-fit:cover;object-position:{pos}"{zm}></div>')
def prod(src, x, y, w, tin, tout, a="scale", glow=True, extra=""):
    """실제 제품 사진 (투명 배경) + 바닥 그림자·은은한 금색 빛"""
    g = (f'<div style="position:absolute;left:-12%;right:-12%;top:8%;bottom:-6%;border-radius:50%;background:radial-gradient(closest-side, rgba(210,164,95,.30), transparent)"></div>' if glow else "")
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px" {A(tin, tout, a, extra)}>{g}'
            f'<img src="{src}" style="position:relative;width:100%;display:block;filter:drop-shadow(0 26px 30px rgba(40,25,10,.35))"></div>')

# 앱 화면 (모든 캡처는 @2x) — crop = (cx, cy, cw) CSS 좌표 → 보이는 폭 vw 에 맞춤
def kbseg(vw, segs):
    out = []
    for t0, t1, c0, c1 in segs:
        s0 = vw / (c0[2] * 2); s1 = vw / (c1[2] * 2)
        out.append(f"{t0:.2f},{t1:.2f},{s0:.5f},{-c0[0]*2*s0:.1f},{-c0[1]*2*s0:.1f},{s1:.5f},{-c1[0]*2*s1:.1f},{-c1[1]*2*s1:.1f}")
    return ";".join(out)
def browser(x, y, w, h, shots, tin, tout, label="MIRYEO · BUSINESS AX", a="card", extra=""):
    inner = "".join(f'<img src="../cap/{n}.png" class="shot" {A(a0, b0, "fade")} data-kb="{kbseg(w, segs)}">' for n, a0, b0, segs in shots)
    return (f'<div class="browser abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" {A(tin, tout, a, extra)}>'
            f'<div class="bar"><i></i><i></i><i></i><span>{label}</span></div><div class="view" style="height:{h - 40}px">{inner}</div></div>')
def phone(x, y, w, shots, tin, tout, a="card", extra=""):
    sw = w - 28; s = sw / 824; h = round(w * 19.6 / 9)
    inner = ""
    for n, a0, b0, segs in shots:
        kb = ";".join(f"{t0:.2f},{t1:.2f},{s:.5f},0,{-y0*2*s:.1f},{s:.5f},0,{-y1*2*s:.1f}" for t0, t1, y0, y1 in segs)
        inner += f'<img src="../cap/{n}.png" class="shot" {A(a0, b0, "fade")} data-kb="{kb}">'
    return (f'<div class="phone abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" {A(tin, tout, a, extra)}>'
            f'<div class="screen">{inner}</div><div class="notch"></div></div>')
def focus(x, y, w, h, t0, t1, tin, tout):
    return f'<div class="focus" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" data-focus="{t0:.2f},{t1:.2f}" {A(tin, tout, "fade")}></div>'
def ui_rect(bx, by, vw, crop, r):
    """앱 화면 안 요소(r=x,y,w,h CSS) → 영상 좌표 (브라우저 bx,by,폭 vw / 보기 영역 위 40px 막대)"""
    k = vw / crop[2]
    return (round(bx + (r[0] - crop[0]) * k), round(by + 40 + (r[1] - crop[1]) * k), round(r[2] * k), round(r[3] * k))
def stagepill(txt, c, tin, tout, style, a="up", extra=""):
    """[현재 구현] [도입·검증 중] [향후 고도화] 표시"""
    return el("stage abs", txt, tin, tout, f"{style};--c:{c}", a, extra)

# 장면 경계 — 자막 시작 시각, 0.25초 겹침
def si(prefix):
    for i, sb in enumerate(SUBS):
        if sb["text"].replace("**", "").replace("\n", " ").startswith(prefix): return i
    raise SystemExit(f"자막에 없음: {prefix}")
starts = ["담당자님께서", "약 3분", "저희 가연인터내셔널은", "현재 국내 주요", "중국을 포함한", "그런데 사업이", "어떤 제품이 지금", "지금까지는",
          "그래서 저희는", "지금 보시는 화면은", "제품 이미지는", "예를 들어", "하지만 최근", "현재 시연 조건", "최근 판매속도가", "즉, 단순히 지금",
          "여기에 고객의", "저희는 이런 변화도", "그리고 시스템의", "그 이후 실제", "저희는 이번", "현재 시험단계", "이렇게 축적되는", "즉, 단순히 언젠가",
          "저희가 만들고", "이미 일어난 일을", "향후 내부에서", "바쁘신 가운데"]
B = [0.0] + [S[si(p)] for p in starts] + [DUR]
X = 0.25
def T(i): return B[i], (B[i + 1] + X if i + 1 < len(B) - 1 else DUR)
I = lambda p: S[si(p)]

def png_css(name):   # @2x 캡처의 CSS 크기
    with open(f"cap/{name}.png", "rb") as f: f.read(16); w, h = struct.unpack(">II", f.read(8))
    return w / 2, h / 2
M = json.load(open("cap/meta.json"))
def dm(state, key):
    r = M[f"pc_demo_{state}"][key]; return (r[0], r[1] + 30, r[2], r[3])
CI, CI2, PR = "../company/img/", "../company/img2/", "../company/prod/"
JAR, LINEUP, MAP = CI + "p01_04_851x779.png", CI + "p41_01_1694x984.png", CI + "p10_01_1005x564.png"
GCREAM, LUX = CI + "p10_05_385x354.png", PR + "luxury.png"
STORE_W, STORE_1, STORE_A, STORE_B, STORE_C = CI + "p12_30_2844x1280.png", CI + "p11_30_577x433.png", CI + "p11_31_577x433.png", CI + "p11_32_411x434.png", CI2 + "p13_00_462x615.png"
EXPO_A, EXPO_B, EXPO_CN = CI + "p36_13_411x328.png", CI + "p36_08_599x400.png", CI2 + "p35_20_266x354.png"
SHOP_A, SHOP_B = CI2 + "p34_41_526x976.png", CI2 + "p34_42_519x978.png"

# ───────── 1. 인트로 — 회사명 + 신청 맥락 (Deep Navy) ─────────
a, b = T(0)
scene(a, b, "\n".join([
    f'<div class="deco abs" style="left:{pv(430, 1060)}px;top:{pv(250, 120)}px;width:{pv(620, 720)}px;height:{pv(620, 720)}px;border-radius:50%;background:radial-gradient(circle, rgba(210,164,95,.28), transparent 65%)" {A(a, b, "fade")}></div>',
    img(JAR, f"left:{pv(470, 1120)}px;top:{pv(300, 170)}px;width:{pv(540, 620)}px", a + .2, b, "scale"),
    eyebrow("K-BEAUTY · GROWTH AX", a + .1, b, pv(880, 250)),
    el("h3 abs dim", "주식회사", a + .25, b, f"left:{BX}px;top:{pv(940, 310)}px"),
    el("h1 abs", "가연인터내셔널", a + .35, b, f"left:{BX}px;top:{pv(1010, 380)}px;font-size:{pv(118, 124)}px"),
    chip("중진공 **AX 스프린트 II** 신청", I("이 영상은"), b, f"left:{BX}px;top:{pv(1170, 560)}px", a="up"),
]))

# ───────── 2. 이 영상의 목적 — 두 가지 질문 + 보조자료 ─────────
a, b = T(1)
scene(a, b, "\n".join([
    el("abs", "?", a, b, f"left:{pv(640, 1380)}px;top:{pv(150, 40)}px;font-size:{pv(560, 640)}px;font-weight:800;color:rgba(210,164,95,.10);line-height:1", "fade"),
    eyebrow("이 영상의 목적", a + .1, b, pv(300, 160)),
    numtag(1, "왜 **AX**를 도입하고 있는지", I("담당자님께서"), b, f"left:{BX}px;top:{pv(390, 240)}px;width:{pv(888, 1000)}px", dim=I("그리고 현재")),
    numtag(2, "현재 **어떤 시스템**을 개발하고 있는지", I("그리고 현재"), b, f"left:{BX}px;top:{pv(540, 380)}px;width:{pv(888, 1000)}px", dim=I("만든 보조자료")),
    box(f"left:{pv(250, 1240)}px;top:{pv(720, 210)}px;width:{pv(580, 520)}px;height:{pv(440, 520)}px;padding:40px;transform:rotate(-3deg)", I("만든 보조자료") - .3, b,
        f'<div class="tag" style="color:var(--gold)">SUPPORTING MATERIAL</div><div class="h2" style="margin-top:14px">이해를 돕는<br><span class="acc">보조자료</span></div>'
        f'<div style="margin-top:34px;height:12px;width:80%;border-radius:6px;background:rgba(255,255,255,.14)"></div><div style="margin-top:18px;height:12px;width:62%;border-radius:6px;background:rgba(255,255,255,.10)"></div>',
        cls="glass hiedge", a="card", extra='data-t="rotate(-3deg)"'),
]))

# ───────── 3. 약 3분 · 배속 (NUMBER) ─────────
a, b = T(2)
tk = I("필요하시면")
scene(a, b, "\n".join([
    el("h2 abs dim", "약", a + .1, b, f"left:{BX}px;top:{pv(330, 170)}px"),
    el("big abs", "3분", a + .25, b, f"left:{BX - 8}px;top:{pv(400, 240)}px;font-size:{pv(300, 300)}px;color:var(--gold-soft)", "scale"),
    el("h3 abs", "짧게 정리한 흐름", a + .5, b, f"left:{BX}px;top:{pv(720, 560)}px"),
    chip("1배", tk, b, f"left:{pv(BX, 1000)}px;top:{pv(850, 260)}px"),
    chip("1.25배", tk + .25, b, f"left:{pv(BX + 220, 1000)}px;top:{pv(850, 390)}px"),
    chip("**1.5배**", tk + .5, b, f"left:{pv(BX + 520, 1000)}px;top:{pv(850, 520)}px;border-color:rgba(232,201,149,.6)"),
    el("tag abs", "배속으로 보셔도 흐름이 이어지게", tk + .7, b, f"left:{pv(BX, 1000)}px;top:{pv(960, 650)}px;font-size:30px"),
    box(f"left:{BX}px;top:{pv(1120, 760)}px;width:{pv(888, 1680)}px;height:14px", I("전체 흐름을"), b, f'<div class="track" style="height:14px"><div class="fill" data-grow="{I("전체 흐름을"):.2f},{I("전체 흐름을") + 1.6:.2f},{pv(888, 1680)}"></div></div>', a="fade"),
]))

# ───────── 4. 회사 소개 — 실제 제품 라인업 (Warm Ivory) ─────────
a, b = T(3)
scene(a, b, "\n".join([
    eyebrow("COMPANY · 회사 소개", a + .1, b, pv(270, 150)),
    el("h2 abs", "**K-Beauty 화장품**을\n기획하고 유통합니다", a + .2, b, f"left:{BX}px;top:{pv(320, 210)}px"),
    f'<div class="abs" style="left:{pv(20, 760)}px;top:{pv(540, 110)}px;width:{pv(1040, 1100)}px" {A(a + .3, b, "card")}><img src="{LINEUP}" style="width:100%;display:block" data-move="{a + .3:.2f},{b:.2f},0,0,1,0,0,1.05"></div>',
    chip("국내 유통", I("국내외 여러"), b, f"left:{BX}px;top:{pv(1160, 470)}px"),
    chip("해외 유통", I("국내외 여러") + .35, b, f"left:{pv(BX + 330, BX)}px;top:{pv(1160, 590)}px", c=SEC),
    note(a + .5, b, PHOTO),
]), "L")

# ───────── 5. 국내 — 주요 백화점·온라인 (실제 매장 사진) ─────────
a, b = T(4)
kd, ko = K("백화점"), K("온라인 채널")
if v:
    ph = [photo(STORE_W, BX, 300, 888, 430, a + .1, b, zoom=(a, b, 1.07)),
          photo(STORE_1, BX, 750, 288, 300, a + .35, b, zoom=(a, b)),
          photo(STORE_B, BX + 300, 750, 288, 300, a + .55, b, zoom=(a, b)),
          photo(STORE_C, BX + 600, 750, 288, 300, a + .75, b, pos="center 30%", zoom=(a, b))]
    cy = 1090
else:
    ph = [photo(STORE_W, BX, 160, 1000, 500, a + .1, b, zoom=(a, b, 1.07)),
          photo(STORE_1, 1150, 160, 315, 240, a + .35, b, zoom=(a, b)),
          photo(STORE_A, 1485, 160, 315, 240, a + .5, b, zoom=(a, b)),
          photo(STORE_B, 1150, 420, 315, 240, a + .65, b, zoom=(a, b)),
          photo(STORE_C, 1485, 420, 315, 240, a + .8, b, pos="center 35%", zoom=(a, b))]
    cy = 690
scene(a, b, "\n".join([eyebrow("국내 판매 · 실제 매장", a + .1, b, pv(250, 112))] + ph + [
    chip("주요 **백화점**", kd, b, f"left:{BX}px;top:{cy}px", size=pv(48, 46)),
    chip("온라인 채널", ko, b, f"left:{BX + pv(370, 360)}px;top:{cy}px", c=SEC, size=pv(48, 46)),
    note(a + .5, b, PHOTO),
]), "L")

# ───────── 6. 해외 — 중국 포함 수출·온라인·라이브 (지도 + 중국 판매 자료) ─────────
a, b = T(5)
kx, kon, kli = K("수출과"), K("온라인 판매"), K("라이브 판매")
if v:
    mx, my, mw = BX, 290, 888
    cards = [photo(EXPO_A, BX, 820, 288, 250, kx - .2, b),
             photo(SHOP_B, BX + 300, 820, 288, 250, kon - .2, b, pos="center 22%"),
             photo(EXPO_B, BX + 600, 820, 288, 250, kli - .2, b)]
    chips = [chip("**수출**", kx, b, f"left:{BX}px;top:1100px", size=44),
             chip("온라인 판매", kon, b, f"left:{BX + 210}px;top:1100px", c=SEC, size=44),
             chip("라이브 판매", kli, b, f"left:{BX + 540}px;top:1100px", c=SEC, size=44)]
else:
    mx, my, mw = BX, 150, 900
    cards = [photo(EXPO_A, 1090, 150, 340, 250, kx - .2, b),
             photo(SHOP_A, 1450, 150, 350, 520, kon - .2, b, pos="center top"),
             photo(EXPO_B, 1090, 420, 340, 250, kli - .2, b)]
    chips = [chip("**수출**", kx, b, f"left:{BX}px;top:690px", size=46),
             chip("온라인 판매", kon, b, f"left:{BX + 220}px;top:690px", c=SEC, size=46),
             chip("라이브 판매", kli, b, f"left:{BX + 560}px;top:690px", c=SEC, size=46)]
mh = round(mw * 564 / 1005)
cnx, cny = mx + round(mw * .735), my + round(mh * .40)
scene(a, b, "\n".join([eyebrow("해외 판매 · 중국 포함", a + .1, b, pv(250, 112)),
    img(MAP, f"left:{mx}px;top:{my}px;width:{mw}px", a + .15, b, "fade"),
    f'<div class="abs" style="left:{cnx - 70}px;top:{cny - 70}px;width:140px;height:140px;border-radius:50%;border:5px solid var(--gold);box-shadow:0 0 0 10px rgba(210,164,95,.18)" {A(a + .5, b, "scale")}></div>',
    el("chip abs", "중국", a + .7, b, f"left:{cnx + 70}px;top:{cny - 40}px;font-size:34px;padding:8px 20px;--c:{RED}", "up"),
] + cards + chips + [note(a + .5, b, PHOTO + " (중국 행사·온라인 매장 화면)")]), "L")

# ───────── 7. 성장 → 새로운 고민 (실제 제품·판매채널이 늘어남) ─────────
a, b = T(6)
kn, kch = K("새로운 고민"), K("판매채널이 많아질수록")
rnd = random.Random(7)
tiles = []
cols, rows = (6, 6) if v else (11, 5)
cw_, ch_ = (BW / cols, 760 / rows) if v else (BW / cols, 600 / rows)
cells = [(c, r) for c in range(cols) for r in range(rows)]
rnd.shuffle(cells)
NT = pv(24, 32)
t_end = kch + .9
prods = [JAR, GCREAM, LUX]
for k, (c, r) in enumerate(cells[:NT]):
    x = BX + c * cw_ + rnd.uniform(4, 20); y = pv(300, 140) + r * ch_ + rnd.uniform(4, 18)
    tin = a + .3 + (t_end - a - .3) * k / NT
    dd = f'data-dim="{kn:.2f}"'
    if k % 2 == 0:
        tiles.append(f'<div class="abs" style="left:{x:.0f}px;top:{y:.0f}px;width:104px;height:104px;border-radius:24px;background:rgba(255,255,255,.08);border:2px solid rgba(232,201,149,.55);display:flex;align-items:center;justify-content:center" {A(tin, b, "scale", dd)}>'
                     f'<img src="{prods[(k // 2) % 3]}" style="width:84px;height:84px;object-fit:contain"></div>')
    else:
        tiles.append(f'<div class="abs" style="left:{x:.0f}px;top:{y:.0f}px;width:84px;height:84px;border-radius:50%;border:4px solid rgba(127,183,178,.8);background:rgba(63,133,133,.12)" {A(tin, b, "scale", dd)}></div>')
scene(a, b, "\n".join(tiles + [
    chip("제품 **↑**", a + .6, b, f"left:{BX}px;top:{pv(1110, 760)}px", a="up"),
    chip("판매채널 **↑**", kch, b, f"left:{BX + 300}px;top:{pv(1110, 760)}px", c=SEC),
    el("h0 abs", "새로운\n**고민**", kn, b, f"left:{BX}px;top:{pv(560, 260)}px;font-size:{pv(170, 180)}px;text-shadow:0 10px 40px rgba(0,0,0,.6)", "scale"),
]))

# ───────── 8. 매일의 판단 네 가지 (Muted Slate) ─────────
a, b = T(7)
qs = [("어떤 제품이 지금", "지금 **빠르게** 팔리는 제품은?"), ("현재 재고로", "현재 재고로 **얼마나** 버틸까?"),
      ("다음 생산은", "다음 **생산**은 언제 시작?"), ("그리고 어느 판매채널에", "어느 채널에 먼저 **배분**?")]
parts = [eyebrow("매일 해야 하는 판단", a + .1, b, pv(280, 150))]
for k, (ph_, txt) in enumerate(qs):
    tin = I(ph_); dim = I(qs[k + 1][0]) if k < 3 else None
    st = f"left:{BX}px;top:{340 + k * 165}px;width:888px" if v else f"left:{BX + (k % 2) * 860}px;top:{230 + (k // 2) * 200}px;width:820px"
    parts.append(numtag(k + 1, txt, tin, b, st, dim=dim, c=SEC if k % 2 else GOLD))
parts.append(f'<div class="abs" style="left:{BX}px;top:{pv(1040, 660)}px;width:{pv(888, 1680)}px;height:3px;background:rgba(255,255,255,.12)" {A(a + .4, b, "fade")}></div>')
scene(a, b, "\n".join(parts), "S")

# ───────── 9. 여러 자료 + 담당자의 경험 ─────────
a, b = T(8)
ke = K("담당자의 경험")
cx, cy = pv(540, 960), pv(780, 470)
docs = [(-380, -230, -12, "판매 자료"), (230, -320, 9, "재고 표"), (-420, 60, 7, "생산 일정"), (260, 40, -8, "채널별 엑셀"),
        (-340, 420, -5, ""), (350, 430, 12, ""), (380, -140, 3, ""), (-560, -120, -15, "")] if v else \
       [(-640, -230, -12, "판매 자료"), (420, -250, 9, "재고 표"), (-700, 110, 7, "생산 일정"), (460, 90, -8, "채널별 엑셀"),
        (-380, 200, -5, ""), (700, -60, 12, ""), (-60, -330, 3, ""), (180, 210, -15, "")]
parts = [el("h2 abs", "여러 자료 확인 +\n**담당자의 경험**", a + .2, b, f"left:{BX}px;top:{pv(250, 120)}px;font-size:{pv(64, 60)}px")]
for k, (dx, dy, rot, lab) in enumerate(docs):
    tin = a + .2 + k * .2
    parts.append(f'<div class="doc" style="left:{cx + dx - 75}px;top:{cy + dy - 98}px" {A(tin, b, "card", f"data-t={chr(34)}rotate({rot}deg){chr(34)} data-dim={chr(34)}{ke:.2f}{chr(34)}")}></div>')
    if lab:
        parts.append(el("tag abs", lab, tin + .2, b, f"left:{cx + dx - 75}px;top:{cy + dy + 108}px;font-size:28px;color:var(--ink2);width:180px", "fade", f'data-dim="{ke:.2f}"'))
parts.append(svg(f'<circle cx="{cx}" cy="{cy - 70}" r="74" fill="#2b3440" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'
                 f'<path d="M{cx - 150},{cy + 150} C{cx - 150},{cy + 30} {cx - 80},{cy + 10} {cx},{cy + 10} C{cx + 80},{cy + 10} {cx + 150},{cy + 30} {cx + 150},{cy + 150} Z" fill="#2b3440" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'
                 f'<circle cx="{cx}" cy="{cy + 10}" r="230" fill="none" stroke="var(--gold)" stroke-width="6" stroke-dasharray="12 14" opacity=".9" data-draw="{ke:.2f},{ke + 1.0:.2f}"/>', a + .2, b))
parts.append(chip("**경험**에 의존한 판단", ke + .3, b, f"left:{cx - 260}px;top:{cy + pv(250, 240)}px"))
scene(a, b, "\n".join(parts))

# ───────── 10. 한곳에 연결 → 다음 할 일 미리 판단 → AX 시스템 ─────────
a, b = T(9)
k1, k2, k3, k4 = K("한 단계 더"), K("판매와 재고"), K("한곳에 연결"), K("다음에 해야 할 일을")
k5 = K("AX 시스템을")
hx, hy = pv(540, 760), pv(760, 480)
nodes = [("판매", -300, -230, -40, -70), ("재고", 300, -230, 40, -60), ("생산", -300, 200, -50, 160), ("고객", 300, 200, 20, 100)] if v else \
        [("판매", -420, -190, -120, -130), ("재고", 420, -190, 150, -130), ("생산", -420, 190, -140, 90), ("고객", 420, 190, 170, 90)]
parts = [el("h2 abs dim", "기존 관리방식", a + .2, k5, f"left:{BX}px;top:{pv(270, 110)}px;display:inline-block").replace('</div>', f'<span class="strike" data-strike="{k1:.2f}"></span></div>', 1)]
lines = []
for k, (lab, fx, fy, sx, sy) in enumerate(nodes):
    tin = k2 + k * .35
    nx, ny = hx + fx, hy + fy
    parts.append(el("node abs", lab, tin, b, f"left:{nx - 130}px;top:{ny - 55}px;width:260px;--c:{GOLD if k % 2 == 0 else SEC}", "scale",
                    f'data-move="{k3 - .2:.2f},{k3 + .9:.2f},{sx:.0f},{sy:.0f},.9,0,0,1"'))
    lines.append(line(hx + fx * .62, hy + fy * .62, hx + fx * .28, hy + fy * .28, k3 + .7, k3 + 1.4, 5))
parts.append(svg("".join(lines), k3 + .6, b))
parts.append(f'<div class="hub abs" style="left:{hx - 105}px;top:{hy - 105}px;width:210px;height:210px;font-size:46px" {A(k3 + .3, b, "scale")}>한곳에<br>연결</div>')
if v:
    parts.append(svg(arrow(hx, hy + 115, hx, 1080, k4, k4 + .8, 7), k4, b))
    parts.append(el("node abs hi", "다음 할 일을 **미리 판단**", k4 + .5, b, f"left:{BX + 64}px;top:1092px;width:760px", "scale"))
else:
    parts.append(svg(arrow(hx + 115, hy, 1330, hy, k4, k4 + .8, 7), k4, b))
    parts.append(el("node abs hi", "다음 할 일을\n**미리 판단**", k4 + .5, b, f"left:1350px;top:{hy - 90}px;width:440px", "scale"))
parts.append(el("h1 abs", "**AX 시스템** 개발 중", k5, b, f"left:{BX}px;top:{pv(250, 96)}px;font-size:{pv(88, 80)}px", "up"))
scene(a, b, "\n".join(parts))

# ───────── 11. 실제 화면 — 개발·검증 중인 시험버전 (PC+모바일) ─────────
a, b = T(10)
ks = K("시험버전")
bw, bh = pv(888, 1000), pv(560, 620)
bx_, by_ = BX, pv(300, 190)
parts = [*([eyebrow("PILOT · 실제 개발 화면", a + .1, b, 240)] if v else []),
         browser(bx_, by_, bw, bh, [("pc_ax", a, b, [(a + .8, b - .3, (0, 0, 1440), (0, 120, 1300))])], a + .1, b, a="push"),
         phone(pv(612, 1300), pv(590, 110), pv(330, 330), [("mob_ax", a, b, [(a + 1.2, b - .3, 0, 520)])], a + .5, b, a="push")]
parts.append(f'<div class="status abs" style="left:{BX}px;top:{pv(900, 100)}px;--c:#e8c995{"" if v else ";font-size:40px;padding:10px 26px"}" {A(ks - .3, b, "up")}><i></i>개발·검증 중인 <span class="acc">시험버전</span></div>')
parts.append(chip("실제 회사 업무 적용 목표", I("지금 보시는") + .6, b, f"left:{BX}px;top:{pv(1020, 830)}px", c=SEC, size=pv(42, 40)))
parts.append(note(a + .5, b))
scene(a, b, "\n".join(parts), "L")

# ───────── 12. 제품 이미지 = 실제 제품 · 분석 숫자 = 시연용 ─────────
a, b = T(11)
kp1, kn1, kn2 = K("실제 제품"), K("분석 숫자"), K("시연용 자료")
if v:
    ca = (BX, 300, 888, 440); cb = (BX, 780, 888, 440)
else:
    ca = (BX, 170, 810, 560); cb = (990, 170, 810, 560)
def cardbox(r, tin, inner, extra=""): return box(f"left:{r[0]}px;top:{r[1]}px;width:{r[2]}px;height:{r[3]}px;overflow:hidden", tin, b, inner, cls="glass", extra=extra)
mini = "".join(f'<div style="flex:1;border-radius:18px;background:#f4efe6;border:1px dashed rgba(23,27,32,.22);padding:{pv(18, 22)}px 0;text-align:center">'
               f'<div style="font-size:{pv(22, 22)}px;font-weight:700;color:rgba(23,27,32,.5)">{lab}</div><div style="font-size:{pv(50, 54)}px;font-weight:800;color:rgba(23,27,32,.78);margin-top:6px">{val}</div></div>'
               for lab, val in (("재고 기간", "95일"), ("생산 검토", "D-4"), ("추천 생산량", "1,750")))
parts = [eyebrow("화면을 보시기 전에", a + .1, b, pv(245, 110)),
         cardbox(ca, a + .2, f'<div style="position:absolute;left:44px;top:40px" class="tag">제품 이미지</div>'
                 f'<div class="h2" style="position:absolute;left:44px;top:{pv(88, 92)}px;font-size:{pv(60, 62)}px">실제 <span class="acc">MIRYEO</span><br>제품 사진</div>'),
         prod(JAR, ca[0] + pv(470, 400), ca[1] + pv(70, 160), pv(380, 380), a + .4, b),
         prod(GCREAM, ca[0] + pv(330, 110), ca[1] + pv(240, 345), pv(190, 210), a + .6, b, glow=False),
         chip("실제 제품", kp1, b, f"left:{ca[0] + 44}px;top:{ca[1] + ca[3] - pv(100, 110)}px", c="#3f9b6e", size=40) if v else
         chip("실제 제품", kp1, b, f"left:{ca[0] + 44}px;top:{ca[1] + 240}px", c="#3f9b6e", size=40),
         cardbox(cb, kn1 - .2, f'<div style="position:absolute;left:44px;top:40px" class="tag">분석 숫자</div>'
                 f'<div style="position:absolute;left:44px;right:44px;top:{pv(100, 120)}px;display:flex;gap:16px">{mini}</div>'),
         el("h2 abs", "이해를 돕는\n**시연용 자료**", kn2 - .1, b, f"left:{cb[0] + 44}px;top:{cb[1] + pv(250, 300)}px;font-size:{pv(58, 60)}px", "up"),
         el("abs", "시연용", kn2, b, f"left:{cb[0] + cb[2] - pv(260, 270)}px;top:{cb[1] + pv(260, 330)}px;padding:10px 26px;border:5px solid {RED};border-radius:16px;color:{RED};font-size:48px;font-weight:900;letter-spacing:.08em", "scale", 'data-t="rotate(-8deg)"'),
         note(a + .5, b, "분석 숫자는 실제 회사 실적·재고가 아닙니다")]
scene(a, b, "\n".join(parts), "L")

# ───────── 13. 이 제품 — 재고만 보면 약 95일 (실제 제품 사진 + 시연 수치) ─────────
a, b = T(12)
k95, kok = K("95일"), K("충분해 보입니다")
if v:
    parts = [prod(JAR, 560, 270, 420, a + .15, b),
             chip("MIRYEO 제품 예시 · 수치는 **시연용**", a + .1, b, f"left:{BX}px;top:260px", size=34),
             el("h3 abs", "이 제품,\n현재 재고만 보면", a + .3, b, f"left:{BX}px;top:380px"),
             el("h2 abs dim", "약", k95 - .2, b, f"left:{BX}px;top:740px"),
             f'<div class="big abs" style="left:{BX + 90}px;top:650px;font-size:250px;color:var(--hi)" {A(k95 - .2, b, "scale")}><span data-count="{k95 - .1:.2f},{k95 + 1.1:.2f},0,95,0,일">95일</span></div>',
             box(f"left:{BX}px;top:960px;width:888px;height:40px", a + .4, b,
                 f'<div class="track" style="height:40px;border-radius:14px"><div class="fill" style="border-radius:14px;--c:linear-gradient(90deg,#c9a45f,#e3c48a)" data-grow="{k95:.2f},{k95 + 1.3:.2f},888"></div></div>', a="fade"),
             el("tag abs", "재고로 판매할 수 있는 기간", a + .5, b, f"left:{BX}px;top:1018px;font-size:30px"),
             f'<div class="status abs" style="left:{BX}px;top:1090px;--c:#3f9b6e" {A(kok, b, "up")}><i></i>겉으로는 <span class="acc">충분해 보임</span></div>']
else:
    parts = [prod(JAR, 1260, 150, 540, a + .15, b),
             chip("MIRYEO 제품 예시 · 수치는 **시연용**", a + .1, b, f"left:{BX}px;top:130px", size=36),
             el("h3 abs", "이 제품, 현재 재고만 보면", a + .3, b, f"left:{BX}px;top:250px"),
             el("h2 abs dim", "약", k95 - .2, b, f"left:{BX}px;top:410px"),
             f'<div class="big abs" style="left:{BX + 100}px;top:330px;font-size:260px;color:var(--hi)" {A(k95 - .2, b, "scale")}><span data-count="{k95 - .1:.2f},{k95 + 1.1:.2f},0,95,0,일">95일</span></div>',
             box(f"left:{BX}px;top:640px;width:1060px;height:40px", a + .4, b,
                 f'<div class="track" style="height:40px;border-radius:14px"><div class="fill" style="border-radius:14px;--c:linear-gradient(90deg,#c9a45f,#e3c48a)" data-grow="{k95:.2f},{k95 + 1.3:.2f},1060"></div></div>', a="fade"),
             el("tag abs", "재고로 판매할 수 있는 기간", a + .5, b, f"left:{BX}px;top:698px;font-size:30px"),
             f'<div class="status abs" style="left:{BX + 560}px;top:686px;--c:#3f9b6e;font-size:42px" {A(kok, b, "up")}><i></i>겉으로는 <span class="acc">충분해 보임</span></div>']
parts.append(note(a + .5, b, NOTE_P))
scene(a, b, "\n".join(parts), "L")

# ───────── 14. 판매속도 + 생산기간 + 안전 재고 → 결과가 달라진다 (막대 변화) ─────────
a, b = T(13)
kv, kp, ks2, kr = K("판매속도와"), K("생산에 걸리는"), K("안전하게 확보"), K("결과가 달라집니다")
TW = pv(888, 1080)
full, short = round(TW * .97), round(TW * .62)
prd, safe = round(TW * .34), round(TW * .16)
start = short - prd - safe
y0 = pv(430, 222)
g = pv(1.0, 0.82)
parts = [svg(f'<line x1="{BX + start}" y1="{y0 + round(50 * g)}" x2="{BX + start}" y2="{y0 + round(560 * g)}" stroke="#b42318" stroke-width="5" stroke-dasharray="14 10"/>'
             f'<line x1="{BX}" y1="{y0 + round(50 * g)}" x2="{BX}" y2="{y0 + round(560 * g)}" stroke="#171b20" stroke-width="5"/>', kr, b),
         el("h3 abs", "재고만 보면 **95일**", a + .2, b, f"left:{BX}px;top:{pv(270, 112)}px;display:inline-block").replace('</div>', f'<span class="strike" data-strike="{kr:.2f}"></span></div>', 1),
         el("h3 abs", "재고로 버티는 기간", a + .3, b, f"left:{BX}px;top:{y0}px;font-size:46px"),
         f'<div class="abs" style="left:{BX}px;top:{y0 + round(70 * g)}px;height:46px;border-radius:12px;background:linear-gradient(90deg,#c9a45f,#e3c48a)" data-w="{a + .4:.2f},{a + 1.3:.2f},0,{full};{kv + .2:.2f},{kv + 1.4:.2f},{full},{short}" {A(a + .3, b, "fade")}></div>',
         chip("최근 **판매속도** ↑", kv, b, f"left:{BX}px;top:{y0 + round(140 * g)}px", size=46),
         el("h3 abs", "생산에 걸리는 기간", kp, b, f"left:{BX}px;top:{y0 + round(250 * g)}px;font-size:46px"),
         f'<div class="abs" style="left:{BX + start}px;top:{y0 + round(320 * g)}px;height:46px;border-radius:12px;background:var(--sec)" data-w="{kp + .2:.2f},{kp + 1.0:.2f},0,{prd}" {A(kp, b, "fade")}></div>',
         el("h3 abs", "안전 재고기간", ks2, b, f"left:{BX}px;top:{y0 + round(410 * g)}px;font-size:46px"),
         f'<div class="abs" style="left:{BX + start + prd}px;top:{y0 + round(480 * g)}px;height:46px;border-radius:12px;background:#9cc7c2" data-w="{ks2 + .3:.2f},{ks2 + 1.0:.2f},0,{safe}" {A(ks2 + .1, b, "fade")}></div>',
         el("tag abs", "오늘", kr, b, f"left:{BX}px;top:{y0 + round(570 * g)}px;font-size:30px;color:#171b20"),
         chip("**생산 시작** 마감이 가까움", kr + .3, b, f"left:{BX + start - 10}px;top:{y0 + round(620 * g)}px;border-color:rgba(180,35,24,.4)", c="#b42318", size=46)]
if not v:
    parts.append(prod(JAR, 1420, 120, 300, a + .2, b, glow=False))
    parts.append(el("h2 abs", "함께 계산하면\n결과가 **달라집니다**", kr - .1, b, "left:1300px;top:420px;width:520px"))
parts.append(note(a + .5, b, NOTE_P, left=pv(None, 1300), width=pv(None, 500)))
scene(a, b, "\n".join(parts), "L")

# ───────── 15. 핵심 결과 — 재고 95일 → 생산 검토 D-4 → 추천 생산량 (Premium Navy) ─────────
a, b = T(14)
k4d, kq = K("4일 안에"), K("생산수량")
def pcard(r, tin, label, value, sub, hi=False, extra="", count=None):
    gold = "background:linear-gradient(180deg,#f6e2b4,#d2a45f 60%,#b97935);-webkit-background-clip:text;background-clip:text;color:transparent"
    val = f'<span data-count="{count}">{value}</span>' if count else value
    st = (f"left:{r[0]}px;top:{r[1]}px;width:{r[2]}px;height:{r[3]}px;border-radius:30px;"
          + ("background:linear-gradient(160deg,rgba(210,164,95,.20),rgba(210,164,95,.05));border:2px solid rgba(232,201,149,.75);box-shadow:0 0 0 10px rgba(210,164,95,.08),0 50px 90px -30px rgba(0,0,0,.9),0 0 80px -10px rgba(210,164,95,.35)"
             if hi else "background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 80px -30px rgba(0,0,0,.8)"))
    return box(st, tin, b, f'<div style="position:absolute;left:40px;top:32px;font-size:30px;font-weight:700;letter-spacing:.04em;color:{"var(--gold-soft)" if hi else "var(--ink2)"}">{label}</div>'
               f'<div style="position:absolute;left:38px;top:{pv(76, 96) if not hi else pv(70, 96)}px;font-size:{pv(150, 132) if hi else pv(96, 118)}px;font-weight:800;letter-spacing:-.04em;line-height:1;{gold if hi else "color:var(--ink)"}">{val}</div>'
               f'<div style="position:absolute;left:40px;right:30px;bottom:30px;font-size:30px;font-weight:600;color:var(--ink2);line-height:1.3">{sub}</div>', a="card", extra=extra)
if v:
    r1, r2, r3 = (BX, 300, 888, 262), (BX, 600, 888, 330), (BX, 968, 888, 262)
    arr = arrow(540, 568, 540, 592, a + .9, k4d - .1, 6) + arrow(540, 936, 540, 960, kq - .5, kq - .2, 6)
else:
    r1, r2, r3 = (BX, 230, 470, 420), (660, 190, 600, 500), (1330, 230, 470, 420)
    arr = arrow(600, 440, 650, 440, a + .9, k4d - .1, 6) + arrow(1270, 440, 1320, 440, kq - .5, kq - .2, 6)
parts = [f'<div class="abs" style="left:{pv(-200, 300)}px;top:{pv(350, -200)}px;width:{pv(1400, 1300)}px;height:{pv(900, 1300)}px;border-radius:50%;background:radial-gradient(closest-side, rgba(210,164,95,.18), transparent)" {A(a, b, "fade")}></div>',
         eyebrow("현재 시연 조건의 결과", a + .1, b, pv(250, 120)),
         pcard(r1, a + .2, "재고만 보면", "95일", "겉으로는 충분해 보임", extra=f'data-dim="{k4d:.2f}"'),
         svg(arr, a + .8, b),
         pcard(r2, k4d - .2, "생산 검토", "D-4", "약 4일 안에 다음 생산 여부 검토", hi=True),
         pcard(r3, kq - .2, "추천 생산량", "1,750개", "필요한 생산수량도 함께 계산", count=f"{kq:.2f},{kq + 1.2:.2f},0,1750,0,개"),
         el("chip abs", "시연용 데이터", a + .4, b, f"left:{pv(BX + 620, 1520)}px;top:{pv(250, 112)}px;font-size:28px;padding:8px 20px;--c:{RED}", "up"),
         note(a + .5, b, NOTE_P)]
scene(a, b, "\n".join(parts))

# ───────── 16. 상황이 바뀌면 판단도 바뀐다 (실제 화면 상태 변화) ─────────
a, b = T(15)
kf, kpull, kin, kno = K("30퍼센트"), K("앞당겨지고"), K("반대로 추가 입고"), K("불필요한 생산")
bw, bh = pv(888, 1020), pv(720, 690)
bx_, by_ = BX, pv(530, 110)
cc = (550, pv(650, 700), 750)
shots = [("pc_demo_base", a, kf + .3, [(a, b, cc, cc)]), ("pc_demo_faster", kf, kin + .3, [(a, b, cc, cc)]), ("pc_demo_incoming", kin, b, [(a, b, cc, cc)])]
d_b = ui_rect(bx_, by_, bw, cc, (dm("base", "decision")[0] - 6, dm("base", "decision")[1] - 6, 727, 160))
d_f = ui_rect(bx_, by_, bw, cc, (dm("faster", "decision")[0] - 6, dm("faster", "decision")[1] - 6, 727, 120))
d_i = ui_rect(bx_, by_, bw, cc, (dm("incoming", "decision")[0] - 6, dm("incoming", "decision")[1] - 6, 727, 190))
cx0 = pv(BX, 1210)
parts = [browser(bx_, by_, bw, bh, shots, a, b, "MIRYEO · AX SPRINT II 심사 페이지 (시연)"),
         focus(*d_b, a + .5, kf, a, b), focus(*d_f, kpull, kin, a, b), focus(*d_i, kno, b, a, b),
         el("tag abs", "실제 개발 화면 · 시연 조건 변경", a + .2, b, f"left:{cx0}px;top:{pv(250, 120)}px;font-size:28px"),
         chip("판매속도 **30% ↑**", kf, b, f"left:{cx0}px;top:{pv(300, 170)}px", c="#b42318", size=pv(44, 48)),
         el("h3 abs", "→ 생산 시점 **앞당김**", kpull, b, f"left:{cx0}px;top:{pv(390, 270)}px;font-size:{pv(46, 52)}px", "left", f'data-dim="{kin:.2f}"'),
         chip("추가 입고 **예정**", kin, b, f"left:{pv(BX + 470, 1210)}px;top:{pv(300, 420)}px", c=SEC, size=pv(44, 48)),
         el("h3 abs", "→ **불필요한 생산** 줄임", kno, b, f"left:{pv(BX + 470, 1210)}px;top:{pv(390, 520)}px;font-size:{pv(46, 52)}px", "left"),
         note(a + .5, b)]
scene(a, b, "\n".join(parts), "L")

# ───────── 17. 핵심 — 미리 판단 (BIG MOMENT) ─────────
a, b = T(16)
kn1, kpast, kq1, kq2, kbig = K("보여주는 것이 아니라"), K("현재와 과거"), K("앞으로 재고가"), K("언제 생산을"), K("미리 판단하는 것이")
ty = pv(560, 380); x0, x1, x2 = (BX + 60, BX + 400, BX + 820) if v else (BX + 60, BX + 470, BX + 960)
parts = [el("h2 abs dim", "지금 재고가 몇 개인가?", a + .2, b, f"left:{BX}px;top:{pv(280, 130)}px;display:inline-block", extra=f'data-dim="{kbig:.2f}"').replace('</div>', f'<span class="strike" data-strike="{kn1:.2f}"></span></div>', 1),
         svg(line(x0, ty, x1, ty, kpast, kpast + .6, 6, "rgba(244,241,236,.6)") + line(x1, ty, x2, ty, kpast + .5, kpast + 1.1, 6, "var(--gold)", "") +
             f'<circle cx="{x0}" cy="{ty}" r="16" fill="rgba(244,241,236,.6)"/><circle cx="{x1}" cy="{ty}" r="20" fill="#f4f1ec"/><circle cx="{x2}" cy="{ty}" r="24" fill="var(--gold)"/>', kpast, b),
         el("tag abs", "과거", kpast, b, f"left:{x0 - 30}px;top:{ty + 34}px;font-size:34px", extra=f'data-dim="{kbig:.2f}"'),
         el("tag abs", "현재", kpast + .2, b, f"left:{x1 - 30}px;top:{ty + 34}px;font-size:34px;color:#f4f1ec", extra=f'data-dim="{kbig:.2f}"'),
         el("tag abs", "앞으로", kpast + .4, b, f"left:{x2 - 50}px;top:{ty + 34}px;font-size:34px;color:var(--gold-soft)", extra=f'data-dim="{kbig:.2f}"'),
         numtag("?", "언제 재고가 **부족**해질지", kq1, b, f"left:{BX}px;top:{pv(700, 520)}px;width:{pv(888, 800)}px", dim=kbig),
         numtag("?", "언제 **생산**을 준비할지", kq2, b, f"left:{pv(BX, 960)}px;top:{pv(840, 520)}px;width:{pv(888, 820)}px", dim=kbig, c=SEC),
         el("h0 abs", "**미리 판단**", kbig, b, f"left:{BX}px;top:{pv(990, 636)}px;font-size:{pv(170, 150)}px;text-shadow:0 10px 40px rgba(0,0,0,.6)", "scale")]
scene(a, b, "\n".join(parts))

# ───────── 18. 고객 반응 — 구매 전 관심신호 (모바일 실제 화면) ─────────
a, b = T(17)
kc1, kc2, kc3, kc4, kc5 = K("고객이 제품을"), K("자신의 고민"), K("관심 있는 제품을"), K("구매처를 확인"), K("관심신호가")
pw = pv(400, 330); px_, py_ = pv(BX, 800), pv(440, 96)
shots = [("mob_product", a, kc2 + .3, [(a + .6, kc2, 0, 330)]),
         ("mob_finder1", kc2, kc2 + 1.9, [(kc2, kc2 + 1, 0, 0)]),
         ("mob_finder_result", kc2 + 1.6, kc3 + .3, [(kc2 + 1.9, kc3, 0, 120)]),
         ("mob_passport", kc3, b, [(kc3 + .4, kc5, 0, 300)])]
cx0 = pv(BX + 440, 1200)
steps = [(kc1, "제품 **조회**"), (kc2, "고민 맞춤 **확인**"), (kc3, "관심 제품 **저장**"), (kc4, "**구매처** 확인")]
parts = [el("h2 abs", "고객의 **반응**도\n함께 연결합니다", a + .1, b, f"left:{BX}px;top:{pv(240, 140)}px;font-size:{pv(64, 60)}px"),
         phone(px_, py_, pw, shots, a + .2, b, a="push")]
for k, (tin, txt) in enumerate(steps):
    y = pv(500 + k * 130, 200 + k * 120)
    parts.append(chip(txt, tin, b, f"left:{cx0}px;top:{y}px", c=SEC, size=pv(44, 48)))
    parts.append(f'<div class="orbit abs" style="left:{px_ + pw - 20}px;top:{y + 30}px" {A(tin, tin + 1.2, "fade")} data-move="{tin:.2f},{tin + .9:.2f},0,0,.6,{cx0 - px_ - pw:.0f},0,1"></div>')
parts.append(chip("= 구매 전 **관심신호**", kc5, b, f"left:{cx0}px;top:{pv(1040, 690)}px;border-color:rgba(232,201,149,.6)", size=pv(46, 52)))
parts.append(note(a + .5, b, "고객 앱 시험버전 화면 · 시연용 예시", left=pv(500, BX), width=pv(460, None), top=pv(1200, None)))
scene(a, b, "\n".join(parts), "L")

# ───────── 19. 관심 상승 → 판매·재고와 함께 판단 (간결한 흐름) ─────────
a, b = T(18)
km2, km3 = K("판매량과"), K("어떤 제품의 수요가")
sig = [("조회", .3), ("관심 저장", .55), ("구매처 확인", .8)]
if v:
    c1 = (BX, 300, 888, 330); n2 = (BX + 144, 760, 600, 130); n3 = (BX, 1010, 888, 200)
    ar = arrow(540, 650, 540, 745, a + 1.1, a + 1.5, 6) + arrow(540, 905, 540, 995, km3 - .5, km3 - .1, 6)
    chp = f"left:{BX + 600}px;top:910px"
else:
    c1 = (BX, 190, 640, 500); n2 = (850, 330, 400, 180); n3 = (1350, 290, 450, 260)
    ar = arrow(775, 420, 835, 420, a + 1.1, a + 1.5, 6) + arrow(1265, 420, 1335, 420, km3 - .5, km3 - .1, 6)
    chp = "left:1350px;top:180px"
rows_ = "".join(f'<div style="display:flex;align-items:center;gap:16px;margin-top:{18 if k else 0}px"><span style="width:{pv(200, 210)}px;font-size:{pv(38, 40)}px;font-weight:700">{t}</span>'
                f'<span style="flex:1;height:18px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#3f8585,#7fb7b2)" data-w="{a + d:.2f},{a + d + 1.0:.2f},0,{pv(230, 200) + k * 20}"></span></span>'
                f'<span style="font-size:{pv(40, 42)}px;font-weight:800;color:var(--sec-soft)">↑</span></div>' for k, (t, d) in enumerate(sig))
parts = [el("h2 abs", "고객 관심도 **함께 판단**", a + .1, b, f"left:{BX}px;top:{pv(220, 96)}px;font-size:{pv(60, 56)}px"),
         box(f"left:{c1[0]}px;top:{c1[1]}px;width:{c1[2]}px;height:{c1[3]}px", a + .2, b, "", cls="glass"),
         prod(GCREAM, c1[0] + 30, c1[1] + pv(60, 40), pv(240, 240), a + .3, b, glow=False),
         box(f"left:{c1[0] + pv(300, 40)}px;top:{c1[1] + pv(70, 300)}px;width:{c1[2] - pv(340, 80)}px", a + .3, b, rows_, a="fade"),
         svg(ar, a + 1.0, b),
         el("node abs hi", "고객 관심 **상승**", a + 1.4, b, f"left:{n2[0]}px;top:{n2[1]}px;width:{n2[2]}px;font-size:{pv(50, 48)}px", "scale"),
         chip("+ 판매 · 재고", km2, b, chp, c=GOLD, size=pv(42, 44)),
         el("node abs", "판매·재고와\n**함께 판단**", km3 - .1, b, f"left:{n3[0]}px;top:{n3[1]}px;width:{n3[2]}px;font-size:{pv(54, 52)}px;line-height:1.2;--c:var(--gold)", "scale"),
         el("tag abs", "수요가 커질 제품을 미리 파악", km3 + .5, b, f"left:{n3[0]}px;top:{n3[1] + n3[3] + 16}px;width:{n3[2]}px;text-align:center;font-size:30px"),
         note(a + .5, b, "제품 사진: 실제 MIRYEO 제품 · 고객 반응 변화는 시연용 예시입니다")]
scene(a, b, "\n".join(parts), "S")

# ───────── 20. 판단에서 끝나지 않는다 — 대표·담당자 확인 후 실행 (실제 처리 창) ─────────
a, b = T(19)
kt1, kt2 = K("다음에 확인할 일을"), K("대표나 담당자가")
if v:
    bx_, by_, bw, bh = BX, 400, 888, 760
else:
    bx_, by_, bw, bh = BX, 210, 920, 600
crop0 = (830, 0, 610); viewc = (bh - 40) * 610 / bw
crop1 = (830, max(0, 900 - viewc), 610)
fs = ui_rect(bx_, by_, bw, crop0, (858, 150, 566, 62))
fb = ui_rect(bx_, by_, bw, crop1, (858, 826, 566, 62))
parts = [el("h2 abs", "판단에서 **끝나지 않습니다**", a + .1, b, f"left:{BX}px;top:{pv(250, 110)}px"),
         browser(bx_, by_, bw, bh, [("pc_drawer", a, b, [(kt2 + .2, kt2 + 1.6, crop0, crop1)])], a + .3, b, "MIRYEO · BUSINESS AX — 다음 할 일 처리"),
         focus(*fs, kt1 + .2, kt2 + .2, a, b), focus(*fb, kt2 + 1.7, b, a, b)]
if v:
    parts.append(chip("시스템은 **제안** · 실행은 **사람**이", kt2, b, "left:72px;top:1180px", size=44))
else:
    parts += [chip("시스템이 다음 할 일 **제안**", kt1, b, "left:1100px;top:300px", size=46),
              chip("대표·담당자 **확인 후 실행**", kt2, b, "left:1100px;top:420px", c=SEC, size=46),
              el("tag abs", "자동 실행이 아닌 사람이 판단하는 방식", kt2 + .4, b, "left:1100px;top:540px;font-size:30px")]
parts.append(note(a + .5, b))
scene(a, b, "\n".join(parts))

# ───────── 21. 한국어 5단계 순환 — 시스템 제안 → 담당자 확인 → 실행 → 실제 결과 → 다음 판단 ─────────
a, b = T(20)
kr1, kr2, kr3, kr4 = K("실제 판매와 재고가"), K("다시 기록"), K("다음 판단에"), K("활용하는 구조")
cx, cy = pv(540, 960), pv(780, 480)
rx, ry = pv(320, 600), pv(380, 255)
labs = [("시스템\n**제안**", a + .2, GOLD), ("담당자\n**확인**", a + .45, SEC), ("**실행**", a + .7, GOLD), ("실제 결과\n**기록**", kr1, SEC), ("다음\n**판단**", kr3, GOLD)]
parts = [eyebrow("사람이 확인하고 실행하는 구조", a + .1, b, pv(250, 112)),
         svg(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="rgba(232,201,149,.35)" stroke-width="4" data-draw="{a + .2:.2f},{a + 1.6:.2f}"/>', a, b),
         f'<div class="orbit abs" {A(kr3, b, "fade")} data-orbit="{kr3:.2f},{cx},{cy},{rx},{ry},4.0"></div>',
         el("abs center", "결과가 다시\n**다음 판단**으로", kr4 - .1, b, f"left:{cx - 210}px;top:{cy - 60}px;width:420px;text-align:center;font-size:{pv(40, 40)}px;font-weight:700;line-height:1.3;color:var(--ink2)", "scale")]
for k, (txt, tin, c) in enumerate(labs):
    ang = -math.pi / 2 + k * 2 * math.pi / 5
    nx, ny = cx + rx * math.cos(ang), cy + ry * math.sin(ang)
    nw = pv(250, 270)
    parts.append(f'<div class="node abs" style="left:{nx - nw / 2:.0f}px;top:{ny - 70:.0f}px;width:{nw}px;--c:{c};font-size:{pv(42, 42)}px;line-height:1.2;padding:20px 16px" {A(tin, b, "scale")}>'
                 f'<div style="font-size:24px;font-weight:800;color:var(--gold-soft);margin-bottom:4px">{k + 1}</div>{em(txt)}</div>')
scene(a, b, "\n".join(parts))

# ───────── 22. AI 분석 및 예측 솔루션 — 도입·검증 중 (BIG STATEMENT) ─────────
a, b = T(21)
kai, kin2 = K("AI 분석 및 예측"), K("도입을 진행")
scene(a, b, "\n".join([
    f'<div class="abs" style="left:{pv(-100, 500)}px;top:{pv(300, -100)}px;width:{pv(1300, 1200)}px;height:{pv(1100, 1200)}px;border-radius:50%;background:radial-gradient(closest-side, rgba(210,164,95,.20), transparent)" {A(a, b, "fade")}></div>',
    eyebrow("이번 AX 스프린트 II", a + .1, b, pv(420, 200)),
    el("h1 abs", "**AI 분석·예측**\n솔루션 도입", kai - .2, b, f"left:{BX}px;top:{pv(480, 260)}px;font-size:{pv(104, 112)}px", "up"),
    f'<div class="status abs" style="left:{BX}px;top:{pv(800, 560)}px;--c:#e3b65c;font-size:{pv(56, 56)}px;padding:20px 36px" {A(kin2, b, "scale")}><i></i><span class="acc">도입·검증 중</span></div>',
    el("tag abs", "현재 시험단계에서 실제 업무 적용을 검증하고 있습니다", kin2 + .4, b, f"left:{BX}px;top:{pv(930, 690)}px;font-size:30px"),
]))

# ───────── 23. 현재 구현(규칙·통계) + 도입·검증 중(데이터 축적 구조) ─────────
a, b = T(22)
kru, kso, kne, kan = K("규칙과 통계방식"), K("재고 소진시점"), K("생산 필요시점"), K("분석예측하고")
kd1, kd2 = K("판매, 재고, 생산"), K("구조를 구축")
if v:
    ca, cb = (BX, 300, 888, 470), (BX, 810, 888, 420)
else:
    ca, cb = (BX, 130, 820, 640), (980, 130, 820, 640)
calc = [(kru + .5, "최근 **판매속도**"), (kru + .9, "+ 현재 재고 · 입고 예정"), (kru + 1.3, "+ 생산기간 · 안전 재고")]
parts = [box(f"left:{ca[0]}px;top:{ca[1]}px;width:{ca[2]}px;height:{ca[3]}px", a + .1, b, "", cls="glass"),
         stagepill("현재 구현", "var(--gold)", a + .2, b, f"left:{ca[0] + 36}px;top:{ca[1] + 32}px"),
         el("h3 abs", "설명하기 쉬운 **규칙·통계** 방식", a + .3, b, f"left:{ca[0] + 36}px;top:{ca[1] + 100}px;font-size:{pv(46, 46)}px")]
for k, (tin, txt) in enumerate(calc):
    parts.append(el("abs", txt, tin, b, f"left:{ca[0] + 36}px;top:{ca[1] + pv(180, 200) + k * pv(56, 66)}px;font-size:{pv(36, 40)}px;font-weight:600;color:var(--ink2)", "left"))
parts += [f'<div class="abs" style="left:{ca[0] + 36}px;top:{ca[1] + pv(356, 410)}px;width:{ca[2] - 72}px;height:3px;background:rgba(23,27,32,.16)" {A(kso - .2, b, "fade")}></div>',
          el("abs", "= **재고 소진시점** · **생산 필요시점**", kso, b, f"left:{ca[0] + 36}px;top:{ca[1] + pv(380, 440)}px;font-size:{pv(40, 42)}px;font-weight:800", "left"),
          chip("분석 · **예측**", kan, b, f"left:{ca[0] + 36}px;top:{ca[1] + ca[3] + pv(-2, -110)}px" if not v else f"left:{ca[0] + ca[2] - 320}px;top:{ca[1] + 30}px", size=40)]
# 데이터 축적 구조 (도입·검증 중)
parts += [box(f"left:{cb[0]}px;top:{cb[1]}px;width:{cb[2]}px;height:{cb[3]}px", kd1 - .3, b, "", cls="glass"),
          stagepill("도입·검증 중", "var(--sec)", kd1 - .2, b, f"left:{cb[0] + 36}px;top:{cb[1] + 32}px"),
          el("h3 abs", "실제 데이터를 쌓는 **구조**", kd1 - .1, b, f"left:{cb[0] + 36}px;top:{cb[1] + 100}px;font-size:{pv(46, 46)}px")]
layers = ["판매", "재고", "생산", "고객반응"]
for k, lab in enumerate(layers):
    tin = kd1 + k * .45
    if v:
        st = f"left:{cb[0] + 36 + k * 206}px;top:{cb[1] + 200}px;width:190px;height:150px"
    else:
        st = f"left:{cb[0] + 60 + (k % 2) * 360}px;top:{cb[1] + 210 + (k // 2) * 170}px;width:330px;height:140px"
    parts.append(box(f"{st};border-radius:20px;background:linear-gradient(180deg,#eaf3f1,#d6e8e4);border:2px solid rgba(63,133,133,.45);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px", tin, b,
                     f'<div style="width:46px;height:12px;border-radius:6px;background:rgba(63,133,133,.6);box-shadow:0 18px 0 rgba(63,133,133,.35)"></div><div style="margin-top:16px;font-size:{pv(36, 40)}px;font-weight:800;color:#1f4f4f">{lab}</div>', a="up"))
parts.append(chip("계속 **축적**", kd2, b, f"left:{cb[0] + cb[2] - pv(300, 300)}px;top:{cb[1] + 30}px", c=SEC, size=40))
scene(a, b, "\n".join(parts), "L")

# ───────── 24. 3단계 구조 — 현재 구현 → 도입·검증 중 → 향후 고도화 (계획은 점선) ─────────
a, b = T(23)
kt0, kfx, kml, kst = K("이렇게 축적되는"), K("제품별 수요와"), K("시계열 분석과"), K("단계적으로 적용하고")
cards = [(a + .2, "현재 구현", "var(--gold)", "**규칙·통계** 기반\n분석·예측", False),
         (a + .5, "도입·검증 중", "var(--sec)", "실제 운영데이터\n**축적·검증**", False),
         (kml - .2, "향후 고도화", "#b97935", "**시계열·머신러닝**\nAI 예측", True)]
parts = [eyebrow("AI 분석·예측 — 단계적 고도화", a + .1, b, pv(245, 105))]
for k, (tin, tag, c, txt, dash) in enumerate(cards):
    if v: r = (BX, 300 + k * 235, 888, 205)
    else: r = (BX + k * 575, 160, 530, 330)
    bd = "border:3px dashed rgba(169,106,39,.65);background:rgba(255,255,255,.55)" if dash else ""
    parts.append(box(f"left:{r[0]}px;top:{r[1]}px;width:{r[2]}px;height:{r[3]}px;padding:{pv(26, 36)}px 36px 0 50px;{bd}", tin, b,
                     f'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px;background:{c};{"opacity:.6" if dash else ""}"></div>'
                     f'<div class="stage" style="--c:{c};position:static">{tag}</div><div class="h3" style="margin-top:{pv(14, 22)}px;font-size:{pv(46, 48)}px;line-height:1.22">{em(txt)}</div>', cls="glass"))
    if k < 2:
        if v: parts.append(svg(arrow(540, r[1] + r[3] + 4, 540, r[1] + r[3] + 28, tin + .3, tin + .6, 5), tin, b))
        else: parts.append(svg(arrow(r[0] + r[2] + 8, 325, r[0] + r[2] + 38, 325, tin + .3, tin + .6, 5), tin, b))
# 정교화 대상 (향후)
tg = ["제품별 수요", "판매 흐름", "재고 부족 가능성"]
for k, t in enumerate(tg):
    x = pv(BX + [0, 260, 500][k], BX + 1150 + [0, 0, 0][k]); y = pv(1010, 530 + k * 0)
    if not v: x = 1270 + [0, 0, 0][k]; y = 520 + k * 70
    parts.append(chip(t, kfx + k * .3, b, f"left:{x}px;top:{y}px", c="#b97935", size=pv(34, 34)))
# 예측 정교화 계단 (현재 = 실선, 향후 = 점선)
bxs = pv(BX, BX + 40); base_y = pv(1230, 690)
for k, hgt in enumerate(pv([50, 80, 110], [60, 110, 160])):
    dash = k == 2
    w_ = pv(120, 150)
    style = f"left:{bxs + k * pv(140, 180)}px;top:{base_y - hgt}px;width:{w_}px;height:{hgt}px;border-radius:14px 14px 4px 4px;" + \
            ("border:4px dashed #b97935;background:rgba(210,164,95,.16)" if dash else f"background:{'linear-gradient(180deg,#d9b77a,#b97935)' if k == 0 else 'linear-gradient(180deg,#7fb7b2,#3f8585)'}")
    if v: style = style.replace(f"left:{bxs + k * 140}px", f"left:{BX + 470 + k * 140}px")
    parts.append(f'<div class="abs" style="{style}" {A(kst + k * .25, b, "up")}></div>')
parts.append(el("tag abs", "예측을 단계적으로 정교화", kst + .3, b, f"left:{pv(BX, BX + 600)}px;top:{pv(1150, 640)}px;font-size:30px;color:rgba(23,27,32,.7)"))
parts.append(note(a + .5, b, "점선 = 향후 고도화 계획 (현재 구현 아님) · 시계열·머신러닝은 데이터 축적 후 단계적으로 적용·검증"))
scene(a, b, "\n".join(parts), "L")

# ───────── 25. '언젠가 AI' 계획이 아니라 — 지금 만들고·쌓고·검증 중 ─────────
a, b = T(24)
kno2, kbuild, kacc, kver = K("계획이 아니라"), K("AI 분석예측 체계를"), K("데이터를 쌓으며"), K("검증해 나가는 과정")
parts = [el("h2 abs dim", "언젠가 AI를 사용하겠다", a + .2, b, f"left:{BX}px;top:{pv(300, 150)}px;display:inline-block").replace('</div>', f'<span class="strike" data-strike="{kno2:.2f}"></span></div>', 1),
         el("h1 abs", "지금 **만들고 · 쌓고 · 검증** 중", kno2 + .3, b, f"left:{BX}px;top:{pv(440, 270)}px;font-size:{pv(76, 92)}px")]
steps = [(kbuild, "AI 분석·예측 **체계 구축**", GOLD), (kacc, "실제 데이터 **축적**", SEC), (kver, "실제 업무 적용 **검증**", GOLD)]
for k, (tin, txt, c) in enumerate(steps):
    st = f"left:{BX}px;top:{640 + k * 150}px;width:888px" if v else f"left:{BX + k * 570}px;top:470px;width:540px"
    parts.append(numtag(k + 1, txt, tin, b, st, c=c, size=pv(48, 44)))
parts.append(f'<div class="status abs" style="left:{BX}px;top:{pv(1110, 650)}px;--c:#e3b65c;font-size:40px;padding:12px 28px" {A(kver + .3, b, "up")}><i></i>AI 분석·예측 솔루션 · <span class="acc">도입·검증 중</span></div>')
scene(a, b, "\n".join(parts))

# ───────── 26. 단순한 관리 프로그램이 아닙니다 (BIG) ─────────
a, b = T(25)
kx = K("아닙니다", after=a)
scene(a, b, "\n".join([
    eyebrow("이번 AX로 만들고 싶은 것", a + .1, b, pv(560, 300)),
    el("h3 abs dim", "단순한", a + .3, b, f"left:{BX}px;top:{pv(640, 380)}px"),
    el("h0 abs", "관리 프로그램", a + .5, b, f"left:{BX}px;top:{pv(720, 450)}px;font-size:{pv(120, 150)}px;display:inline-block", "scale").replace('</div>', f'<span class="strike" style="height:10px" data-strike="{kx:.2f}"></span></div>', 1),
]))

# ───────── 27. 과거를 정리하는 회사 → 미리 판단하는 회사 (TRANSFORMATION) ─────────
a, b = T(26)
kfu, kpj, kre = K("현재의 데이터를"), K("미리 판단할 수 있는 회사"), K("그것이 가연")
if v:
    A1 = f"left:{BX}px;top:260px;width:888px;height:250px;padding:40px"
    A2 = f"left:{BX}px;top:660px;width:888px;height:300px;padding:44px"
    arr = arrow(540, 530, 540, 640, kfu, kfu + .6, 7)
else:
    A1 = f"left:{BX}px;top:180px;width:700px;height:330px;padding:44px"
    A2 = f"left:1000px;top:150px;width:800px;height:390px;padding:50px"
    arr = arrow(840, 345, 980, 345, kfu, kfu + .6, 7)
parts = [box(A1, a + .2, b, f'<div class="tag">BEFORE</div><div class="h2" style="margin-top:12px;color:var(--ink2)">이미 일어난 일을<br>정리해서 보는 회사</div>', cls="glass", extra=f'data-dim="{kpj:.2f}"'),
         svg(arr, kfu, b),
         box(A2, kpj - .3, b, f'<div class="tag" style="color:var(--gold-soft)">AFTER · AX</div><div class="h2" style="margin-top:12px">다음에 할 일을<br><span class="acc">미리 판단하는 회사</span></div>', cls="glass hiedge"),
         chip("**AX 스프린트 II** 신청 이유", kre, b, f"left:{pv(BX, 1000)}px;top:{pv(1060, 600)}px")]
scene(a, b, "\n".join(parts))

# ───────── 28. 향후 — K-Beauty 중소기업 대상 구독형 AX 서비스 (검토) ─────────
a, b = T(27)
kb2, kb3, kb4 = K("운영성과가 축적"), K("비슷한 고민을"), K("구독형 AX")
stp = [(a + .2, "STEP 1 · 지금", "가연인터내셔널 내부 **PILOT**", False), (kb2, "STEP 2", "실제 데이터 · 운영성과 **축적**", False), (kb4, "STEP 3 · 확장 검토", "K-Beauty 중소기업 대상\n**구독형 AX 서비스**", True)]
parts = [eyebrow("NEXT · 확장 방향 (검토 단계)", a + .1, b, pv(250, 100))]
for k, (tin, tag, txt, dash) in enumerate(stp):
    if v: st = f"left:{BX}px;top:{310 + k * 230}px;width:888px;height:{200 if k < 2 else 250}px;padding:28px 36px 0 50px"
    else: st = f"left:{BX + k * 570}px;top:160px;width:540px;height:300px;padding:34px 34px 0 50px"
    bd = "border:3px dashed rgba(169,106,39,.6);background:rgba(255,255,255,.55)" if dash else ""
    parts.append(box(f"{st};{bd}", tin, b, f'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px;background:{"#d9b77a" if dash else "var(--gold)" if k == 0 else "var(--sec)"}"></div>'
                     f'<div class="tag" style="color:{"#a96a27" if dash else "rgba(23,27,32,.55)"}">{tag}</div><div class="h3" style="margin-top:10px;font-size:{pv(50, 46)}px">{em(txt)}</div>', cls="glass", extra=(f'data-dim="{kb4:.2f}"' if k == 0 else "")))
for k in range(5):
    x = pv(BX + 40 + k * 120, 1240 + k * 110); y = pv(1060, 560)
    parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;width:84px;height:96px;border-radius:14px 14px 6px 6px;background:#fff;border:3px solid rgba(23,27,32,.14);box-shadow:0 18px 30px -20px rgba(70,45,20,.4)" {A(kb3 + k * .18, b, "up")}>'
                 f'<div style="margin:16px auto 0;width:44px;height:10px;border-radius:5px;background:rgba(63,133,133,.5);box-shadow:0 20px 0 rgba(63,133,133,.3),0 40px 0 rgba(63,133,133,.2)"></div></div>')
parts.append(el("tag abs", "비슷한 고민을 가진 K-Beauty 중소기업", kb3 + .4, b, f"left:{pv(BX + 40, 1240)}px;top:{pv(1180, 680)}px;font-size:30px;color:rgba(23,27,32,.6)"))
parts.append(note(a + .5, b, "확장은 검토 단계입니다 · 출시·고객 확보 계획이 아닙니다"))
scene(a, b, "\n".join(parts), "L")

# ───────── 29. 마무리 — 감사합니다 (CLOSING) ─────────
a, b = T(28)
kt = K("검토해주셔서")
cxm = W // 2
scene(a, b, "\n".join([
    f'<div class="abs" style="left:{cxm - 66}px;top:{pv(420, 150)}px;width:132px;height:132px;border-radius:34px;background:linear-gradient(160deg,#e3c48a,#b97935);display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:900;color:#141a22;box-shadow:0 40px 80px -30px rgba(0,0,0,.8)" {A(a + .1, b, "scale")}>M</div>',
    el("h2 abs center", "MIRYEO K-Beauty Growth AX", a + .3, b, f"left:0;right:0;top:{pv(610, 320)}px;text-align:center;font-size:{pv(60, 68)}px"),
    el("h3 abs center dim", "주식회사 가연인터내셔널", a + .5, b, f"left:0;right:0;top:{pv(710, 420)}px;text-align:center"),
    el("h1 abs center", "**감사합니다**", kt + .6, b, f"left:0;right:0;top:{pv(850, 540)}px;text-align:center;font-size:{pv(100, 104)}px", "scale"),
    el("note abs", "AX 스프린트 II 담당자용 보조자료 · 제품 사진은 실제 제품, 화면 속 분석 수치는 시연용 예시 데이터입니다", a + .8, b, f"left:{pv(90, 0)}px;right:{pv(90, 0)}px;top:{pv(1060, 740)}px;text-align:center;font-size:24px"),
]))

# ───────── 틀에 넣기 ─────────
guides = (['<div class="guide" style="left:0;right:0;top:0;height:220px"></div>', f'<div class="guide" style="left:72px;width:888px;top:220px;height:1080px"></div>',
           '<div class="guide" style="left:132px;right:132px;top:1330px;height:180px"></div>', '<div class="guide" style="left:0;right:0;top:1520px;bottom:0"></div>']
          if v else ['<div class="guide" style="left:120px;width:1680px;top:96px;height:724px"></div>', '<div class="guide" style="left:160px;right:160px;top:842px;height:150px"></div>'])
subs_js = json.dumps([[s_["in"], s_["out"], s_["text"]] for s_ in SUBS], ensure_ascii=False)
tpl = open("comp.tpl.html").read()
out = (tpl.replace("<!--SCENES-->", "\n".join(scenes)).replace("/*SUBS*/", subs_js).replace("/*DUR*/", str(DUR))
          .replace("/*FMT*/", FMT).replace("/*LIGHT*/", json.dumps(LIGHT)).replace("<!--GUIDES-->", "\n".join(guides)))
open(f"comp/comp_{FMT}.html", "w").write(out)
json.dump([round(x, 2) for x in B], open(f"out/bounds_{FMT}.json", "w"))
print(FMT, "장면", len(scenes), "DUR", DUR, "경계", [round(x, 1) for x in B])
