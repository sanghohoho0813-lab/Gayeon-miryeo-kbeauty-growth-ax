#  build.py (KODIT) — 신용보증기금 스타트업지점 제출용 소개 영상: 장면표 → comp/comp_v.html(1080×1920) / comp/comp_h.html(1920×1080)
#  python3 build.py v|h      — AX 스프린트 II 영상(video/ax-sprint2, V7)과 같은 스타일 가이드 v4.1 · 같은 틀(comp.tpl.html) · 같은 렌더러(render.mjs)
#  배경: 바둑판 선(grid) 없음 (사용자 요청 2026-11-02)
#  글자: 사용자 제공 대본 그대로(chunks.txt) · 시각: 사용자 제공 음성의 단어 시각(asr.json → subs.py → chars.json)
#  회사 수치(2025년 매출·영업이익)·특허 출원일은 대본에 있는 그대로만 씀. 화면 속 분석 수치는 시연용(샘플) 표시, 개념도는 '개념도' 표시
import json, html, re, sys, wave, math, struct

FMT = sys.argv[1]
v = FMT == "v"
W, H = (1080, 1920) if v else (1920, 1080)
SUBS = json.load(open("subs.json"))
CH = json.load(open("chars.json"))
S = [s["in"] for s in SUBS]
w_ = wave.open("voice.wav"); VOICE = w_.getnframes() / w_.getframerate()
DUR = round(VOICE + 0.6 + 2.6, 2)
open("out/dur.txt", "w").write(str(DUR))
NOTE_APP = "화면 속 수치는 샘플(시연용) 데이터입니다 · 실제 회사 실적이 아닙니다"
NOTE_CON = "개념도 · 실제 수치가 아닙니다"
PHOTO = "사진: 주식회사 가연인터내셔널 회사소개서"
GOLD, SEC, RED = "var(--gold)", "var(--sec)", "#c2513f"
PATENT_NO = "10-2026-0198281"   # 사용자 제공 (AX 스프린트 II 영상 V7, D-079) · 출원일 2026-10-15 = 대본

if v:
    BX, BW = 72, 888
    NOTE_Y = 1268
else:
    BX, BW = 120, 1680
    NOTE_Y = 790

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

scenes, LIGHT, HIDE = [], [], []
def scene(tin, tout, body, bg="D"):
    cls = {"D": "bgD", "L": "bgL", "S": "bgS"}[bg]
    light = " light" if bg == "L" else ""
    if bg == "L": LIGHT.append([tin, tout])
    scenes.append(f'<div class="scene{light}" {A(tin, tout, "fade")}><div class="{cls}"></div>\n{body}\n</div>')

def eyebrow(t, tin, tout, top, left=None):
    return el("eyebrow abs", t, tin, tout, f"left:{left or BX}px;top:{top}px;right:{W - BX - BW}px", "fade")
def note(tin, tout, text, top=None, left=None, width=None):
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
def photo(src, x, y, w, h, tin, tout, pos="center", a="card", radius=24, extra="", zoom=None, label=None):
    zm = f' data-move="{zoom[0]:.2f},{zoom[1]:.2f},0,0,1,0,0,{zoom[2] if len(zoom) > 2 else 1.08}"' if zoom else ""
    lb = (f'<div style="position:absolute;left:14px;bottom:14px;padding:6px 16px;border-radius:999px;background:rgba(15,18,22,.72);color:#f4f1ec;'
          f'font-size:{pv(24, 22)}px;font-weight:700">{esc(label)}</div>') if label else ""
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{radius}px;overflow:hidden;'
            f'box-shadow:0 36px 70px -34px rgba(60,40,20,.55);background:#ddd" {A(tin, tout, a, extra)}>'
            f'<img src="{src}" style="width:100%;height:100%;object-fit:cover;object-position:{pos}"{zm}>{lb}</div>')
def feather(src, x, y, w, tin, tout, cls="fe", a="scale", extra="", zoom=None):
    zm = f' data-move="{zoom[0]:.2f},{zoom[1]:.2f},0,0,1,0,0,{zoom[2]}"' if zoom else ""
    return f'<div class="abs {cls}" style="left:{x}px;top:{y}px;width:{w}px" {A(tin, tout, a, extra)}><img src="{src}" style="width:100%;display:block"{zm}></div>'

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
def phone(x, y, w, shots, tin, tout, a="card", extra="", overlays=()):
    """overlays = [(캡처 이름, 시작, 끝)] — 화면 아래에 겹치는 고정 요소 (고객 앱 하단 탭)"""
    sw = w - 28; s = sw / 824
    inner = ""
    for n, a0, b0, segs in shots:
        kb = ";".join(f"{t0:.2f},{t1:.2f},{s:.5f},0,{-y0*2*s:.1f},{s:.5f},0,{-y1*2*s:.1f}" for t0, t1, y0, y1 in segs)
        inner += f'<img src="../cap/{n}.png" class="shot" {A(a0, b0, "fade")} data-kb="{kb}">'
    for n, a0, b0 in overlays:
        inner += f'<img src="../cap/{n}.png" style="position:absolute;left:0;bottom:0;width:100%;z-index:3" {A(a0, b0, "fade")}>'
    h = round(w * 19.6 / 9)
    return (f'<div class="phone abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" {A(tin, tout, a, extra)}>'
            f'<div class="screen">{inner}</div><div class="notch"></div></div>')
def patent(tin, tout, size, style="", a="up"):
    return (f'<div class="patent abs" style="font-size:{size}px;{style}" {A(tin, tout, a)}>'
            f'<span class="pl">특허출원</span><span class="pn">{PATENT_NO}</span></div>')
def stagepill(txt, c, tin, tout, style, a="up", extra=""):
    return el("stage abs", txt, tin, tout, f"{style};--c:{c}", a, extra)
def node(txt, small, x, y, w, tin, tout, c=GOLD, hi=False, size=None, extra="", a="card"):
    fs = f";font-size:{size}px" if size else ""
    sm = f"<small>{esc(small)}</small>" if small else ""
    return f'<div class="node abs{" hi" if hi else ""}" style="left:{x}px;top:{y}px;width:{w}px;--c:{c}{fs}" {A(tin, tout, a, extra)}>{em(txt)}{sm}</div>'
def hub(txt, cx, cy, r, tin, tout, size=None, a="scale"):
    return f'<div class="hub abs" style="left:{cx - r}px;top:{cy - r}px;width:{2 * r}px;height:{2 * r}px;font-size:{size or round(r * .36)}px" {A(tin, tout, a)}>{em(txt)}</div>'
def status(txt, tin, tout, style, c="#e3b65c"):
    return f'<div class="status abs" style="{style};--c:{c}" {A(tin, tout, "up")}><i></i>{em(txt)}</div>'
def vcard(label, value, tin, tout, style, vsize, extra=""):
    return box(style, tin, tout, f'<div class="lbl">{em(label)}</div><div class="val" style="font-size:{vsize}px;margin-top:18px">{em(value)}</div>{extra}', cls="glass vcard")

# 장면 경계 — 자막 시작 시각, 0.25초 겹침
def si(prefix):
    for i, sb in enumerate(SUBS):
        if sb["text"].replace("**", "").replace("\n", " ").startswith(prefix): return i
    raise SystemExit(f"자막에 없음: {prefix}")
starts = ["판매·재고·생산정보와", "기존 화장품 사업을", "이를 데이터와", "당사는 2025년", "그러나 사업이", "같은 제품이라도", "여기에 OEM", "저희는 이러한 문제를",
          "핵심은 세 가지", "둘째, 고객용", "셋째, 이 데이터를", "예를 들어", "이렇게 도출된", "실행결과를 다음", "저희는 이러한 기술구조", "현재는 외부",
          "다음 단계에서는", "저희의 목표는", "가연인터내셔널은 기존", "이를 위해 현재", "신용보증기금"]
B = [0.0] + [S[si(p)] for p in starts] + [DUR]
X = 0.25
def T(i): return B[i], (B[i + 1] + X if i + 1 < len(B) - 1 else DUR)
I = lambda p: S[si(p)]
def png_css(name):
    with open(f"cap/{name}.png", "rb") as f: f.read(16); w, h = struct.unpack(">II", f.read(8))
    return w / 2, h / 2

C, PR = "../company/", "../prod/"
JAR, LINEUP, MAP = C + "jar.png", C + "lineup.png", C + "map.png"
STORE_W, ST1, ST2, ST3, ST4 = C + "store_w.png", C + "store_1.png", C + "store_2.png", C + "store_3.png", C + "store_4.png"
EXPO_A, EXPO_B, SHOP = C + "expo_a.png", C + "expo_b.png", C + "shop.png"
AMP = PR + "ampoule-b.webp"
PRODS = [PR + n for n in ["ampoule-b.webp", "cream-i.webp", "essence-a.webp", "toner-e.webp", "cream-c.webp", "ampoule-h.webp", "mist-j.webp", "suncare-f.webp", "cleanser-d.webp", "mask-g.webp"]]

# ───────── 1. 인트로 — 회사명 · 제품기획 + 국내외 유통·수출 (Deep Navy) ─────────
a, b = T(0)
k2 = I("화장품 제품기획과")
scene(a, b, "\n".join([
    f'<div class="abs" style="left:{pv(330, 1000)}px;top:{pv(170, 90)}px;width:{pv(760, 820)}px;height:{pv(760, 820)}px;border-radius:50%;background:radial-gradient(circle, rgba(210,164,95,.26), transparent 65%)" {A(a, b, "fade")}></div>',
    feather(JAR, pv(300, 1030), pv(230, 150), pv(720, 800), a + .2, b, "feR", "scale", zoom=(a, b, 1.06)),
    eyebrow("K-BEAUTY · AX", a + .1, b, pv(850, 250)),
    el("h3 abs dim", "주식회사", a + .25, b, f"left:{BX}px;top:{pv(910, 310)}px"),
    el("h1 abs", "가연인터내셔널", a + .35, b, f"left:{BX}px;top:{pv(980, 380)}px;font-size:{pv(118, 124)}px"),
    chip("화장품 **제품기획**", k2, b, f"left:{BX}px;top:{pv(1130, 560)}px", size=pv(44, 46)),
    chip("국내외 **유통·수출**", K("국내외", after=k2), b, f"left:{pv(BX, 600)}px;top:{pv(1215, 560)}px", c=SEC, size=pv(44, 46)),
    patent(a + .5, k2 + 1.2, pv(48, 44), f"left:{BX}px;top:{pv(150, 690)}px"),
]))

# ───────── 2. 판매·재고·생산 + 고객행동 데이터 → 연결 → AX 기술 ─────────
a, b = T(1)
kp, kc, kl, kx = a, K("고객행동"), K("연결하는"), K("AX 기술을")
if v:
    nodes = [("**판매**", "국내외 채널", 72, 320, kp), ("**재고**", "상품별", 612, 320, kp + .2), ("**생산**", "OEM", 72, 1100, kp + .4), ("**고객행동**", "구매 전 반응", 612, 1100, kc)]
    nw, cx, cy, r = 348, 540, 790, 175
else:
    nodes = [("**판매**", "국내외 채널", 120, 150, kp), ("**재고**", "상품별", 120, 300, kp + .2), ("**생산**", "OEM", 120, 450, kp + .4), ("**고객행동**", "구매 전 반응", 120, 600, kc)]
    nw, cx, cy, r = 400, 1320, 440, 210
parts = [eyebrow("우리가 개발하는 것", a + .1, b, pv(230, 96))]
lines = ""
for k, (t, sm, x, y, tin) in enumerate(nodes):
    parts.append(node(t, sm, x, y, nw, tin, b, c=(SEC if k == 3 else GOLD), size=pv(48, 46)))
    sx, sy = ((x + (nw if x < 300 else 0), y + (140 if y < 500 else 0)) if v else (x + nw, y + 62))
    lines += line(sx, sy, cx, cy, kl + k * .12, kl + .7 + k * .12, 5, "var(--sec-soft)" if k == 3 else "var(--gold)")
parts.append(svg(lines, kl, b))
parts.append(el("tag abs", "연결", kl + .3, b, f"left:{pv(500, 850)}px;top:{pv(520, 215)}px;font-size:34px;color:var(--gold-soft)"))
parts.append(hub("AX<br>기술", cx, cy, r, kx - .2, b, size=pv(78, 84)).replace("AX&lt;br&gt;기술", "AX<br>기술"))
parts.append(status("개발 중", kx + .4, b, f"left:{cx - 110}px;top:{cy + r + pv(30, 40)}px;font-size:40px;padding:12px 30px"))
scene(a, b, "\n".join(parts))

# ───────── 3. 기존 사업 운영 경험 — 국내 매장 · 해외 판매 사진 + 수요 차이 · 재고관리 (Warm Ivory) ─────────
a, b = T(2)
kn = K("국가별")
kj = K("재고관리의")
if v:
    ph = [photo(STORE_W, 72, 230, 888, 444, a + .15, b, zoom=(a, b, 1.06), label="국내 백화점 매장"),
          photo(EXPO_A, 72, 694, 436, 240, a + .35, b, label="해외 박람회"),
          photo(SHOP, 524, 694, 436, 240, a + .5, b, pos="center 20%", label="중국 온라인 매장")]
    tags = [numtag(1, "국가별·판매채널별 **수요 차이**", kn, b, "left:72px;top:972px;width:888px", size=46),
            numtag(2, "**재고관리**의 어려움", kj, b, "left:72px;top:1100px;width:888px", c=SEC, size=46)]
else:
    ph = [photo(STORE_W, 120, 150, 840, 420, a + .15, b, zoom=(a, b, 1.06), label="국내 백화점 매장"),
          photo(EXPO_A, 990, 150, 400, 200, a + .35, b, label="해외 박람회"),
          photo(EXPO_B, 990, 370, 400, 200, a + .45, b),
          photo(SHOP, 1420, 150, 380, 420, a + .6, b, pos="center 15%", label="중국 온라인 매장")]
    tags = [numtag(1, "국가별·판매채널별 **수요 차이**", kn, b, "left:120px;top:610px;width:860px", size=44),
            numtag(2, "**재고관리**의 어려움", kj, b, "left:1010px;top:610px;width:790px", c=SEC, size=44)]
scene(a, b, "\n".join([eyebrow("기존 사업 · 국내외 유통·수출", a + .1, b, pv(170, 100) if not v else 170)] + ph + tags +
                      [note(a + .6, b, PHOTO, top=pv(1240, 735))]), "L")

# ───────── 4. 데이터 + AI 기술 → 해결 시스템 구축 중 ─────────
a, b = T(3)
kd, kai, ks = a, K("AI 기술로"), K("구축하고")
if v:
    n1, n2 = node("**데이터**", "판매·재고·생산·고객", 72, 380, 420, kd + .1, b, c=SEC, size=56), node("**AI 기술**", "분석·판단", 540, 380, 420, kai, b, size=56)
    ar = arrow(282, 560, 470, 760, kai + .2, kai + .8, 6) + arrow(750, 560, 610, 760, kai + .3, kai + .9, 6)
    card = box("left:72px;top:790px;width:888px;height:330px;padding:44px 48px", kai + .6, b,
               f'<div class="tag" style="color:var(--gold-soft)">SOLUTION</div><div class="h2" style="margin-top:14px">문제를 해결하는<br><span class="acc">AX 시스템</span></div>', cls="glass hiedge")
    st = status("구축 중", ks, b, "left:72px;top:1160px;font-size:42px")
else:
    n1, n2 = node("**데이터**", "판매·재고·생산·고객", 120, 200, 460, kd + .1, b, c=SEC, size=58), node("**AI 기술**", "분석·판단", 120, 420, 460, kai, b, size=58)
    ar = arrow(600, 270, 820, 380, kai + .2, kai + .8, 6) + arrow(600, 490, 820, 420, kai + .3, kai + .9, 6)
    card = box("left:860px;top:220px;width:940px;height:360px;padding:52px 56px", kai + .6, b,
               f'<div class="tag" style="color:var(--gold-soft)">SOLUTION</div><div class="h1" style="margin-top:14px;font-size:84px">문제를 해결하는<br><span class="acc">AX 시스템</span></div>', cls="glass hiedge")
    st = status("구축 중", ks, b, "left:860px;top:620px;font-size:42px")
scene(a, b, "\n".join([eyebrow("데이터 · AI로 해결", a + .1, b, pv(260, 110)), n1, n2, svg(ar, kai, b), card, st]))

# ───────── 5. 2025년 실적 — 매출 · 영업이익 (NUMBER) ─────────
a, b = T(4)
k1, k2 = a + .45, K("약 5천")
if v:
    c1 = vcard("**2025년** 매출", "약 4억 7천만 원", k1 - .2, b, "left:72px;top:400px;width:888px;height:300px", 104)
    c2 = vcard("**2025년** 영업이익", "약 5천 5백만 원", k2 - .2, b, "left:72px;top:740px;width:888px;height:300px", 104)
else:
    c1 = vcard("**2025년** 매출", "약 4억 7천만 원", k1 - .2, b, "left:120px;top:250px;width:810px;height:360px;padding:54px 56px", 110)
    c2 = vcard("**2025년** 영업이익", "약 5천 5백만 원", k2 - .2, b, "left:990px;top:250px;width:810px;height:360px;padding:54px 56px", 110)
scene(a, b, "\n".join([eyebrow("2025 · 당사 실적", a + .1, b, pv(300, 140)),
                       el("h2 abs", "주식회사 가연인터내셔널", a + .2, b, f"left:{BX}px;top:{pv(220, 170)}px;font-size:{pv(40, 40)}px;color:var(--ink2);display:none"),
                       c1, c2]), "S")

# ───────── 6. 사업이 확대될수록 — 제품·채널·국가 늘어남 → 새로운 과제 ─────────
a, b = T(5)
kq = K("새로운 과제")
DQ = f'data-dim="{kq:.2f}"'
DQR = DQ + ' data-t="rotate(45deg)"'
import random
random.seed(7)
cols, rows = (6, 5) if v else (11, 4)
tile = pv(118, 108); gx, gy = pv(150, 150), pv(150, 140); ox, oy = pv(72, 120), pv(250, 130)
parts = []
cells = [(c, r) for r in range(rows) for c in range(cols)]
random.shuffle(cells)
for k, (c, r) in enumerate(cells[: pv(24, 34)]):
    x, y = ox + c * gx, oy + r * gy; tin = a + .2 + k * .045
    kind = k % 3
    if kind == 0:
        parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;width:{tile}px;height:{tile}px;border-radius:24px;overflow:hidden;border:2px solid rgba(232,201,149,.45)" {A(tin, b, "scale", DQ)}>'
                     f'<img src="{PRODS[k % len(PRODS)]}" style="width:100%;height:100%;object-fit:cover;object-position:center 40%"></div>')
    elif kind == 1:
        parts.append(f'<div class="abs" style="left:{x + 10}px;top:{y + 10}px;width:{tile - 20}px;height:{tile - 20}px;border-radius:50%;border:5px solid rgba(127,183,178,.75)" {A(tin, b, "scale", DQ)}></div>')
    else:
        parts.append(f'<div class="abs" style="left:{x + 18}px;top:{y + 18}px;width:{tile - 36}px;height:{tile - 36}px;border-radius:14px;transform:rotate(45deg);border:5px solid rgba(232,201,149,.6)" {A(tin, b, "scale", DQR)}></div>')
cy = pv(1060, 700)
parts += [chip("제품 ↑", a + .4, b, f"left:{BX}px;top:{cy}px", size=pv(44, 46), extra=f'data-dim="{kq:.2f}"'),
          chip("판매채널 ↑", a + .7, b, f"left:{pv(BX + 250, 420)}px;top:{cy}px", c=SEC, size=pv(44, 46), extra=f'data-dim="{kq:.2f}"'),
          chip("국가 ↑", a + 1.0, b, f"left:{pv(BX + 590, 800)}px;top:{cy}px", size=pv(44, 46), extra=f'data-dim="{kq:.2f}"'),
          el("h0 abs center", "새로운 **과제**", kq, b, f"left:0;right:0;top:{pv(560, 330)}px;text-align:center;font-size:{pv(130, 150)}px;text-shadow:0 10px 50px rgba(0,0,0,.8)", "scale")]
scene(a, b, "\n".join(parts))

# ───────── 7. 같은 제품이라도 — 국가마다 선호도 · 채널마다 판매속도·재고량 (개념도) ─────────
a, b = T(6)
kc, kch = K("국가마다"), K("판매채널에 따라")
def bars(rows_, tin, x, y, w, labw, title, c):
    out = [el("tag abs", title, tin, b, f"left:{x}px;top:{y}px;font-size:{pv(32, 30)}px;color:rgba(23,27,32,.6)")]
    for k, (lab, frac) in enumerate(rows_):
        yy = y + 60 + k * pv(84, 80)
        out.append(el("abs", lab, tin + .1 + k * .15, b, f"left:{x}px;top:{yy}px;font-size:{pv(38, 36)}px;font-weight:700;width:{labw}px"))
        bw = w - labw - 20
        out.append(box(f"left:{x + labw + 20}px;top:{yy + 12}px;width:{bw}px;height:28px", tin + .1 + k * .15, b,
                       f'<div class="track" style="height:28px"><div class="fill" style="--c:{c}" data-grow="{tin + .2 + k * .15:.2f},{tin + 1.2 + k * .15:.2f},{round(bw * frac)}"></div></div>', a="fade"))
    return out
if v:
    parts = [photo(AMP, 72, 250, 300, 412, a + .1, b, pos="center 40%", label="같은 제품")]
    parts += bars([("국가 A", .86), ("국가 B", .42), ("국가 C", .64)], kc, 410, 270, 550, 150, "국가별 선호도", "linear-gradient(90deg,#b97935,#d2a45f)")
    parts += [box("left:72px;top:720px;width:888px;height:500px;padding:0", kch - .2, b, "", cls="glass")]
    chs = [("온라인몰", .9, .45), ("백화점", .4, .7), ("수출", .6, .9)]
    for k, (lab, sp, st) in enumerate(chs):
        y = 760 + k * 150; tin = kch + k * .25
        parts.append(el("abs", lab, tin, b, f"left:110px;top:{y + 30}px;font-size:40px;font-weight:800;width:200px"))
        for j, (nm, fr, col) in enumerate([("판매속도", sp, "#3f8585"), ("필요 재고", st, "#b97935")]):
            yy = y + 6 + j * 60
            parts.append(el("tag abs", nm, tin + .1, b, f"left:330px;top:{yy}px;font-size:26px;color:rgba(23,27,32,.6)"))
            parts.append(box(f"left:470px;top:{yy + 6}px;width:440px;height:24px", tin + .1, b, f'<div class="track" style="height:24px"><div class="fill" style="--c:{col}" data-grow="{tin + .2:.2f},{tin + 1.1:.2f},{round(440 * fr)}"></div></div>', a="fade"))
else:
    parts = [photo(AMP, 120, 150, 330, 453, a + .1, b, pos="center 40%", label="같은 제품")]
    parts += [box("left:500px;top:150px;width:560px;height:453px", kc - .2, b, "", cls="glass")]
    parts += bars([("국가 A", .86), ("국가 B", .42), ("국가 C", .64)], kc, 540, 180, 480, 150, "국가별 선호도", "linear-gradient(90deg,#b97935,#d2a45f)")
    parts += [box("left:1100px;top:150px;width:700px;height:453px", kch - .2, b, "", cls="glass")]
    parts.append(el("tag abs", "판매채널별 판매속도 · 필요 재고", kch, b, "left:1140px;top:180px;font-size:30px;color:rgba(23,27,32,.6)"))
    chs = [("온라인몰", .9, .45), ("백화점", .4, .7), ("수출", .6, .9)]
    for k, (lab, sp, st) in enumerate(chs):
        y = 240 + k * 120; tin = kch + k * .25
        parts.append(el("abs", lab, tin, b, f"left:1140px;top:{y + 22}px;font-size:36px;font-weight:800;width:170px"))
        for j, (nm, fr, col) in enumerate([("판매속도", sp, "#3f8585"), ("필요 재고", st, "#b97935")]):
            yy = y + 4 + j * 50
            parts.append(el("tag abs", nm, tin + .1, b, f"left:1320px;top:{yy}px;font-size:24px;color:rgba(23,27,32,.6)"))
            parts.append(box(f"left:1450px;top:{yy + 4}px;width:310px;height:22px", tin + .1, b, f'<div class="track" style="height:22px"><div class="fill" style="--c:{col}" data-grow="{tin + .2:.2f},{tin + 1.1:.2f},{round(310 * fr)}"></div></div>', a="fade"))
parts += [chip("같은 제품도 **다르게** 움직입니다", K("필요한 재고량"), b, f"left:{BX}px;top:{pv(1150 if False else 1235, 650)}px", size=pv(40, 44)) if not v else "",
          note(a + .5, b, NOTE_CON + " (국가·채널 이름은 예시)", top=pv(1250, 745))]
if not v: parts[-2] = chip("같은 제품도 **다르게** 움직입니다", K("필요한 재고량"), b, "left:120px;top:640px", size=44)
scene(a, b, "\n".join(parts), "L")

# ───────── 8. OEM 생산 일정 · 발주 수량 + 흩어진 자료 → 판단의 한계 ─────────
a, b = T(7)
ko, kb_, kd, kl = a, K("발주 수량"), K("분산된 자료를"), K("신속하고 정확한")
DL = f'data-dim="{kl:.2f}"'
docs = ([("판매 자료", 90, 330), ("재고표", 640, 300), ("채널별 실적", 380, 560), ("고객 반응", 760, 640), ("OEM 생산 일정", 120, 780, True), ("발주 수량", 560, 860, True)] if v else
        [("판매 자료", 170, 150), ("재고표", 560, 260), ("채널별 실적", 930, 140), ("고객 반응", 1350, 230), ("OEM 생산 일정", 300, 470, True), ("발주 수량", 1100, 470, True)])
parts = [eyebrow("판단이 어려운 이유", a + .1, b, pv(230, 96))]
for k, d in enumerate(docs):
    lab, x, y = d[:3]; hot = len(d) > 3
    tin = (ko + .2 if lab.startswith("OEM") else kb_) if hot else kd - .2 + k * .15
    dx, dy = random.choice([-30, 30]), random.choice([-20, 20])
    parts.append(f'<div class="abs" style="left:{x}px;top:{y}px;width:{pv(250, 270)}px" {A(tin, kl + .25, "card")}>'
                 f'<div class="doc" style="position:relative;left:{pv(50, 60)}px;width:150px;height:180px;transform:rotate({(k % 3 - 1) * 6}deg)" data-move="{tin:.2f},{b:.2f},0,0,1,{dx},{dy},1"></div>'
                 f'<div class="chip" style="position:relative;margin-top:16px;font-size:{pv(32, 32)}px;padding:10px 22px;--c:{GOLD if hot else "rgba(244,241,236,.5)"};{"border-color:rgba(232,201,149,.6)" if hot else ""}">{esc(lab)}</div></div>')
parts.append(el("h1 abs center", "신속·정확한 판단에\n**한계**", kl + .05, b, f"left:0;right:0;top:{pv(560, 300)}px;text-align:center;font-size:{pv(96, 100)}px;text-shadow:0 10px 50px rgba(0,0,0,.85)", "scale"))
scene(a, b, "\n".join(parts))

# ───────── 9. MIRYEO AX 시스템 개발 중 (실제 개발 화면) ─────────
a, b = T(8)
km = K("MIRYEO AX")
cw, chh = png_css("pc_ax")
if v:
    br = browser(72, 640, 888, 560, [("pc_ax", a, b, [(a + .8, b, (230, 0, 1210), (230, 60, 1210))])], a + .6, b, a="push")
    tt = [el("h3 abs dim", "이 문제를 해결하기 위해", a + .2, b, "left:72px;top:260px"),
          el("h1 abs", "**MIRYEO AX**\n시스템", km - .2, b, "left:72px;top:340px;font-size:100px", "scale"),
          status("개발 중", km + .6, b, "left:620px;top:470px;font-size:40px")]
else:
    br = browser(860, 150, 940, 620, [("pc_ax", a, b, [(a + .8, b, (0, 0, 1440), (240, 40, 1200))])], a + .6, b, a="push")
    tt = [el("h3 abs dim", "이 문제를 해결하기 위해", a + .2, b, "left:120px;top:200px"),
          el("h1 abs", "**MIRYEO AX**\n시스템", km - .2, b, "left:120px;top:280px;font-size:118px", "scale"),
          status("개발 중", km + .6, b, "left:120px;top:590px;font-size:42px")]
scene(a, b, "\n".join(tt + [br, note(km, b, NOTE_APP, top=pv(1240, 790), left=pv(72, 860), width=pv(888, 940))]))

# ───────── 10~12. 핵심 세 가지 — ① 통합 ② 연결 ③ 판단 (상단 고정 단계 표시) ─────────
a10, _ = T(9); a11, _ = T(10); a12, b12 = T(11)
k1st = K("첫째")
HIDE.append([a10 - .1, b12])
# 상단 단계 표시 (가로형은 회사명 줄 자리)
pills = []
steps3 = [("① 통합", k1st, a11), ("② 연결", a11, a12), ("③ 판단", a12, b12)]
fs = pv(30, 28)
for k, (lab, ta, tb) in enumerate(steps3):
    sp = f'style="padding:{pv("12px 30px", "10px 28px")};font-size:{fs}px"'
    done = f'<span class="l2" {sp} {A(tb, b12, "fade")}>{lab}</span>' if k < 2 else ""
    pills.append(f'<div class="pill"><span class="l0" {sp}>{lab}</span><span class="l1" {sp} {A(ta, tb, "fade")}>{lab}</span>{done}</div>')
    if k < 2: pills.append(f'<span class="ar" style="font-size:{fs + 4}px;margin:0 {pv(14, 14)}px">→</span>')
trk = f'<div class="trk" style="left:{BX}px;top:{pv(120, 34)}px" {A(a10, b12, "fade")}><span style="font-size:{fs}px;font-weight:800;color:#e8c995;margin-right:22px">핵심 기술</span>{"".join(pills)}</div>'

# 10. 핵심은 세 가지 → ① 통합: 판매실적 · 상품별 재고 · OEM 생산정보 → 하나로
a, b = T(9)
ki = K("통합합니다")
src = [("국내외 판매채널\n**판매실적**", a12), ("상품별\n**재고**", 0), ("**OEM**\n생산정보", 0)]
kk = [k1st + .3, K("상품별 재고"), K("OEM 생산정보를")]
parts = [el("h1 abs center", "핵심 **세 가지**", a + .1, k1st + .2, f"left:0;right:0;top:{pv(700, 380)}px;text-align:center;font-size:{pv(110, 120)}px", "scale")]
if v:
    for k, (t, _) in enumerate(src):
        parts.append(box(f"left:{72 + k * 300}px;top:300px;width:288px;height:220px;padding:28px 26px", kk[k], b, f'<div class="h3" style="font-size:42px;line-height:1.25">{em(t)}</div>', cls="glass"))
    parts.append(svg(arrow(516, 540, 516, 640, ki - .2, ki + .3, 7), ki - .2, b))
    parts.append(browser(72, 660, 888, 560, [("pc_ax", ki - .3, b, [(ki, b, (230, 60, 1210), (230, 260, 1210))])], ki - .3, b, a="push"))
    parts.append(el("h3 abs", "하나로 **통합**", ki - .1, b, "left:620px;top:578px;font-size:50px"))
else:
    for k, (t, _) in enumerate(src):
        parts.append(box(f"left:120px;top:{160 + k * 200}px;width:520px;height:175px;padding:28px 34px", kk[k], b, f'<div class="h3" style="font-size:44px;line-height:1.25">{em(t)}</div>', cls="glass"))
    parts.append(svg(arrow(668, 435, 790, 435, ki - .2, ki + .3, 7), ki - .2, b))
    parts.append(browser(820, 130, 980, 620, [("pc_ax", ki - .3, b, [(ki, b, (230, 60, 1210), (230, 220, 1210))])], ki - .3, b, a="push"))
    parts.append(el("h3 abs", "하나로 **통합**", ki - .1, b, "left:820px;top:760px;font-size:44px;display:none"))
parts.append(eyebrow("① 데이터 통합", k1st, b, pv(230, 112)))
parts.append(note(ki, b, NOTE_APP, top=pv(1240, 790), left=pv(72, 820), width=pv(888, 980)))
scene(a, b, "\n".join(parts), "S")

# 11. ② 고객용 플랫폼 — 상품조회 · 관심상품 · 추천 → 구매 전 행동정보 수집·연결
a, b = T(10)
kv, kw, kr, kg = K("상품조회"), K("관심상품"), K("추천 등"), K("수집하고")
shots = [("mob_beauty", a, kv + .4, [(a + .3, kv, 0, 760)]),
         ("mob_product", kv, kr + .4, [(kv + .2, kr, 0, 520)]),
         ("mob_finder_result", kr, b, [(kr + .2, b, 0, 420)])]
tabs = [("mob_tab_home", a, kv + .4), ("mob_tab_products", kv, kr + .4), ("mob_tab_finder", kr, b)]
if v:
    ph_ = phone(560, 250, 400, shots, a + .1, b, a="push", overlays=tabs)
    ev = [(kv, "상품 **조회**", 300), (kw, "관심 상품 **저장**", 450), (kr, "AI **추천**", 600)]
    parts = [ph_] + [chip(t, tin, b, f"left:72px;top:{y}px", c=SEC, size=40) for tin, t, y in ev]
    parts += [svg(arrow(260, 690, 260, 790, kg - .6, kg - .1, 6, "var(--sec-soft)"), kg - .6, b),
              box("left:72px;top:820px;width:460px;height:250px;padding:30px 32px", K("구매 전") - .1, b,
                  f'<div class="tag" style="color:var(--sec-soft)">CUSTOMER SIGNAL</div><div class="h3" style="margin-top:10px;font-size:46px">구매 전<br><span class="acc">행동정보</span></div>', cls="glass hiedge"),
              status("수집 · 연결", kg, b, "left:72px;top:1110px;font-size:38px", c="#7fb7b2")]
else:
    ph_ = phone(1440, 110, 330, shots, a + .1, b, a="push", overlays=tabs)
    ev = [(kv, "상품 **조회**", 150), (kw, "관심 상품 **저장**", 290), (kr, "AI **추천**", 430)]
    parts = [ph_] + [chip(t, tin, b, f"left:120px;top:{y}px", c=SEC, size=44) for tin, t, y in ev]
    parts += [svg(arrow(620, 330, 760, 330, kg - .6, kg - .1, 6, "var(--sec-soft)"), kg - .6, b),
              box("left:800px;top:170px;width:560px;height:330px;padding:40px 44px", K("구매 전") - .1, b,
                  f'<div class="tag" style="color:var(--sec-soft)">CUSTOMER SIGNAL</div><div class="h2" style="margin-top:12px">구매 전<br><span class="acc">행동정보</span></div>', cls="glass hiedge"),
              status("수집 · 연결", kg, b, "left:800px;top:540px;font-size:40px", c="#7fb7b2")]
parts.append(eyebrow("② 고객 행동 연결", a + .1, b, pv(230, 112)))
parts.append(note(a + .5, b, "고객용 MIRYEO AI Beauty · 실제 개발 화면 (샘플 데이터)", top=pv(1240, 790)))
scene(a, b, "\n".join(parts), "S")

# 12. ③ 상품·채널·국가별 분석 → 판매추세 · 재고상태 · 고객관심도 · 생산 필요성 → 판단하는 기술
a, b = T(11)
kax, ko1, ko2, ko3, ko4, kj = K("상품과"), K("판매추세"), K("재고상태"), K("고객관심도"), K("생산 필요성"), K("판단하는 기술")
axes = [("상품", kax), ("채널", K("채널, 국가별")), ("국가", K("국가별로"))]
outs = [("판매추세", ko1, GOLD), ("재고상태", ko2, GOLD), ("고객관심도", ko3, SEC), ("생산 필요성", ko4, GOLD)]
parts = [eyebrow("③ 데이터 분석 · 판단", a + .1, b, pv(230, 112))]
if v:
    for k, (t, tin) in enumerate(axes): parts.append(chip(t, tin, b, f"left:{72 + k * 300}px;top:280px", size=46))
    parts.append(el("tag abs", "× 분석", K("분석하여"), b, "left:72px;top:390px;font-size:34px;color:var(--gold-soft)"))
    for k, (t, tin, c) in enumerate(outs):
        x, y = 72 + (k % 2) * 456, 460 + (k // 2) * 200
        parts.append(node(f"**{t}**", None, x, y, 432, tin, b, c=c, size=50))
    parts.append(el("h2 abs", "**판단하는 기술**", kj - .1, b, "left:72px;top:900px;font-size:76px", "scale"))
    parts.append(stagepill("구현 목표", "#3f8585", kj + .4, b, "left:72px;top:1010px;font-size:32px"))
else:
    for k, (t, tin) in enumerate(axes): parts.append(chip(t, tin, b, f"left:120px;top:{150 + k * 130}px", size=50))
    parts.append(svg(arrow(420, 300, 560, 300, K("분석하여"), K("분석하여") + .5, 7), K("분석하여"), b))
    parts.append(el("tag abs", "분석", K("분석하여"), b, "left:452px;top:240px;font-size:32px;color:var(--gold-soft)"))
    for k, (t, tin, c) in enumerate(outs):
        x, y = 600 + (k % 2) * 420, 140 + (k // 2) * 180
        parts.append(node(f"**{t}**", None, x, y, 390, tin, b, c=c, size=50))
    parts.append(el("h2 abs", "→ **판단하는 기술**", kj - .1, b, "left:600px;top:520px;font-size:76px", "scale"))
    parts.append(stagepill("구현 목표", "#3f8585", kj + .4, b, "left:1460px;top:150px;font-size:30px"))
scene(a, b, "\n".join(parts), "S")
scenes.append(trk)

# ───────── 13. 예시 — 특정 국가에서 한 제품의 관심도가 높아지면 → 판매속도·재고·추가 생산기간 함께 검토 (개념) ─────────
a, b = T(12)
kup, kvel, kst, kpro, ktog = K("관심도가"), K("판매속도와 재고"), K("재고,", after=K("판매속도와 재고")), K("추가 생산에"), K("함께 검토")
HIDE.append([a - .1, b])
if v:
    bar_ = (f'<div class="axbar" style="left:72px;top:48px;width:888px;padding:18px 28px 16px" {A(a, b, "fade")}><div style="display:flex;align-items:center"><span class="num" style="font-size:30px">예시</span>'
            f'<span class="ttl" style="font-size:36px">관심도가 높아질 때</span></div><div class="sub" style="font-size:24px;margin-top:8px"><i></i>실제 MIRYEO 제품 이미지 · 개념 예시 (수치 없음)</div></div>')
    parts = [bar_,
             photo(MAP, 72, 250, 888, 503, a + .1, b, label="특정 국가"),
             f'<div class="pin abs" style="left:752px;top:470px" {A(a + .6, b, "scale")}></div>',
             photo(AMP, 72, 790, 250, 343, a + .4, b, pos="center 40%"),
             chip("관심도 ↑", kup, b, "left:350px;top:800px", c=RED, size=46)]
    chk = [("판매속도", kvel, 900), ("재고", kst, 990), ("추가 생산 기간", kpro, 1080)]
    for t, tin, y in chk:
        parts.append(numtag("✓", t, tin, b, f"left:350px;top:{y}px;width:610px", size=40))
    parts.append(status("함께 검토", ktog, b, "left:350px;top:1180px;font-size:40px"))
else:
    bar_ = (f'<div class="axbar" style="left:120px;top:20px;padding:12px 26px" {A(a, b, "fade")}><div style="display:flex;align-items:center;white-space:nowrap"><span class="num" style="font-size:26px">예시</span>'
            f'<span class="ttl" style="font-size:32px">관심도가 높아질 때</span><span class="sub" style="font-size:21px;margin-left:24px;padding-left:22px;border-left:1px solid rgba(255,255,255,.22)"><i></i>실제 MIRYEO 제품 이미지 · 개념 예시 (수치 없음)</span></div></div>')
    parts = [bar_,
             photo(MAP, 120, 130, 760, 430, a + .1, b, label="특정 국가"),
             f'<div class="pin abs" style="left:723px;top:315px" {A(a + .6, b, "scale")}></div>',
             photo(AMP, 920, 130, 300, 412, a + .4, b, pos="center 40%"),
             chip("관심도 ↑", kup, b, "left:920px;top:570px", c=RED, size=44)]
    chk = [("판매속도", kvel, 150), ("재고", kst, 290), ("추가 생산 기간", kpro, 430)]
    for t, tin, y in chk:
        parts.append(numtag("✓", t, tin, b, f"left:1270px;top:{y}px;width:530px", size=44))
    parts.append(status("함께 검토", ktog, b, "left:1270px;top:580px;font-size:42px"))
parts.append(note(a + .5, b, PHOTO + " · " + NOTE_CON, top=pv(1250, 700)))
scene(a, b, "\n".join(parts), "L")

# ───────── 14. 도출된 정보 → 생산량 · 발주 시점 · 판매채널별 공급 우선순위 결정 지원 (실제 처리 창) ─────────
a, b = T(13)
kq, kt, kpri, ksup = K("생산량과"), K("발주 시점"), K("판매채널별 공급"), K("결정하도록")
dec = [("**생산량**", kq), ("**발주 시점**", kt), ("판매채널별\n**공급 우선순위**", kpri)]
if v:
    parts = [eyebrow("도출된 정보로", a + .1, b, 240)]
    for k, (t, tin) in enumerate(dec):
        parts.append(box(f"left:{72 + k * 300}px;top:300px;width:288px;height:{200}px;padding:26px 26px", tin, b, f'<div class="h3" style="font-size:44px;line-height:1.25">{em(t)}</div>', cls="glass"))
    parts += [status("결정 지원", ksup, b, "left:72px;top:540px;font-size:42px"),
              browser(72, 640, 888, 560, [("pc_drawer", a, b, [(a + .8, b, (860, 0, 580), (860, 300, 580))])], a + .4, b, label="MIRYEO · 처리 창")]
else:
    parts = [eyebrow("도출된 정보로", a + .1, b, 110)]
    for k, (t, tin) in enumerate(dec):
        parts.append(box(f"left:120px;top:{170 + k * 170}px;width:600px;height:150px;padding:30px 36px", tin, b, f'<div class="h3" style="font-size:46px;line-height:1.2">{em(t)}</div>', cls="glass"))
    parts += [status("결정 지원", ksup, b, "left:120px;top:690px;font-size:42px"),
              browser(780, 130, 1020, 640, [("pc_drawer", a, b, [(a + .8, b, (860, 0, 580), (860, 260, 580))])], a + .4, b, label="MIRYEO · 처리 창")]
parts.append(note(a + .5, b, "실제 개발 화면 · " + NOTE_APP, top=pv(1240, 790), left=pv(72, 780), width=pv(888, 1020)))
scene(a, b, "\n".join(parts))

# ───────── 15. 실행결과 → 다음 판단에 다시 반영 (순환) = 핵심 기술 ─────────
a, b = T(14)
kre, kcore = K("다시 반영"), K("핵심 기술입니다")
cx, cy, R = pv(540, 960), pv(760, 405), pv(330, 265)
loop = [("분석·판단", -90), ("결정 지원", 0), ("실행", 90), ("결과 반영", 180)]
parts = [eyebrow("반복될수록 정교해지는 구조", a + .1, b, pv(230, 96))]
circ = f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="rgba(232,201,149,.35)" stroke-width="4" stroke-dasharray="10 14"/>'
parts.append(svg(circ, a + .2, b))
for k, (t, deg) in enumerate(loop):
    x = cx + R * math.cos(math.radians(deg)); y = cy + R * math.sin(math.radians(deg))
    w_n = pv(250, 260)
    parts.append(node(f"**{t}**" if k == 3 else t, None, round(x - w_n / 2), round(y - 50), w_n, a + .3 + k * .25, b, c=(SEC if k == 3 else GOLD), hi=(k == 3), size=pv(40, 40)))
parts.append(f'<div class="orbit abs" data-orbit="{a + .8:.2f},{cx},{cy},{R},{R},4.2" {A(a + .8, b, "fade")}></div>')
parts.append(hub("핵심<br>기술", cx, cy, pv(150, 140), kcore - .3, b, size=pv(60, 58)).replace("핵심&lt;br&gt;기술", "핵심<br>기술"))
parts.append(el("tag abs center", "실행결과를 다음 판단에 다시 반영", kre - .3, b, f"left:0;right:0;top:{pv(1150, 760)}px;text-align:center;font-size:{pv(36, 32)}px;color:var(--gold-soft)"))
scene(a, b, "\n".join(parts))

# ───────── 16. 특허 출원 — 2026년 10월 15일 · 1건 ─────────
a, b = T(15)
kd16, kp16 = K("2026년"), K("특허 1건")
ROT4 = 'data-t="rotate(4deg)"'
parts = [eyebrow("기술구조 · 특허", a + .1, b, pv(330, 150)),
         el("h2 abs", "이 기술구조에 대해", a + .2, b, f"left:{BX}px;top:{pv(400, 220)}px;color:var(--ink2)"),
         f'<div class="doc xl abs" style="left:{pv(700, 1440)}px;top:{pv(430, 170)}px;width:{pv(230, 300)}px;height:{pv(300, 390)}px;transform:rotate(4deg)" {A(a + .3, b, "card", ROT4)}></div>',
         f'<div class="abs" style="left:{pv(800, 1570)}px;top:{pv(640, 450)}px;width:{pv(110, 130)}px;height:{pv(110, 130)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e6c48c,#d2a45f 55%,#b97935);box-shadow:0 0 0 8px rgba(210,164,95,.2)" {A(kp16, b, "scale")}></div>',
         el("h1 abs", "**특허 1건** 출원", kp16 - .2, b, f"left:{BX}px;top:{pv(490, 320)}px;font-size:{pv(100, 110)}px", "scale"),
         chip("2026. 10. 15 출원", kd16, b, f"left:{BX}px;top:{pv(650, 490)}px", size=pv(44, 46)),
         patent(kp16 + .3, b, pv(54, 58), f"left:{BX}px;top:{pv(800, 620)}px")]
scene(a, b, "\n".join(parts))

# ───────── 17. 외부 전문개발사 협력 · 샘플 데이터 기반 시연형 MVP — 내부 운영시스템 + 고객용 플랫폼 화면·흐름 ─────────
a, b = T(16)
km17, kin, kcu, kfl = K("시연형 MVP"), K("내부 운영시스템"), K("고객용 **MIRYEO".replace("**", "")), K("주요 화면과")
pc_shots = lambda bx_w: [("pc_ax", a, kfl + .3, [(a + .5, kfl, (230, 0, 1210), (230, 220, 1210))]),
                         ("pc_prod", kfl, kfl + 1.6, [(kfl, kfl + 1.6, (230, 0, 1210), (230, 60, 1210))]),
                         ("pc_cust", kfl + 1.4, b, [(kfl + 1.4, b, (230, 0, 1210), (230, 120, 1210))])]
mob_shots = [("mob_beauty", kcu - .2, kfl + 1.2, [(kcu, kfl + 1.2, 0, 900)]),
             ("mob_passport", kfl + 1.0, b, [(kfl + 1.0, b, 0, 500)])]
mtabs = [("mob_tab_home", kcu - .2, kfl + 1.2), ("mob_tab_passport", kfl + 1.0, b)]
if v:
    parts = [chip("외부 전문개발사 **협력**", a + .2, b, "left:72px;top:240px", c=SEC, size=40),
             chip("샘플 데이터 기반 **시연형 MVP**", km17 - .3, b, "left:72px;top:330px", size=40),
             stagepill("구현 완료", "#3f8585", km17 + .4, b, "left:72px;top:430px;font-size:30px"),
             browser(72, 500, 888, 560, pc_shots(888), a + .4, kcu + .4, label="내부 운영시스템 · MIRYEO BUSINESS AX", a="push"),
             phone(350, 470, 380, mob_shots, kcu - .3, b, a="push", overlays=mtabs),
             el("tag abs center", "고객용 MIRYEO AI Beauty", kcu, b, "left:0;right:0;top:432px;text-align:center;font-size:30px;color:var(--gold-soft);display:none")]
else:
    parts = [chip("외부 전문개발사 **협력**", a + .2, b, "left:120px;top:110px", c=SEC, size=36),
             chip("샘플 데이터 기반 **시연형 MVP**", km17 - .3, b, "left:640px;top:110px", size=36),
             stagepill("구현 완료", "#3f8585", km17 + .4, b, "left:1290px;top:122px;font-size:28px"),
             browser(120, 210, 1080, 580, pc_shots(1080), a + .4, b, label="내부 운영시스템 · MIRYEO BUSINESS AX", a="push"),
             phone(1420, 200, 300, mob_shots, kcu - .3, b, a="push", overlays=mtabs)]
    parts.append(el("tag abs", "고객용 · MIRYEO AI Beauty", kcu, b, "left:1400px;top:160px;font-size:24px;color:var(--ink2);display:none"))
parts.append(note(a + .5, b, NOTE_APP, top=pv(1250, 800)))
scene(a, b, "\n".join(parts), "L")

# ───────── 18. 다음 단계 — 실제 데이터 연결 → 운영상태 판단·전략 제시 검증·고도화 ─────────
a, b = T(17)
kr18, kop, kver = K("실제", after=a), K("운영상태"), K("검증하고")
stp = [(a + .3, "현재", "샘플 데이터 기반\n**시연형 MVP**", GOLD, False),
       (kr18, "다음 단계", "**실제** 판매·재고·\n고객행동 데이터 연결", SEC, False),
       (kop, "검증 · 고도화", "운영상태 판단 ·\n**전략 제시** 기능", "#d9b77a", True)]
parts = [eyebrow("NEXT STEP · 다음 단계", a + .1, b, pv(230, 110))]
for k, (tin, tag, txt, c, dash) in enumerate(stp):
    st = f"left:72px;top:{300 + k * 290}px;width:888px;height:250px;padding:30px 40px 0 56px" if v else f"left:{120 + k * 570}px;top:180px;width:540px;height:330px;padding:36px 34px 0 52px"
    bd = "border:3px dashed rgba(232,201,149,.55);background:rgba(255,255,255,.03)" if dash else ""
    parts.append(box(f"{st};{bd}", tin, b, f'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px;background:{c}"></div>'
                     f'<div class="tag" style="color:{c}">{tag}</div><div class="h3" style="margin-top:12px;font-size:{pv(50, 46)}px">{em(txt)}</div>', cls="glass"))
    if k < 2:
        parts.append(svg(arrow(516, 300 + k * 290 + 255, 516, 300 + (k + 1) * 290 - 5, tin + .4, tin + .9, 6) if v else arrow(670 + k * 570, 345, 680 + k * 570 + 20, 345, tin + .4, tin + .9, 6), tin + .4, b))
parts.append(status("검증하고 **고도화**", kver, b, f"left:{BX}px;top:{pv(1180, 580)}px;font-size:42px"))
scene(a, b, "\n".join(parts))

# ───────── 19. 목표 — 자체 브랜드 → 뷰티 브랜드 플랫폼 → 미용기기·생활용품 → SaaS (검토) ─────────
a, b = T(18)
ks1, ks2, ks3, ks4 = K("자체 브랜드"), K("다양한 뷰티"), K("미용기기와"), K("SaaS")
road = [(ks1, "STEP 1", "**자체 브랜드**\n먼저 적용", GOLD, False),
        (ks2, "STEP 2", "다양한 **뷰티 브랜드**\n참여 플랫폼", SEC, False),
        (ks3, "STEP 3", "**미용기기·생활용품**\n상품군 확장", GOLD, False),
        (ks4, "장기 · 검토", "AX 운영기술\n**SaaS** 제공", "#a96a27", True)]
parts = [el("h2 abs", "목표는 여기서\n**끝나지 않습니다**", a + .1, b, f"left:{BX}px;top:{pv(240, 110)}px;font-size:{pv(64, 60)}px", extra=f'data-dim="{ks1:.2f}"')]
for k, (tin, tag, txt, c, dash) in enumerate(road):
    st = f"left:72px;top:{430 + k * 205}px;width:888px;height:180px;padding:26px 36px 0 56px" if v else f"left:{120 + k * 425}px;top:330px;width:400px;height:300px;padding:34px 30px 0 50px"
    bd = "border:3px dashed rgba(169,106,39,.6);background:rgba(255,255,255,.55)" if dash else ""
    img_ = f'<img src="{LINEUP}" style="position:absolute;right:16px;bottom:10px;width:{pv(300, 0)}px;opacity:.95;display:{"block" if (v and k == 0) else "none"}">'
    parts.append(box(f"{st};{bd}", tin, b, f'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;border-radius:28px 0 0 28px;background:{c}"></div>'
                     f'<div class="tag" style="color:{c if dash else "rgba(23,27,32,.55)"}">{tag}</div><div class="h3" style="margin-top:10px;font-size:{pv(46, 42)}px;line-height:1.25">{em(txt)}</div>{img_}', cls="glass"))
if not v:
    parts.append(feather(LINEUP, 1180, 60, 620, a + .3, b, "fe", "scale"))
parts.append(note(ks4 + .3, b, "SaaS 사업은 장기 확장 가능성을 검토하는 단계입니다", top=pv(1250, 680)))
scene(a, b, "\n".join(parts), "L")

# ───────── 20. 기존 유통·수출 경험 + 매출 기반 + 새로운 AX 기술 → 성장 ─────────
a, b = T(19)
kexp, krev, kax, kgr = a, K("매출 기반"), K("새로운 AX"), K("성장하고자")
if v:
    parts = [box("left:72px;top:250px;width:888px;height:330px;padding:0;overflow:hidden", kexp + .1, b,
                 f'<img src="{STORE_W}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35">'
                 f'<div style="position:absolute;left:40px;top:36px"><div class="tag" style="color:var(--gold-soft)">기존 사업</div><div class="h2" style="margin-top:10px;font-size:60px">유통·수출 <span class="acc">경험</span></div></div>', cls="glass"),
             chip("**매출 기반**", krev, b, "left:112px;top:470px", size=44),
             el("h1 abs center", "+", kax - .3, b, "left:0;right:0;top:600px;text-align:center;font-size:110px;color:var(--gold-soft)"),
             box("left:72px;top:740px;width:888px;height:240px;padding:40px", kax, b, f'<div class="tag" style="color:var(--gold-soft)">NEW</div><div class="h2" style="margin-top:10px;font-size:60px">새로운 <span class="acc">AX 기술</span></div>', cls="glass hiedge"),
             el("h1 abs", "→ **성장**", kgr, b, "left:72px;top:1030px;font-size:110px", "scale")]
else:
    parts = [box("left:120px;top:150px;width:700px;height:420px;padding:0;overflow:hidden", kexp + .1, b,
                 f'<img src="{STORE_W}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35">'
                 f'<div style="position:absolute;left:44px;top:44px"><div class="tag" style="color:var(--gold-soft)">기존 사업</div><div class="h2" style="margin-top:10px">유통·수출 <span class="acc">경험</span></div></div>', cls="glass"),
             chip("**매출 기반**", krev, b, "left:164px;top:460px", size=46),
             el("h1 abs", "+", kax - .3, b, "left:858px;top:270px;font-size:120px;color:var(--gold-soft)"),
             box("left:980px;top:150px;width:820px;height:420px;padding:44px", kax, b, f'<div class="tag" style="color:var(--gold-soft)">NEW</div><div class="h2" style="margin-top:10px">새로운<br><span class="acc">AX 기술</span></div>', cls="glass hiedge"),
             patent(kax + .5, b, 34, "left:1024px;top:470px"),
             el("h1 abs", "→ **성장**", kgr, b, "left:120px;top:610px;font-size:120px", "scale")]
scene(a, b, "\n".join(parts))

# ───────── 21. MVP 실제 사업환경 실증 + 추가 기술개발 → 자금 필요 ─────────
a, b = T(20)
kpv, kdev, kfund = K("실제 사업환경"), K("추가 기술개발"), K("자금이")
need = [("①", "현재 MVP를\n**실제 사업환경**에서 실증", kpv, GOLD), ("②", "**추가 기술개발**\n추진", kdev, SEC)]
parts = [eyebrow("이를 위해 필요한 것", a + .1, b, pv(240, 120))]
for k, (n, t, tin, c) in enumerate(need):
    st = f"left:72px;top:{300 + k * 260}px;width:888px;height:230px;padding:36px 44px" if v else f"left:{120 + k * 570}px;top:190px;width:540px;height:330px;padding:44px 44px"
    parts.append(box(st, tin, b, f'<div class="tag" style="color:{c}">{n}</div><div class="h3" style="margin-top:10px;font-size:{pv(50, 48)}px;line-height:1.28">{em(t)}</div>', cls="glass"))
if v:
    parts += [svg(arrow(516, 810, 516, 900, kfund - .5, kfund, 7), kfund - .5, b),
              box("left:72px;top:920px;width:888px;height:250px;padding:46px", kfund - .1, b, f'<div class="h1" style="font-size:92px"><span class="acc">자금</span>이 필요합니다</div>', cls="glass hiedge")]
else:
    parts += [svg(arrow(1270, 355, 1350, 355, kfund - .5, kfund, 7), kfund - .5, b),
              box("left:1380px;top:190px;width:420px;height:330px;padding:50px 44px", kfund - .1, b, f'<div class="h1" style="font-size:96px;line-height:1.1"><span class="acc">자금</span><br>필요</div>', cls="glass hiedge")]
scene(a, b, "\n".join(parts), "S")

# ───────── 22. 신용보증기금 스타트업지점 · 기술성·사업성 검토 → 다음 성장단계 / 감사합니다 ─────────
a, b = T(21)
kt2, knext, kty = K("기술성"), K("다음 성장단계로"), K("감사합니다")
cxm = W // 2
parts = [el("h2 abs", "**신용보증기금**\n스타트업지점", a + .1, kty - .1, f"left:{BX}px;top:{pv(300, 150)}px;font-size:{pv(76, 80)}px"),
         chip("**기술성**", kt2, kty - .1, f"left:{BX}px;top:{pv(560, 400)}px", size=46),
         chip("**사업성**", K("사업성"), kty - .1, f"left:{pv(BX + 270, 420)}px;top:{pv(560, 400)}px", c=SEC, size=46),
         el("h3 abs dim", "검토를 통해", K("검토를 통해"), kty - .1, f"left:{pv(BX, 720)}px;top:{pv(680, 408)}px"),
         el("h1 abs", "다음 **성장단계**로", knext, kty - .1, f"left:{BX}px;top:{pv(800, 560)}px;font-size:{pv(96, 110)}px", "scale"),
         f'<div class="abs" style="left:{cxm - 66}px;top:{pv(420, 140)}px;width:132px;height:132px;border-radius:34px;background:linear-gradient(160deg,#e3c48a,#b97935);display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:900;color:#141a22;box-shadow:0 40px 80px -30px rgba(0,0,0,.8)" {A(kty - .1, b, "scale")}>M</div>',
         el("h2 abs center", "주식회사 가연인터내셔널", kty, b, f"left:0;right:0;top:{pv(610, 320)}px;text-align:center;font-size:{pv(60, 64)}px"),
         el("h3 abs center dim", "MIRYEO AX", kty + .15, b, f"left:0;right:0;top:{pv(710, 415)}px;text-align:center"),
         el("h1 abs center", "**감사합니다**", kty + .3, b, f"left:0;right:0;top:{pv(840, 520)}px;text-align:center;font-size:{pv(100, 104)}px", "scale"),
         f'<div class="abs" style="left:0;right:0;top:{pv(1010, 680)}px;display:flex;justify-content:center" {A(kty + .6, b, "up")}>{patent(0, 0, pv(40, 36), "position:relative").replace(A(0, 0, "up"), "")}</div>']
scene(a, b, "\n".join(parts))

# ───────── 틀에 넣기 ─────────
guides = (['<div class="guide" style="left:0;right:0;top:0;height:220px"></div>', '<div class="guide" style="left:72px;width:888px;top:220px;height:1080px"></div>',
           '<div class="guide" style="left:132px;right:132px;top:1330px;height:180px"></div>', '<div class="guide" style="left:0;right:0;top:1520px;bottom:0"></div>']
          if v else ['<div class="guide" style="left:120px;width:1680px;top:96px;height:724px"></div>', '<div class="guide" style="left:160px;right:160px;top:842px;height:150px"></div>'])
subs_js = json.dumps([[s_["in"], s_["out"], s_["text"]] for s_ in SUBS], ensure_ascii=False)
tpl = open("comp.tpl.html").read()
out = (tpl.replace("<!--SCENES-->", "\n".join(scenes)).replace("/*SUBS*/", subs_js).replace("/*DUR*/", str(DUR))
          .replace("/*FMT*/", FMT).replace("/*LIGHT*/", json.dumps(LIGHT)).replace("/*HIDEBRAND*/", json.dumps(HIDE)).replace("<!--GUIDES-->", "\n".join(guides)))
open(f"comp/comp_{FMT}.html", "w").write(out)
json.dump([round(x, 2) for x in B], open(f"out/bounds_{FMT}.json", "w"))
print(FMT, "장면", len(scenes), "DUR", DUR, "경계", [round(x, 1) for x in B])
