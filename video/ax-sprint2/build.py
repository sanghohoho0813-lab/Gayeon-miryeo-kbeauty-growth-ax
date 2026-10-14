#  build.py — 장면표 → comp_v.html(1080×1920) / comp_h.html(1920×1080)   (AX 영상 스타일 가이드 v4.1)
#  python build.py v|h
import json, html, re, sys, wave

FMT = sys.argv[1]
v = FMT == "v"
W, H = (1080, 1920) if v else (1920, 1080)
SUBS = json.load(open("subs.json"))
CH = json.load(open("chars.json"))
S = [s["in"] for s in SUBS]
w_ = wave.open("voice.wav"); VOICE = w_.getnframes() / w_.getframerate()
DUR = round(VOICE + 0.6 + 2.6, 2)
open("out/dur.txt", "w").write(str(DUR))
NOTE = "화면 속 제품·수치는 시연용 예시(Demo·샘플) 데이터입니다 · 실제 회사 실적이 아닙니다"
PHOTO = "사진: 주식회사 가연인터내셔널 회사소개서"
GOLD, SEC = "var(--gold)", "var(--sec)"

# 본문 영역
if v:
    BX, BY, BW, BB = 72, 230, 888, 1300   # x, top, width, bottom
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
def chip(txt, tin, tout, style, c=GOLD, a="up", size=None):
    fs = f";font-size:{size}px" if size else ""
    return el("chip abs", txt, tin, tout, f"{style};--c:{c}{fs}", a)
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
    import math
    ang = math.atan2(y2 - y1, x2 - x1); L = 26
    p1 = (x2 - L * math.cos(ang - .5), y2 - L * math.sin(ang - .5)); p2 = (x2 - L * math.cos(ang + .5), y2 - L * math.sin(ang + .5))
    return (line(x1, y1, x2, y2, t0, t1, w, col) +
            f'<path d="M{p1[0]:.1f},{p1[1]:.1f} L{x2},{y2} L{p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" data-draw="{t1 - .15:.2f},{t1 + .2:.2f}"/>')
def img(src, style, tin, tout, a="card", extra=""):
    return f'<img class="abs" src="{src}" style="{style}" {A(tin, tout, a, extra)}>'
def photo(src, x, y, w, h, tin, tout, pos="center", a="card", radius=24, extra=""):
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{radius}px;overflow:hidden;'
            f'box-shadow:0 36px 70px -34px rgba(60,40,20,.55);background:#ddd" {A(tin, tout, a, extra)}>'
            f'<img src="{src}" style="width:100%;height:100%;object-fit:cover;object-position:{pos}"></div>')

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

# 장면 경계 — 자막 시작 시각, 0.25초 겹침
def si(prefix):
    for i, sb in enumerate(SUBS):
        if sb["text"].replace("**", "").replace("\n", " ").startswith(prefix): return i
    raise SystemExit(f"자막에 없음: {prefix}")
starts = ["담당자님께서", "약 3분", "먼저 저희 회사를", "현재 국내에서는", "중국을 포함한", "회사가 빠르게", "어떤 제품이 지금", "지금까지는 이런",
          "그래서 저희는", "여기 보이는 화면은", "예를 들어", "하지만 여기에", "현재 시연 조건", "최근 판매량이", "즉, 단순히", "고객의 반응도",
          "저희는 이런", "그리고 시스템이", "그 이후 실제", "현재 단계에서는", "앞으로 실제 상품과", "저희가 이번 AX", "이미 일어난 일을", "향후 가연인터내셔널", "바쁘신 가운데"]
B = [0.0] + [S[si(p)] for p in starts] + [DUR]
X = 0.25
def T(i): return B[i], (B[i + 1] + X if i + 1 < len(B) - 1 else DUR)
I = lambda p: S[si(p)]

import struct
def png_css(name):   # @2x 캡처의 CSS 크기
    with open(f"cap/{name}.png", "rb") as f: f.read(16); w, h = struct.unpack(">II", f.read(8))
    return w / 2, h / 2
M = json.load(open("cap/meta.json"))
def dm(state, key):
    r = M[f"pc_demo_{state}"][key]; return (r[0], r[1] + 30, r[2], r[3])
CI = "../company/img/"
JAR, LINEUP, MAP = CI + "p01_04_851x779.png", CI + "p41_01_1694x984.png", CI + "p10_01_1005x564.png"
STORE_W, STORE_A, STORE_B = CI + "p12_30_2844x1280.png", CI + "p11_31_577x433.png", CI + "p11_32_411x434.png"
EXPO_A, EXPO_B = CI + "p36_13_411x328.png", CI + "p36_08_599x400.png"

# ───────── 1. 인트로 — 회사명 + 신청 맥락 (Deep Navy) ─────────
a, b = T(0)
scene(a, b, "\n".join([
    f'<div class="deco abs" style="left:{pv(430, 1060)}px;top:{pv(250, 120)}px;width:{pv(620, 720)}px;height:{pv(620, 720)}px;border-radius:50%;background:radial-gradient(circle, rgba(210,164,95,.28), transparent 65%)" {A(a, b, "fade")}></div>',
    img(JAR, f"left:{pv(470, 1120)}px;top:{pv(300, 170)}px;width:{pv(540, 620)}px", a + .2, b, "scale"),
    eyebrow("K-BEAUTY · GROWTH AX", a + .1, b, pv(880, 250)),
    el("h3 abs dim", "주식회사", a + .25, b, f"left:{BX}px;top:{pv(940, 310)}px"),
    el("h1 abs", "가연인터내셔널", a + .35, b, f"left:{BX}px;top:{pv(1010, 380)}px;font-size:{pv(118, 124)}px"),
    chip("중진공 **AX Sprint II** 신청", I("이 영상은"), b, f"left:{BX}px;top:{pv(1170, 560)}px", a="up"),
]))

# ───────── 2. 이 영상의 목적 — 두 가지 질문 + 보조자료 ─────────
a, b = T(1)
scene(a, b, "\n".join([
    el("abs", "?", a, b, f"left:{pv(640, 1380)}px;top:{pv(150, 40)}px;font-size:{pv(560, 640)}px;font-weight:800;color:rgba(210,164,95,.10);line-height:1", "fade"),
    eyebrow("이 영상의 목적", a + .1, b, pv(300, 160)),
    numtag(1, "왜 **AX**를 도입하려는지", I("담당자님께서"), b, f"left:{BX}px;top:{pv(390, 240)}px;width:{pv(888, 980)}px", dim=I("그리고 실제로")),
    numtag(2, "실제로 **어떤 시스템**을 만드는지", I("그리고 실제로"), b, f"left:{BX}px;top:{pv(540, 380)}px;width:{pv(888, 980)}px", dim=I("만든 보조자료")),
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

# ───────── 4. 회사 소개 — 제품 (Warm Ivory · 회사소개서 사진) ─────────
a, b = T(3)
scene(a, b, "\n".join([
    eyebrow("COMPANY · 회사 소개", a + .1, b, pv(270, 150)),
    el("h2 abs", "**K-뷰티 화장품**을\n기획하고 유통합니다", I("가연인터내셔널은") - .2, b, f"left:{BX}px;top:{pv(320, 210)}px"),
    img(LINEUP, f"left:{pv(20, 760)}px;top:{pv(540, 110)}px;width:{pv(1040, 1100)}px", a + .3, b, "card"),
    chip("국내 유통", I("국내외 여러"), b, f"left:{BX}px;top:{pv(1160, 470)}px"),
    chip("해외 유통", I("국내외 여러") + .35, b, f"left:{pv(BX + 330, BX)}px;top:{pv(1160, 590)}px", c=SEC),
    note(a + .5, b, PHOTO),
]), "L")

# ───────── 5. 국내 — 백화점·온라인 ─────────
a, b = T(4)
kd = K("백화점")
scene(a, b, "\n".join([
    eyebrow("국내 판매", a + .1, b, pv(260, 120)),
    photo(STORE_W, BX, pv(310, 170), pv(888, 1000), pv(460, 470), a + .15, b),
    photo(STORE_A, pv(BX, 1150), pv(790, 170), pv(430, 650), pv(330, 225), a + .45, b),
    photo(STORE_B, pv(BX + 458, 1150), pv(790, 415), pv(430, 650), pv(330, 225), a + .7, b),
    chip("주요 **백화점**", kd, b, f"left:{BX}px;top:{pv(1150, 680)}px"),
    chip("온라인", K("온라인 등"), b, f"left:{pv(BX + 400, BX + 400)}px;top:{pv(1150, 680)}px", c=SEC),
    note(a + .5, b, PHOTO),
]), "L")

# ───────── 6. 해외 — 중국 포함 수출·온라인·라이브 ─────────
a, b = T(5)
scene(a, b, "\n".join([
    eyebrow("해외 판매 · 중국 포함", a + .1, b, pv(260, 120)),
    img(MAP, f"left:{pv(30, 60)}px;top:{pv(300, 150)}px;width:{pv(1020, 1040)}px", a + .15, b, "fade"),
    photo(EXPO_A, pv(BX, 1150), pv(880, 170), pv(430, 650), pv(250, 225), a + .6, b),
    photo(EXPO_B, pv(BX + 458, 1150), pv(880, 415), pv(430, 650), pv(250, 225), a + .85, b),
    chip("**수출**", K("수출과"), b, f"left:{BX}px;top:{pv(1160, 690)}px", size=48),
    chip("온라인 판매", K("온라인 판매"), b, f"left:{pv(BX + 220, BX + 230)}px;top:{pv(1160, 690)}px", c=SEC, size=48),
    chip("라이브 판매", K("라이브 판매"), b, f"left:{pv(BX + 560, BX + 590)}px;top:{pv(1160, 690)}px", c=SEC, size=48),
    note(a + .5, b, PHOTO),
]), "L")

# ───────── 7. 성장 → 새로운 고민 (제품·채널이 늘어남) ─────────
a, b = T(6)
kn = K("새로운 고민")
import random
rnd = random.Random(7)
tiles = []
cols, rows = (6, 7) if v else (11, 5)
cw_, ch_ = (BW / cols, 760 / rows) if v else (BW / cols, 600 / rows)
cells = [(c, r) for c in range(cols) for r in range(rows)]
rnd.shuffle(cells)
t_end = K("많아지면서") + .9
for k, (c, r) in enumerate(cells[:pv(26, 34)]):
    x = BX + c * cw_ + rnd.uniform(6, 26); y = pv(300, 140) + r * ch_ + rnd.uniform(4, 22)
    tin = a + .3 + (t_end - a - .3) * k / pv(26, 34)
    if k % 2 == 0:
        tiles.append(f'<div class="abs" style="left:{x:.0f}px;top:{y:.0f}px;width:86px;height:86px;border-radius:20px;border:4px solid rgba(232,201,149,.75);background:rgba(210,164,95,.10)" {A(tin, b, "scale", f"data-dim={chr(34)}{kn:.2f}{chr(34)}")}></div>')
    else:
        tiles.append(f'<div class="abs" style="left:{x:.0f}px;top:{y:.0f}px;width:80px;height:80px;border-radius:50%;border:4px solid rgba(127,183,178,.8);background:rgba(63,133,133,.12)" {A(tin, b, "scale", f"data-dim={chr(34)}{kn:.2f}{chr(34)}")}></div>')
scene(a, b, "\n".join(tiles + [
    chip("제품 **↑**", a + .6, b, f"left:{BX}px;top:{pv(1110, 760)}px", a="up"),
    chip("판매 채널 **↑**", K("판매 채널과") , b, f"left:{pv(BX + 300, BX + 300)}px;top:{pv(1110, 760)}px", c=SEC),
    el("h0 abs", "새로운\n**고민**", kn, b, f"left:{BX}px;top:{pv(560, 260)}px;font-size:{pv(170, 180)}px;text-shadow:0 10px 40px rgba(0,0,0,.6)", "scale"),
]))

# ───────── 8. 매일의 판단 네 가지 (Muted Slate) ─────────
a, b = T(7)
qs = [("어떤 제품이 지금", "지금 **빠르게** 팔리는 제품은?"), ("현재 재고로", "현재 재고로 **며칠** 버틸까?"),
      ("다음 생산은", "다음 **생산**은 언제 시작?"), ("어느 판매 채널의", "어느 채널에 먼저 **배분**?")]
parts = [eyebrow("매일 해야 하는 판단", a + .1, b, pv(280, 150))]
for k, (ph, txt) in enumerate(qs):
    tin = I(ph); dim = I(qs[k + 1][0]) if k < 3 else None
    st = f"left:{BX}px;top:{340 + k * 165}px;width:888px" if v else f"left:{BX + (k % 2) * 860}px;top:{230 + (k // 2) * 200}px;width:820px"
    parts.append(numtag(k + 1, txt, tin, b, st, dim=dim, c=SEC if k % 2 else GOLD))
parts.append(f'<div class="abs" style="left:{BX}px;top:{pv(1040, 660)}px;width:{pv(888, 1680)}px;height:3px;background:rgba(255,255,255,.12)" {A(a + .4, b, "fade")}></div>')
scene(a, b, "\n".join(parts), "S")

# ───────── 9. 여러 자료 + 담당자의 경험 (사물·사람) ─────────
a, b = T(8)
ke = K("담당자의 경험")
cx, cy = pv(540, 960), pv(780, 470)
docs = [(-380, -230, -12, "판매 자료"), (230, -320, 9, "재고 표"), (-420, 60, 7, "생산 일정"), (260, 40, -8, "채널별 엑셀"),
        (-340, 420, -5, ""), (350, 430, 12, ""), (380, -140, 3, ""), (-560, -120, -15, "")] if v else \
       [(-640, -230, -12, "판매 자료"), (420, -250, 9, "재고 표"), (-700, 110, 7, "생산 일정"), (460, 90, -8, "채널별 엑셀"),
        (-380, 200, -5, ""), (700, -60, 12, ""), (-60, -330, 3, ""), (180, 210, -15, "")]
parts = [el("h2 abs", "여러 자료 확인 +\n**담당자의 경험**", a + .2, b, f"left:{BX}px;top:{pv(250, 120)}px;font-size:{pv(64, 60)}px")]
for k, (dx, dy, rot, lab) in enumerate(docs):
    tin = a + .3 + k * .28
    parts.append(f'<div class="doc" style="left:{cx + dx - 75}px;top:{cy + dy - 98}px" {A(tin, b, "card", f"data-t={chr(34)}rotate({rot}deg){chr(34)} data-dim={chr(34)}{ke:.2f}{chr(34)}")}></div>')
    if lab:
        parts.append(el("tag abs", lab, tin + .2, b, f"left:{cx + dx - 75}px;top:{cy + dy + 108}px;font-size:28px;color:var(--ink2);width:180px", "fade", f'data-dim="{ke:.2f}"'))
# 담당자 (중립적 실루엣)
parts.append(svg(f'<circle cx="{cx}" cy="{cy - 70}" r="74" fill="#2b3440" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'
                 f'<path d="M{cx - 150},{cy + 150} C{cx - 150},{cy + 30} {cx - 80},{cy + 10} {cx},{cy + 10} C{cx + 80},{cy + 10} {cx + 150},{cy + 30} {cx + 150},{cy + 150} Z" fill="#2b3440" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'
                 f'<circle cx="{cx}" cy="{cy + 10}" r="230" fill="none" stroke="var(--gold)" stroke-width="6" stroke-dasharray="12 14" opacity=".9" data-draw="{ke:.2f},{ke + 1.0:.2f}"/>', a + .2, b))
parts.append(chip("**경험**에 의존한 판단", ke + .3, b, f"left:{cx - pv(260, 260)}px;top:{cy + pv(250, 240)}px"))
scene(a, b, "\n".join(parts))

# ───────── 10. 한 곳에 연결 → 앞으로 필요한 행동 → AX 시스템 (흩어짐 → 수렴) ─────────
a, b = T(9)
k1, k2, k3, k4 = K("한 단계 더"), K("판매, 재고"), K("한 곳에 연결"), K("앞으로 필요한")
k5 = K("AX 시스템을")
hx, hy = pv(540, 760), pv(760, 480)
nodes = [("판매", -300, -230, -40, -70), ("재고", 300, -230, 40, -60), ("생산", -300, 200, -50, 160), ("고객", 300, 200, 20, 100)] if v else \
        [("판매", -420, -190, -120, -130), ("재고", 420, -190, 150, -130), ("생산", -420, 190, -140, 90), ("고객", 420, 190, 170, 90)]
parts = [el("h2 abs dim", "기존의 관리 방식", a + .2, k5, f"left:{BX}px;top:{pv(270, 110)}px;display:inline-block",
            extra="", raw=False).replace('</div>', f'<span class="strike" data-strike="{k1:.2f}"></span></div>', 1)]
lines = []
for k, (lab, fx, fy, sx, sy) in enumerate(nodes):
    tin = k2 + k * .35
    nx, ny = hx + fx, hy + fy
    parts.append(el("node abs", lab, tin, b, f"left:{nx - 130}px;top:{ny - 55}px;width:260px;--c:{GOLD if k % 2 == 0 else SEC}", "scale",
                    f'data-move="{k3 - .2:.2f},{k3 + .9:.2f},{sx:.0f},{sy:.0f},.9,0,0,1"'))
    lines.append(line(hx + fx * .62, hy + fy * .62, hx + fx * .28, hy + fy * .28, k3 + .7, k3 + 1.4, 5))
parts.append(svg("".join(lines), k3 + .6, b))
parts.append(f'<div class="hub abs" style="left:{hx - 105}px;top:{hy - 105}px;width:210px;height:210px;font-size:46px" {A(k3 + .3, b, "scale")}>한 곳에<br>연결</div>')
if v:
    parts.append(svg(arrow(hx, hy + 115, hx, 1080, k4, k4 + .8, 7), k4, b))
    parts.append(el("node abs hi", "앞으로 필요한 **행동**까지", k4 + .5, b, f"left:{BX + 64}px;top:1092px;width:760px", "scale"))
else:
    parts.append(svg(arrow(hx + 115, hy, 1330, hy, k4, k4 + .8, 7), k4, b))
    parts.append(el("node abs hi", "앞으로 필요한\n**행동**까지", k4 + .5, b, f"left:1350px;top:{hy - 90}px;width:440px", "scale"))
parts.append(el("h1 abs", "MIRYEO **AX 시스템**", k5, b, f"left:{BX}px;top:{pv(250, 96)}px;font-size:{pv(88, 80)}px", "up"))
scene(a, b, "\n".join(parts))

# ───────── 11. 실제 화면 — 개발·실증 중인 시험 버전 (PRODUCT PUSH · PC+모바일) ─────────
a, b = T(10)
ks, kd2 = I("시험 버전"), I("이해를 돕기")
bw, bh = pv(888, 1000), pv(560, 620)
bx_, by_ = BX, pv(300, 190)
parts = [*([eyebrow("PILOT · 실제 개발 화면", a + .1, b, 240)] if v else []),
         browser(bx_, by_, bw, bh, [("pc_ax", a, b, [(a + .8, b - .3, (0, 0, 1440), (0, 120, 1300))])], a + .1, b, a="push"),
         phone(pv(612, 1300), pv(590, 110), pv(330, 330), [("mob_ax", a, b, [(a + 1.2, b - .3, 0, 520)])], a + .5, b, a="push")]
parts.append(f'<div class="status abs" style="left:{BX}px;top:{pv(900, 860 - 70)}px;--c:#e8c995" {A(ks, b, "up")}><i></i>개발·실증 중인 <span class="acc">시험 버전</span></div>' if v else
             f'<div class="status abs" style="left:{BX}px;top:100px;--c:#e8c995;font-size:40px;padding:10px 26px" {A(ks, b, "up")}><i></i>개발·실증 중인 <span class="acc">시험 버전</span></div>')
parts.append(chip("숫자는 **시연용 자료**", kd2, b, f"left:{BX}px;top:{pv(1020, 100)}px" + ("" if v else ";left:700px;font-size:40px;padding:10px 26px"), c="#d87373"))
parts.append(note(a + .5, b))
scene(a, b, "\n".join(parts), "L")

# ───────── 12. 재고만 보면 약 95일 (BIG NUMBER) ─────────
a, b = T(11)
k95 = K("95일")
scene(a, b, "\n".join([
    chip("샘플 앰플 C · 시연용", a + .1, b, f"left:{BX}px;top:{pv(280, 140)}px", size=40),
    el("h3 abs", "현재 재고만 보면", a + .3, b, f"left:{BX}px;top:{pv(400, 250)}px"),
    el("h2 abs dim", "약", k95 - .2, b, f"left:{BX}px;top:{pv(560, 400)}px"),
    f'<div class="big abs" style="left:{BX + pv(90, 100)}px;top:{pv(470, 320)}px;font-size:{pv(260, 260)}px;color:var(--hi)" {A(k95 - .2, b, "scale")}><span data-count="{k95 - .1:.2f},{k95 + 1.1:.2f},0,95,0,일">95일</span></div>',
    box(f"left:{BX}px;top:{pv(800, 640)}px;width:{pv(888, 1100)}px;height:40px", a + .4, b,
        f'<div class="track" style="height:40px;border-radius:14px"><div class="fill" style="border-radius:14px;--c:linear-gradient(90deg,#c9a45f,#e3c48a)" data-grow="{k95:.2f},{k95 + 1.3:.2f},{pv(888, 1100)}"></div></div>', a="fade"),
    el("tag abs", "재고로 판매할 수 있는 기간", a + .5, b, f"left:{BX}px;top:{pv(860, 700)}px;font-size:30px"),
    f'<div class="status abs" style="left:{BX}px;top:{pv(940, 760)}px;--c:#3f9b6e" {A(K("재고가 충분해"), b, "up")}><i></i>재고 <span class="acc">충분해 보임</span></div>',
    *( [] if v else [img(JAR, "left:1330px;top:170px;width:470px", a + .3, b, "scale")] ),
    note(a + .5, b, "시연용 샘플 제품 기준 · 실제 회사 실적이 아닙니다"),
]), "L")

# ───────── 13. 판매 속도 + 생산 기간 + 안전 재고 → 결과가 달라진다 (막대 변화) ─────────
a, b = T(12)
kv, kp, ks2, kr = K("판매 속도"), K("생산에 걸리는"), K("안전하게 확보"), K("결과가 달라")
TW = pv(888, 1080)      # 막대 전체 폭
full, short = round(TW * .97), round(TW * .62)
prod, safe = round(TW * .34), round(TW * .16)
start = short - prod - safe
y0 = pv(430, 222)
g = pv(1.0, 0.82)
parts = [svg(f'<line x1="{BX + start}" y1="{y0 + round(50 * g)}" x2="{BX + start}" y2="{y0 + round(560 * g)}" stroke="#b42318" stroke-width="5" stroke-dasharray="14 10"/>'
             f'<line x1="{BX}" y1="{y0 + round(50 * g)}" x2="{BX}" y2="{y0 + round(560 * g)}" stroke="#171b20" stroke-width="5"/>', kr, b),
         el("h3 abs", "재고만 보면 **95일**", a + .2, b, f"left:{BX}px;top:{pv(270, 112)}px;display:inline-block").replace('</div>', f'<span class="strike" data-strike="{kr:.2f}"></span></div>', 1),
         el("h3 abs", "재고로 버티는 기간", a + .3, b, f"left:{BX}px;top:{y0}px;font-size:46px"),
         f'<div class="abs" style="left:{BX}px;top:{y0 + round(70 * g)}px;height:46px;border-radius:12px;background:linear-gradient(90deg,#c9a45f,#e3c48a)" data-w="{a + .4:.2f},{a + 1.3:.2f},0,{full};{kv + .2:.2f},{kv + 1.4:.2f},{full},{short}" {A(a + .3, b, "fade")}></div>',
         chip("최근 **판매 속도** ↑", kv, b, f"left:{BX}px;top:{y0 + round(140 * g)}px", size=46),
         el("h3 abs", "생산에 걸리는 기간", kp, b, f"left:{BX}px;top:{y0 + round(250 * g)}px;font-size:46px"),
         f'<div class="abs" style="left:{BX + start}px;top:{y0 + round(320 * g)}px;height:46px;border-radius:12px;background:var(--sec)" data-w="{kp + .2:.2f},{kp + 1.0:.2f},0,{prod}" {A(kp, b, "fade")}></div>',
         el("h3 abs", "안전 재고 기간", ks2, b, f"left:{BX}px;top:{y0 + round(410 * g)}px;font-size:46px"),
         f'<div class="abs" style="left:{BX + start + prod}px;top:{y0 + round(480 * g)}px;height:46px;border-radius:12px;background:#9cc7c2" data-w="{ks2 + .3:.2f},{ks2 + 1.0:.2f},0,{safe}" {A(ks2 + .1, b, "fade")}></div>',
         el("tag abs", "오늘", kr, b, f"left:{BX}px;top:{y0 + round(570 * g)}px;font-size:30px;color:#171b20"),
         chip("**생산 시작** 마감이 가까움", kr + .3, b, f"left:{BX + start - 10}px;top:{y0 + round(620 * g)}px;border-color:rgba(180,35,24,.4)", c="#b42318", size=46)]
if not v:
    parts.append(el("h2 abs", "함께 계산하면\n결과가 **달라집니다**", kr - .1, b, "left:1300px;top:300px;width:520px"))
parts.append(note(a + .5, b, "시연용 샘플 제품 기준 · 실제 회사 실적이 아닙니다", left=pv(None, 1300), width=pv(None, 500)))
scene(a, b, "\n".join(parts), "L")

# ───────── 14. 실제 화면 — 약 4일 안에 생산 검토 · 생산 수량 (PRODUCT) ─────────
a, b = T(13)
k4d, kq = K("4일 안에"), K("생산 수량")
bw, bh = pv(888, 1020), pv(800, 690)
bx_, by_ = BX, pv(470, 110)
c0 = (550, 330, 750); c1 = (550, pv(640, 700), 750)
dec, odr = dm("base", "decision"), (585, 978, 690, 52)
f1 = ui_rect(bx_, by_, bw, c1, (dec[0] - 6, dec[1] - 6, dec[2] + 12, dec[3] + 12))
f2 = ui_rect(bx_, by_, bw, c1, odr)
parts = [browser(bx_, by_, bw, bh, [("pc_demo_base", a, b, [(a + .6, k4d - .2, c0, c1)])], a, b, "MIRYEO · AX SPRINT II 심사 페이지 (시연)"),
         focus(*f1, k4d + .1, kq - .1, a, b), focus(*f2, kq, b, a, b)]
if v:
    parts += [el("h2 abs", "약 **4일 안에**\n다음 생산 검토", k4d - .3, b, f"left:{BX}px;top:250px")]
else:
    parts += [el("h2 abs", "약 **4일 안에**\n다음 생산 검토", k4d - .3, b, "left:1210px;top:180px;width:600px"),
              chip("필요한 **생산 수량**도", kq, b, "left:1210px;top:440px")]
parts.append(note(a + .5, b))
scene(a, b, "\n".join(parts), "L")

# ───────── 15. 상황이 바뀌면 결과도 바뀐다 (실제 화면 상태 변화) ─────────
a, b = T(14)
kf, kpull, kin, kno = K("더 빠르게 증가"), K("당겨지고"), K("반대로 추가 입고"), K("불필요한 생산")
bw, bh = pv(888, 1020), pv(760, 690)
bx_, by_ = BX, pv(500, 110)
cc = (550, pv(650, 700), 750)
shots = [("pc_demo_base", a, kf + .3, [(a, b, cc, cc)]), ("pc_demo_faster", kf, kin + .3, [(a, b, cc, cc)]), ("pc_demo_incoming", kin, b, [(a, b, cc, cc)])]
d_f = ui_rect(bx_, by_, bw, cc, (dm("faster", "decision")[0] - 6, dm("faster", "decision")[1] - 6, 727, 120))
d_i = ui_rect(bx_, by_, bw, cc, (dm("incoming", "decision")[0] - 6, dm("incoming", "decision")[1] - 6, 727, 190))
cx0 = pv(BX, 1210)
parts = [browser(bx_, by_, bw, bh, shots, a, b, "MIRYEO · AX SPRINT II 심사 페이지 (시연)"),
         focus(*d_f, kpull, kin, a, b), focus(*d_i, kno, b, a, b),
         chip("판매가 더 빨라지면", kf, b, f"left:{cx0}px;top:{pv(240, 150)}px", c="#b42318", size=pv(46, 48)),
         el("h3 abs", "생산 시점 **앞당김**", kpull, b, f"left:{cx0}px;top:{pv(330, 250)}px", "left", f'data-dim="{kin:.2f}"'),
         chip("추가 입고가 예정되면", kin, b, f"left:{pv(BX + 470, 1210)}px;top:{pv(240, 400)}px", c=SEC, size=pv(46, 48)),
         el("h3 abs", "**불필요한 생산** 방지", kno, b, f"left:{pv(BX + 470, 1210)}px;top:{pv(330, 500)}px", "left"),
         note(a + .5, b)]
scene(a, b, "\n".join(parts), "L")

# ───────── 16. 핵심 — 미리 판단 (BIG MOMENT) ─────────
a, b = T(15)
kn1, kpast, kq1, kq2, kbig = K("보여주는 것이 아니라"), K("현재와 과거"), K("앞으로 재고가"), K("언제 생산을"), K("미리 판단하는 것이")
ty = pv(560, 380); x0, x1, x2 = (BX + 60, BX + 400, BX + 820) if v else (BX + 60, BX + 470, BX + 960)
parts = [el("h2 abs dim", "현재 재고가 몇 개인가?", a + .2, b, f"left:{BX}px;top:{pv(280, 130)}px;display:inline-block", extra=f'data-dim="{kbig:.2f}"').replace('</div>', f'<span class="strike" data-strike="{kn1:.2f}"></span></div>', 1),
         svg(line(x0, ty, x1, ty, kpast, kpast + .6, 6, "rgba(244,241,236,.6)") + line(x1, ty, x2, ty, kpast + .5, kpast + 1.1, 6, "var(--gold)", "") +
             f'<circle cx="{x0}" cy="{ty}" r="16" fill="rgba(244,241,236,.6)"/><circle cx="{x1}" cy="{ty}" r="20" fill="#f4f1ec"/><circle cx="{x2}" cy="{ty}" r="24" fill="var(--gold)"/>', kpast, b),
         el("tag abs", "과거", kpast, b, f"left:{x0 - 30}px;top:{ty + 34}px;font-size:34px", extra=f'data-dim="{kbig:.2f}"'),
         el("tag abs", "현재", kpast + .2, b, f"left:{x1 - 30}px;top:{ty + 34}px;font-size:34px;color:#f4f1ec", extra=f'data-dim="{kbig:.2f}"'),
         el("tag abs", "앞으로", kpast + .4, b, f"left:{x2 - 50}px;top:{ty + 34}px;font-size:34px;color:var(--gold-soft)", extra=f'data-dim="{kbig:.2f}"'),
         numtag("?", "언제 재고가 **부족**해질지", kq1, b, f"left:{BX}px;top:{pv(700, 520)}px;width:{pv(888, 800)}px", dim=kbig),
         numtag("?", "언제 **생산**을 시작할지", kq2, b, f"left:{pv(BX, 960)}px;top:{pv(840, 520)}px;width:{pv(888, 820)}px", dim=kbig, c=SEC),
         el("h0 abs", "**미리 판단**", kbig, b, f"left:{BX}px;top:{pv(990, 636)}px;font-size:{pv(170, 150)}px;text-shadow:0 10px 40px rgba(0,0,0,.6)", "scale")]
scene(a, b, "\n".join(parts))

# ───────── 17. 고객 여정 — 구매 전 관심신호 (모바일 실제 화면) ─────────
a, b = T(16)
kc1, kc2, kc3, kc4, kc5 = K("고객이 제품을"), K("자신의 고민"), K("관심 있는 제품을"), K("구매처를 확인"), K("관심신호가")
pw = pv(400, 330); px_, py_ = pv(BX, 800), pv(440, 96)
ph_ = round(pw * 19.6 / 9)
_, hres = png_css("mob_finder_result"); _, hpass = png_css("mob_passport"); _, hprod = png_css("mob_product")
shots = [("mob_product", a, kc2 + .3, [(a + .6, kc2, 0, 330)]),
         ("mob_finder1", kc2, kc2 + 1.9, [(kc2, kc2 + 1, 0, 0)]),
         ("mob_finder_result", kc2 + 1.6, kc3 + .3, [(kc2 + 1.9, kc3, 0, 760)]),
         ("mob_passport", kc3, b, [(kc3 + .4, kc5, 0, 520)])]
cx0 = pv(BX + 440, 1200)
steps = [(kc1, "제품 **탐색**"), (kc2, "고민 맞춤 **추천**"), (kc3, "관심 제품 **저장**"), (kc4, "**구매처** 확인")]
parts = [el("h2 abs", "고객의 **반응**도\n함께 활용합니다", a + .1, b, f"left:{BX}px;top:{pv(240, 140)}px;font-size:{pv(64, 60)}px"),
         phone(px_, py_, pw, shots, a + .2, b, a="push")]
for k, (tin, txt) in enumerate(steps):
    y = pv(500 + k * 130, 200 + k * 120)
    parts.append(chip(txt, tin, b, f"left:{cx0}px;top:{y}px", c=SEC, size=pv(44, 48)))
    parts.append(f'<div class="orbit abs" style="left:{px_ + pw - 20}px;top:{y + 30}px" {A(tin, tin + 1.2, "fade")} data-move="{tin:.2f},{tin + .9:.2f},0,0,.6,{cx0 - px_ - pw:.0f},0,1"></div>')
parts.append(chip("= **관심신호**", kc5, b, f"left:{cx0}px;top:{pv(1040, 690)}px;border-color:rgba(232,201,149,.6)", size=pv(52, 52)))
parts.append(el("tag abs", "실제 구매 전부터 생기는 신호", kc5 + .3, b, f"left:{cx0}px;top:{pv(1140, 782)}px;font-size:28px"))
parts.append(note(a + .5, b, NOTE, left=pv(500, BX), width=pv(460, None), top=pv(1200, None)))
scene(a, b, "\n".join(parts), "L")

# ───────── 18. 관심 변화 + 판매량 + 재고 → 수요 판단 (모바일 → PC, 같은 시스템) ─────────
a, b = T(17)
km1, km2, km3 = K("이런 고객의 관심"), K("판매량과 재고 정보"), K("어떤 제품의 수요가")
if v:
    bx_, by_, bw, bh = BX, 250, 888, 520
    pw, px_, py_ = 250, BX, 790
else:
    bx_, by_, bw, bh = 560, 110, 1240, 560
    pw, px_, py_ = 320, 140, 110
crop = (300, 985, 1120)
rowr = ui_rect(bx_, by_, bw, crop, (338, 1176, 1052, 50))
parts = [browser(bx_, by_, bw, bh, [("pc_customers", a, b, [(a + .5, b - .3, crop, crop)])], a + .1, b, "MIRYEO · BUSINESS AX — 고객 인사이트"),
         phone(px_, py_, pw, [("mob_finder_result", a, b, [(a + .5, b, 760, 900)])], a + .3, b)]
for k in range(4):
    t0 = a + .8 + k * .9
    parts.append(f'<div class="orbit abs" style="left:{px_ + pw - 10}px;top:{py_ + 60}px" {A(t0, t0 + 1.0, "fade")} data-move="{t0:.2f},{t0 + .9:.2f},0,0,.7,{(bx_ + 40) - (px_ + pw - 10):.0f},{(by_ + bh // 2) - (py_ + 60):.0f},1"></div>')
cy0 = pv(800, 700); cx0 = pv(BX + 290, 560)
parts += [chip("고객 **관심 변화**", km1, b, f"left:{cx0}px;top:{cy0}px", size=pv(44, 44)),
          chip("+ 판매량 · 재고", km2, b, f"left:{pv(cx0, cx0 + 470)}px;top:{pv(cy0 + 115, cy0)}px", c=SEC, size=pv(44, 44)),
          chip("→ 수요가 **커질 제품**", km3, b, f"left:{pv(cx0, cx0 + 920)}px;top:{pv(cy0 + 230, cy0)}px", size=pv(44, 44)),
          focus(*rowr, km3 + .2, b, a, b),
          note(a + .5, b)]
scene(a, b, "\n".join(parts), "S")

# ───────── 19. 판단에서 끝나지 않는다 — 담당자 확인·실행 (실제 처리 창) ─────────
a, b = T(18)
kt1, kt2 = K("생산이나 재고와"), K("담당자가")
if v:
    bx_, by_, bw, bh = BX, 400, 888, 760
else:
    bx_, by_, bw, bh = BX, 210, 920, 600
crop0 = (830, 0, 610); viewc = (bh - 40) * 610 / bw
crop1 = (830, max(0, 900 - viewc), 610)
fs = ui_rect(bx_, by_, bw, crop0, (858, 150, 566, 62))
fb = ui_rect(bx_, by_, bw, crop1, (858, 826, 566, 62))
parts = [el("h2 abs", "판단에서 **끝나지 않습니다**", a + .1, b, f"left:{BX}px;top:{pv(250, 110)}px"),
         browser(bx_, by_, bw, bh, [("pc_drawer", a, b, [(kt2 + .2, kt2 + 1.6, crop0, crop1)])], a + .3, b, "MIRYEO · BUSINESS AX — Action 처리"),
         focus(*fs, kt1 + .2, kt2 + .2, a, b), focus(*fb, kt2 + 1.7, b, a, b)]
if v:
    parts.append(chip("자동 실행 ✕ · **담당자** 확인 후 실행", kt2, b, "left:72px;top:1180px", size=44))
else:
    parts += [chip("다음에 확인할 일 **알림**", kt1, b, "left:1100px;top:300px", size=48),
              chip("**담당자** 확인 · 실행", kt2, b, "left:1100px;top:420px", c=SEC, size=48),
              el("tag abs", "자동 실행이 아닌 사람 승인 방식", kt2 + .4, b, "left:1100px;top:540px;font-size:30px")]
parts.append(note(a + .5, b))
scene(a, b, "\n".join(parts))

# ───────── 20. 결과 기록 → 다음 판단 (순환) ─────────
a, b = T(19)
kr1, kr2, kr3 = K("다시 기록"), K("그 결과를 다음"), K("계속 발전")
cx, cy = pv(540, 960), pv(770, 470)
rx, ry = pv(290, 430), pv(300, 250)
nd = [(0, -ry, "다음 할 일\n**알림**", a + .3, GOLD), (rx, 0, "담당자\n확인·실행", a + .6, SEC), (0, ry, "결과\n**기록**", kr1, GOLD), (-rx, 0, "다음 판단에\n활용", kr2, SEC)]
parts = [eyebrow("CLOSED LOOP · 사람이 승인하는 구조", a + .1, b, pv(270, 110)),
         svg(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="rgba(232,201,149,.35)" stroke-width="4" data-draw="{a + .2:.2f},{a + 1.6:.2f}"/>', a, b),
         f'<div class="orbit abs" {A(kr1, b, "fade")} data-orbit="{kr1:.2f},{cx},{cy},{rx},{ry},4.2"></div>',
         f'<div class="hub abs" style="left:{cx - 95}px;top:{cy - 95}px;width:190px;height:190px;font-size:40px" {A(kr3 - .2, b, "scale")}>계속<br>발전</div>']
for dx, dy, txt, tin, c in nd:
    parts.append(el("node abs", txt, tin, b, f"left:{cx + dx - 140}px;top:{cy + dy - 70}px;width:280px;--c:{c};font-size:{pv(44, 44)}px;line-height:1.2", "scale"))
scene(a, b, "\n".join(parts))

# ───────── 21. 현재 단계 — 설명 가능한 규칙·통계 ─────────
a, b = T(20)
kru, kso, kne, kan = K("규칙과 통계"), K("재고 소진 시점"), K("생산 필요 시점"), K("분석예측하고")
rows = [(kru + .6, "최근 **판매 속도**"), (kru + 1.2, "+ 현재 재고 · 입고 예정"), (kru + 1.8, "+ 생산 기간 · 안전 재고")]
if v:
    cxr, cyr, cwr, chr_ = BX, 600, 888, 560
else:
    cxr, cyr, cwr, chr_ = 940, 130, 860, 640
parts = [f'<div class="status abs" style="left:{BX}px;top:{pv(250, 120)}px;--c:#e3b65c" {A(a + .1, b, "up")}><i></i>현재 단계 · PILOT</div>',
         el("h2 abs", "설명하기 쉬운\n**규칙과 통계** 방식", a + .3, b, f"left:{BX}px;top:{pv(370, 250)}px"),
         box(f"left:{cxr}px;top:{cyr}px;width:{cwr}px;height:{chr_}px", kru + .2, b, "", cls="glass")]
for k, (tin, txt) in enumerate(rows):
    parts.append(el("h3 abs", txt, tin, b, f"left:{cxr + 50}px;top:{cyr + 50 + k * 100}px;font-size:{pv(50, 48)}px", "left"))
parts.append(f'<div class="abs" style="left:{cxr + 50}px;top:{cyr + 360}px;width:{cwr - 100}px;height:3px;background:rgba(23,27,32,.18)" {A(kso - .2, b, "fade")}></div>')
parts.append(el("h3 abs", "= **재고 소진 시점**", kso, b, f"left:{cxr + 50}px;top:{cyr + 390}px;font-size:{pv(50, 48)}px", "left"))
parts.append(el("h3 abs", "= **생산 필요 시점**", kne, b, f"left:{cxr + 50}px;top:{cyr + 470}px;font-size:{pv(50, 48)}px", "left"))
parts.append(chip("분석 · **예측**", kan, b, f"left:{BX}px;top:{pv(1185, 560)}px"))
scene(a, b, "\n".join(parts), "L")

# ───────── 22. 앞으로 — 데이터 축적 후 시계열·머신러닝 (계획은 점선) ─────────
a, b = T(21)
kd1, kd2, kml, kac = K("앞으로 실제 상품과"), K("시간에 따른"), K("머신러닝을"), K("단계적으로 높여")
cards = [(a + .2, "지금", "**규칙·통계** 기반", False), (kd1, "다음", "실제 데이터 **축적**", False), (kd2, "향후 계획", "+ 시계열 · **머신러닝**", True)]
parts = []
for k, (tin, tag, txt, dash) in enumerate(cards):
    if v: st = f"left:{BX}px;top:{250 + k * 200}px;width:888px;height:170px;padding:26px 36px 0 50px"
    else: st = f"left:{BX + k * 570}px;top:130px;width:540px;height:240px;padding:34px 34px 0 50px"
    bd = "border:3px dashed rgba(169,106,39,.6);background:rgba(255,255,255,.55)" if dash else ""
    parts.append(box(f"{st};{bd}", tin, b, f'<div class="stagebar" style="background:{"#d9b77a" if dash else "var(--gold)" if k == 0 else "var(--sec)"};position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px"></div>'
                     f'<div class="tag" style="color:{"#a96a27" if dash else "rgba(23,27,32,.55)"}">STEP {k + 1} · {tag}</div><div class="h3" style="margin-top:10px;font-size:{pv(52, 48)}px">{em(txt)}</div>', cls="glass"))
# 정확도 계단 (계획 = 점선)
bxs = pv(BX + 120, BX + 300); base_y = pv(1240, 790)
for k, hgt in enumerate(pv([120, 210, 300], [90, 160, 230])):
    dash = k > 0
    style = f"left:{bxs + k * pv(230, 420)}px;top:{base_y - hgt}px;width:{pv(180, 300)}px;height:{hgt}px;border-radius:16px 16px 4px 4px;" + \
            ("border:4px dashed #b97935;background:rgba(210,164,95,.16)" if dash else "background:linear-gradient(180deg,#d9b77a,#b97935)")
    parts.append(f'<div class="abs" style="{style}" {A(kac + k * .25, b, "up")}></div>')
parts.append(chip("정확도 **단계적** 향상", kml, b, f"left:{pv(BX, 1300)}px;top:{pv(870, 420)}px" if not v else f"left:{BX}px;top:870px", size=pv(48, 46)))
parts.append(note(a + .5, b, "점선 = 앞으로의 계획 (현재 구현 아님)"))
scene(a, b, "\n".join(parts), "L")

# ───────── 23. 단순한 관리 프로그램이 아닙니다 (BIG) ─────────
a, b = T(22)
kx = K("아닙니다", after=a)
scene(a, b, "\n".join([
    eyebrow("이번 AX로 만들고 싶은 것", a + .1, b, pv(560, 300)),
    el("h3 abs dim", "단순한", a + .3, b, f"left:{BX}px;top:{pv(640, 380)}px"),
    el("h0 abs", "관리 프로그램", a + .5, b, f"left:{BX}px;top:{pv(720, 450)}px;font-size:{pv(120, 150)}px;display:inline-block", "scale").replace('</div>', f'<span class="strike" style="height:10px" data-strike="{kx:.2f}"></span></div>', 1),
]))

# ───────── 24. 과거를 정리하는 회사 → 미리 판단하는 회사 (TRANSFORMATION) ─────────
a, b = T(23)
kfu, kpj, kre = K("현재의 데이터를"), K("미리 판단하는 회사"), K("그것이 가연")
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
         chip("**AX Sprint II** 신청 이유", kre, b, f"left:{pv(BX, 1000)}px;top:{pv(1060, 600)}px")]
scene(a, b, "\n".join(parts))

# ───────── 25. 향후 — K-뷰티 업종 특화 구독형 AX 서비스 (검토) ─────────
a, b = T(24)
kb2, kb3, kb4 = K("충분한 실제 데이터"), K("비슷한 고민을"), K("구독형 AX")
stp = [(a + .2, "STEP 1 · 지금", "가연인터내셔널 내부 **PILOT**", False), (kb2, "STEP 2", "실제 데이터 · 운영 사례 **축적**", False), (kb4, "STEP 3 · 확장 검토", "K-뷰티 중소기업 대상\n**구독형 AX 서비스**", True)]
parts = [eyebrow("NEXT · 확장 방향 (검토 단계)", a + .1, b, pv(250, 100))]
for k, (tin, tag, txt, dash) in enumerate(stp):
    if v: st = f"left:{BX}px;top:{310 + k * 230}px;width:888px;height:{200 if k < 2 else 250}px;padding:28px 36px 0 50px"
    else: st = f"left:{BX + k * 570}px;top:160px;width:540px;height:300px;padding:34px 34px 0 50px"
    bd = "border:3px dashed rgba(169,106,39,.6);background:rgba(255,255,255,.55)" if dash else ""
    parts.append(box(f"{st};{bd}", tin, b, f'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px;background:{"#d9b77a" if dash else "var(--gold)" if k == 0 else "var(--sec)"}"></div>'
                     f'<div class="tag" style="color:{"#a96a27" if dash else "rgba(23,27,32,.55)"}">{tag}</div><div class="h3" style="margin-top:10px;font-size:{pv(50, 46)}px">{em(txt)}</div>', cls="glass", extra=(f'data-dim="{kb4:.2f}"' if k == 0 else "")))
# 비슷한 고민을 가진 다른 K-뷰티 중소기업 (회사 아이콘)
for k in range(5):
    x = pv(BX + 40 + k * 120, 1240 + k * 110); y = pv(1060, 560)
    parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;width:84px;height:96px;border-radius:14px 14px 6px 6px;background:#fff;border:3px solid rgba(23,27,32,.14);box-shadow:0 18px 30px -20px rgba(70,45,20,.4)" {A(kb3 + k * .18, b, "up")}>'
                 f'<div style="margin:16px auto 0;width:44px;height:10px;border-radius:5px;background:rgba(63,133,133,.5);box-shadow:0 20px 0 rgba(63,133,133,.3),0 40px 0 rgba(63,133,133,.2)"></div></div>')
parts.append(el("tag abs", "비슷한 고민을 가진 K-뷰티 중소기업", kb3 + .4, b, f"left:{pv(BX + 40, 1240)}px;top:{pv(1180, 680)}px;font-size:30px;color:rgba(23,27,32,.6)"))
parts.append(note(a + .5, b, "확장은 검토 단계입니다 · 출시·고객 확보 계획이 아닙니다"))
scene(a, b, "\n".join(parts), "L")

# ───────── 26. 마무리 — 감사합니다 (CLOSING) ─────────
a, b = T(25)
kt = K("검토해 주셔서")
cxm = W // 2
scene(a, b, "\n".join([
    f'<div class="abs" style="left:{cxm - 66}px;top:{pv(420, 150)}px;width:132px;height:132px;border-radius:34px;background:linear-gradient(160deg,#e3c48a,#b97935);display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:900;color:#141a22;box-shadow:0 40px 80px -30px rgba(0,0,0,.8)" {A(a + .1, b, "scale")}>M</div>',
    el("h2 abs center", "MIRYEO K-Beauty Growth AX", a + .3, b, f"left:0;right:0;top:{pv(610, 320)}px;text-align:center;font-size:{pv(60, 68)}px"),
    el("h3 abs center dim", "주식회사 가연인터내셔널", a + .5, b, f"left:0;right:0;top:{pv(710, 420)}px;text-align:center"),
    el("h1 abs center", "**감사합니다**", kt + .6, b, f"left:0;right:0;top:{pv(850, 540)}px;text-align:center;font-size:{pv(100, 104)}px", "scale"),
    el("note abs", "AX Sprint II 담당자용 보조자료 · 화면 속 수치는 시연용 예시 데이터입니다", a + .8, b, f"left:0;right:0;top:{pv(1060, 740)}px;text-align:center;font-size:24px"),
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
print(FMT, "장면", len(scenes), "DUR", DUR, "경계", [round(x, 1) for x in B])
