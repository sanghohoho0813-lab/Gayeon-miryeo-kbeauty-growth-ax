#  build.py (KODIT V2) — 신용보증기금 스타트업지점 제출용 소개 영상 V2: 장면표 → comp/comp_v.html(1080×1920) / comp/comp_h.html(1920×1080)
#  python3 build.py v|h
#  V1(video/kodit-startup)과 같은 틀 위에 '영상 도구 · 스타일 통합 가이드 V1'(2026-10-28)의 연출을 섞음:
#   흐름선 배경(알고리즘 아트 · 시드 고정) · 롱테이크(실제 화면을 HTML로 다시 그림 + 커서 클릭 + 버튼→카드 + 이어지는 카메라)
#   · 계산 그래프(비례 막대·눈금·타임라인·숫자 세기, manim식) · 분해도(층이 들리며 지시선 라벨) · 계단 · 궤도 · 효과음 큐
#  사용자 지시(2026-11-02): 상자 테두리는 네 면 같은 색·얇게(한쪽만 색 금지) · 배경 바둑판 선 없음 · 첫 문장은 짧은 녹음 파일
#  숫자: 대본에 있는 것만(2025년 상품매출 약 4억 7천만 원 · 2026년 10월 특허 1건 · 업력 5년 미만 · 월 10만~30만 원대). 설명 화면은 '예시'·'개념도'
import json, html, re, sys, wave, math, struct

FMT = sys.argv[1]
v = FMT == "v"
W, H = (1080, 1920) if v else (1920, 1080)
SUBS = json.load(open("subs.json"))
CH = json.load(open("chars.json"))
S = [s["in"] for s in SUBS]
w_ = wave.open("voice.wav"); VOICE = w_.getnframes() / w_.getframerate()
LEAD = 0.8                         # 앞 여백 (가이드 §4-3)
DUR = round(VOICE + LEAD + 2.5, 2)  # 끝 2.5초
open("out/dur.txt", "w").write(str(DUR))
NOTE_APP = "화면 속 수치는 샘플(시연용) 데이터입니다 · 실제 회사 실적이 아닙니다"
NOTE_CON = "개념도 · 설명용 예시입니다 (실제 수치 아님)"
PHOTO = "사진: 주식회사 가연인터내셔널 회사소개서"
GOLD, SEC, RED = "var(--gold)", "var(--sec)", "#c2513f"
PATENT_NO = "10-2026-0198281"
BX, BW = (72, 888) if v else (120, 1680)
CT, CB = (230, 1290) if v else (100, 815)        # 내용 영역 위·아래 (자막 위)
NOTE_Y = 1255 if v else 792
SFX = []                                           # 효과음 큐 [시각, 종류]
def sfx(t, kind): SFX.append([round(t, 2), kind])

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
    return el("eyebrow abs", t, tin, tout, f"left:{left if left is not None else BX}px;top:{top}px;right:{W - BX - BW}px", "fade")
def note(tin, tout, text, top=None, left=None, width=None):
    return f'<div class="note" style="top:{top or NOTE_Y}px;left:{left if left is not None else BX}px;max-width:{width or BW}px" {A(tin, tout, "fade")}>{esc(text)}</div>'
def chip(txt, tin, tout, style, c=GOLD, a="up", size=None, extra=""):
    fs = f";font-size:{size}px" if size else ""
    return el("chip abs", txt, tin, tout, f"{style};--c:{c}{fs}", a, extra)
def svg(inner, tin, tout, w=None, h=None, style="left:0;top:0"):
    return f'<svg class="abs" width="{w or W}" height="{h or H}" viewBox="0 0 {w or W} {h or H}" style="{style};overflow:visible" {A(tin, tout, "fade")}>{inner}</svg>'
def line(x1, y1, x2, y2, t0, t1, w=5, col="var(--gold)", dash=""):
    dr = "" if dash else f'data-draw="{t0:.2f},{t1:.2f}"'
    da = f'stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{w}" stroke-linecap="round" {dr} {da}/>'
def path(d, t0, t1, w=6, col="var(--gold)", extra=""):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" data-draw="{t0:.2f},{t1:.2f}" {extra}/>'
def arrow(x1, y1, x2, y2, t0, t1, w=6, col="var(--gold)"):
    ang = math.atan2(y2 - y1, x2 - x1); L = 24
    p1 = (x2 - L * math.cos(ang - .5), y2 - L * math.sin(ang - .5)); p2 = (x2 - L * math.cos(ang + .5), y2 - L * math.sin(ang + .5))
    return (line(x1, y1, x2, y2, t0, t1, w, col) +
            f'<path d="M{p1[0]:.1f},{p1[1]:.1f} L{x2},{y2} L{p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" data-draw="{t1 - .15:.2f},{t1 + .2:.2f}"/>')
def photo(src, x, y, w, h, tin, tout, pos="center", a="card", radius=24, extra="", zoom=None, label=None):
    zm = f' data-move="{zoom[0]:.2f},{zoom[1]:.2f},0,0,1,0,0,{zoom[2]}"' if zoom else ""
    lb = (f'<div style="position:absolute;left:14px;bottom:14px;padding:6px 16px;border-radius:999px;background:rgba(15,18,22,.72);color:#f4f1ec;'
          f'font-size:{pv(24, 22)}px;font-weight:700">{esc(label)}</div>') if label else ""
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{radius}px;overflow:hidden;'
            f'box-shadow:0 36px 70px -34px rgba(60,40,20,.55);background:#ddd" {A(tin, tout, a, extra)}>'
            f'<img src="{src}" style="width:100%;height:100%;object-fit:cover;object-position:{pos}"{zm}>{lb}</div>')
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
def patent(tin, tout, size, style="", a="up"):
    return (f'<div class="patent abs" style="font-size:{size}px;{style}" {A(tin, tout, a)}>'
            f'<span class="pl">특허출원</span><span class="pn">{PATENT_NO}</span></div>')
def stagepill(txt, c, tin, tout, style, a="up"):
    return el("stage abs", txt, tin, tout, f"{style};--c:{c}", a)
def node(txt, small, x, y, w, tin, tout, c=GOLD, hi=False, size=None, extra="", a="card"):
    fs = f";font-size:{size}px" if size else ""
    sm = f"<small>{esc(small)}</small>" if small else ""
    return f'<div class="node abs{" hi" if hi else ""}" style="left:{x}px;top:{y}px;width:{w}px;--bc:{c}{fs}" {A(tin, tout, a, extra)}>{em(txt)}{sm}</div>'
def hub(txt, cx, cy, r, tin, tout, size=None, a="scale"):
    return f'<div class="hub abs" style="left:{cx - r}px;top:{cy - r}px;width:{2 * r}px;height:{2 * r}px;font-size:{size or round(r * .36)}px" {A(tin, tout, a)}>{txt}</div>'
def status(txt, tin, tout, style, c="#e3b65c"):
    return f'<div class="status abs" style="{style};--c:{c}" {A(tin, tout, "up")}><i></i>{em(txt)}</div>'
def flow(seed, tin, tout, push=(1.0, 1.045), n=2600):
    # 흐름선 배경 — 2400×1350(세로형 1350×2400)으로 그려 화면보다 조금 크게, 천천히 밀고 들어감
    cw, chh = (1350, 2400) if v else (2400, 1350)
    fit = round(max(W / cw, H / chh) * 1.0, 4)
    return (f'<canvas class="flow" width="{cw}" height="{chh}" data-seed="{seed}" data-n="{n}" data-fit="{fit}" '
            f'data-push="{tin:.2f},{tout:.2f},{push[0]},{push[1]}" {A(tin, tout, "fade")}></canvas>')
GB = "rgba(232,201,149,.55)"    # 금색 얇은 테두리 (네 면 같게)
def card(style, tin, tout, inner, light=False, gold=False, a="card", extra=""):
    bd = GB if gold else ("rgba(23,27,32,.12)" if light else "rgba(255,255,255,.16)")
    bg = "#fff" if light else "linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.025))"
    sh = "0 30px 60px -32px rgba(70,45,20,.30)" if light else "0 40px 80px -30px rgba(0,0,0,.7)"
    return box(f"{style};border-radius:28px;border:1.5px solid {bd};background:{bg};box-shadow:{sh}", tin, tout, inner, a=a, extra=extra)

# 장면 경계 — 자막 시작 시각, 0.25초 겹침
def si(prefix):
    for i, sb in enumerate(SUBS):
        if sb["text"].replace("**", "").replace("\n", " ").startswith(prefix): return i
    raise SystemExit(f"자막에 없음: {prefix}")
starts = ["2025년 약", "후발주자인", "AI 시대에", "실제로 해외", "재고가 부족하면", "이 문제를 해결하기", "핵심은", "고객용 MIRYEO", "기존 ERP",
          "이 기술구조로", "기술 기획과", "초기 MVP", "수익모델도", "먼저 자체", "이후", "장기적으로는", "다만 관리도구가", "지금은 실제",
          "가연인터내셔널은", "신용보증기금"]
B = [0.0] + [S[si(p)] for p in starts] + [DUR]
X = 0.25
def T(i): return B[i], (B[i + 1] + X if i + 1 < len(B) - 1 else DUR)
I = lambda p: S[si(p)]
C, PR = "../company/", "../prod/"
JAR, LINEUP, MAP, STORE_W, EXPO_A, SHOP = C + "jar.png", C + "lineup.png", C + "map.png", C + "store_w.png", C + "expo_a.png", C + "shop.png"
P = {k: PR + f"{k}.webp" for k in ["ampoule-b", "cream-i", "essence-a", "toner-e", "cream-c", "ampoule-h", "mist-j", "mask-g"]}

# ═════════ 1. 오프닝 — 흐름선 배경 위 회사명 · 국내 유통/해외 수출 · 자체 기획 AX 기술 ═════════
a, b = T(0)
k2, k3, k4 = I("화장품 국내"), I("발견한 문제를"), I("자체 기획한")
cy = pv(820, 470)
scene(a, b, "\n".join([
    flow(47, a, b),
    eyebrow("K-BEAUTY · AX", a + .2, b, cy - pv(250, 230), left=0).replace(f"right:{W - BX - BW}px", "right:0;text-align:center"),
    el("h3 abs center dim", "주식회사", a + .3, b, f"left:0;right:0;top:{cy - pv(190, 175)}px;text-align:center"),
    el("h0 abs center", "가연인터내셔널", a + .45, b, f"left:0;right:0;top:{cy - pv(120, 110)}px;text-align:center;font-size:{pv(118, 140)}px"),
    chip("화장품 **국내 유통**", k2, b, f"left:{pv(150, 560)}px;top:{cy + pv(90, 80)}px", size=pv(42, 44)),
    chip("**해외 수출**", K("해외 수출"), b, f"left:{pv(580, 1010)}px;top:{cy + pv(90, 80)}px", c=SEC, size=pv(42, 44)),
    el("h3 abs center", "발견한 문제를 해결하는 **자체 기획 AX 기술**", k4 - .1, b, f"left:0;right:0;top:{cy + pv(200, 190)}px;text-align:center;font-size:{pv(44, 50)}px"),
    patent(a + .6, k3, pv(40, 38), f"left:{BX}px;top:{pv(150, 120)}px"),
]))
sfx(a + .4, "pop"); sfx(k4, "tick")

# ═════════ 2. 2025년 상품매출 — 숫자 세기 ═════════
a, b = T(1)
kn = K("4억")
scene(a, b, "\n".join([
    eyebrow("2025 · 상품매출", a + .1, b, pv(420, 230)),
    el("h3 abs dim", "주식회사 가연인터내셔널", a + .2, b, f"left:{BX}px;top:{pv(480, 290)}px;font-size:{pv(40, 42)}px"),
    f'<div class="abs val" style="left:{BX - 6}px;top:{pv(560, 360)}px;font-size:{pv(150, 210)}px" data-countk="{kn - .2:.2f},{kn + 1.4:.2f},0,47000" {A(a + .2, b, "up")}>0 원</div>',
    el("h3 abs", "약 · 상품매출", kn + 1.2, b, f"left:{BX}px;top:{pv(760, 620)}px;font-size:{pv(40, 44)}px;color:var(--ink2)"),
    box(f"left:{BX}px;top:{pv(840, 700)}px;width:{pv(888, 1000)}px;height:10px", kn - .2, b,
        f'<div class="track" style="height:10px"><div class="fill" data-grow="{kn - .2:.2f},{kn + 1.4:.2f},{pv(888, 1000)}"></div></div>', a="fade"),
]), "S")
sfx(kn + 1.4, "tick")

# ═════════ 3. 후발주자 · 같은 방식으로만 경쟁 → 성장의 한계 (개념 그래프) ═════════
a, b = T(2)
kl, ksame, kceil = a, K("같은 방식으로만"), K("한계가")
gx0, gy0, gw, gh = (90, 360, 900, 620) if v else (120, 160, 1100, 520)
ceil_y = gy0 + gh * .28
def curve(seed, lift, flat_at):
    pts = []
    for k in range(41):
        u = k / 40; yv = min(lift * (1 - math.exp(-3.2 * u)) + .04 * math.sin(u * 9 + seed), flat_at)
        pts.append(f"{gx0 + u * gw:.1f},{gy0 + gh - yv * gh:.1f}")
    return "M" + " L".join(pts)
gr = (line(gx0, gy0 + gh, gx0 + gw, gy0 + gh, a + .2, a + .8, 3, "rgba(244,241,236,.35)") + line(gx0, gy0, gx0, gy0 + gh, a + .2, a + .8, 3, "rgba(244,241,236,.35)") +
      "".join(path(curve(s_, .62 + s_ * .03, .72), ksame - .2 + s_ * .15, ksame + 1.4 + s_ * .15, 4, "rgba(244,241,236,.32)") for s_ in range(3)) +
      path(curve(1.7, .9, .72), kl + .3, ksame + 1.6, 7, "var(--gold)") +
      f'<line x1="{gx0}" y1="{ceil_y:.0f}" x2="{gx0 + gw}" y2="{ceil_y:.0f}" stroke="{RED}" stroke-width="4" stroke-dasharray="14 12" data-draw="{kceil - .3:.2f},{kceil + .5:.2f}"/>')
parts = [eyebrow("후발주자의 고민", a + .1, b, pv(240, 100)), svg(gr, a + .1, b),
         el("tag abs", "같은 방식으로만 경쟁", ksame, b, f"left:{gx0 + gw - pv(360, 330)}px;top:{gy0 + gh * .36:.0f}px;font-size:30px;color:rgba(244,241,236,.6)"),
         el("tag abs", "저희", kl + .5, b, f"left:{gx0 + 12}px;top:{gy0 + gh - 90}px;font-size:32px;color:var(--gold-soft)"),
         chip("지속 성장의 **한계**", kceil, b, f"left:{pv(BX, 1290)}px;top:{pv(1060, 300)}px", c=RED, size=pv(46, 50)),
         note(a + .4, b, NOTE_CON, top=pv(1255, 760))]
scene(a, b, "\n".join(parts))
sfx(kceil, "pop")

# ═════════ 4. AI 시대 — 운영방식부터 바꾼다 (흐름선 배경 · BIG) ═════════
a, b = T(3)
kop = K("운영방식")
cy = pv(800, 430)
scene(a, b, "\n".join([
    flow(7, a, b, (1.0, 1.05)),
    el("h1 abs center dim", "AI 시대,", a + .2, b, f"left:0;right:0;top:{cy - pv(170, 160)}px;text-align:center;font-size:{pv(92, 100)}px"),
    el("h0 abs center", "**운영방식**부터\n바꾸기로", kop - .1, b, f"left:0;right:0;top:{cy - pv(30, 30)}px;text-align:center;font-size:{pv(124, 140)}px;line-height:1.12", "up"),
]))
sfx(a + .2, "swish")

# ═════════ 5. 해외 수출 현실 — 국가마다 선호 제품 · 채널마다 판매속도 (지도 + 움직이는 점) ═════════
a, b = T(4)
kc, kch = K("국가마다"), K("판매채널마다")
if v:
    mx, my, mw, mh = 72, 250, 888, 503
    pins = [(0.19, .38, "국가 A", P["cream-i"]), (0.50, .42, "국가 B", P["ampoule-b"]), (0.80, .46, "국가 C", P["toner-e"])]
    lx, ly, lw, lgap = 260, 970, 640, 100
else:
    mx, my, mw, mh = 120, 140, 900, 510
    pins = [(0.19, .38, "국가 A", P["cream-i"]), (0.50, .42, "국가 B", P["ampoule-b"]), (0.80, .46, "국가 C", P["toner-e"])]
    lx, ly, lw, lgap = 1290, 250, 470, 140
parts = [eyebrow("해외 수출을 하다 보면", a + .1, b, pv(190, 96)), photo(MAP, mx, my, mw, mh, a + .15, b, label="예시 · 국가 이름 없음")]
for k, (u, w_, lab, img_) in enumerate(pins):
    px, py = mx + u * mw, my + w_ * mh
    tin = kc + k * .3
    parts.append(f'<div class="pin abs" style="left:{px - 17:.0f}px;top:{py - 17:.0f}px" {A(tin, b, "scale")}></div>')
    parts.append(box(f"left:{px - 64:.0f}px;top:{py - 190:.0f}px;width:128px;height:150px;border-radius:20px;overflow:hidden;border:1.5px solid {GB};background:#fff;box-shadow:0 20px 40px -20px rgba(0,0,0,.5)", tin + .1, b,
                     f'<img src="{img_}" style="width:100%;height:112px;object-fit:cover;object-position:center 40%"><div style="text-align:center;font-size:20px;font-weight:800;color:#171b20;margin-top:4px">{lab}</div>'))
parts.append(chip("국가마다 **선호 제품**이 다름", kc + 1.0, b, f"left:{BX}px;top:{pv(780, 680)}px", size=pv(40, 40)))
chs = [("온라인몰", 210), ("백화점", 70), ("수출", 130)]
parts.append(el("tag abs", "판매채널별 판매속도", kch - .2, b, f"left:{lx - pv(190, 0)}px;top:{ly - pv(80, 140)}px;font-size:30px;color:rgba(23,27,32,.6)"))
for k, (lab, spd) in enumerate(chs):
    y = ly + k * lgap; tin = kch + k * .2
    parts.append(el("abs", lab, tin, b, f"left:{lx - pv(190, 0)}px;top:{y - pv(22, 62)}px;font-size:{pv(34, 32)}px;font-weight:800;width:180px"))
    parts.append(f'<div class="lane" style="left:{lx}px;top:{y}px;width:{lw}px" {A(tin, b, "fade")}></div>')
    for j in range(3):
        parts.append(f'<div class="ldot" style="top:{y + 3}px;background:{"#3f8585" if k != 1 else "#b97935"}" data-lane="{tin - j * lw / spd / 3:.2f},{spd},{lx},{lx + lw}" {A(tin, b, "fade")}></div>')
parts.append(chip("채널마다 **판매속도**가 다름", kch + .9, b, f"left:{pv(BX, 1290)}px;top:{pv(1190, 680)}px", c=SEC, size=pv(40, 40)))
parts.append(note(a + .5, b, PHOTO + " · " + NOTE_CON, top=pv(1282, 790)))
scene(a, b, "\n".join(parts), "L")
sfx(kc, "tick")

# ═════════ 6. 재고 딜레마 — 부족하면 판매 기회 손실 / 많으면 재고 부담 + OEM 생산 일정 (계산 막대) ═════════
a, b = T(5)
klow, khigh, koem = K("재고가 부족하면"), K("너무 많이"), K("OEM 생산 일정")
gx, gy, gw2 = (BX, 420, BW) if v else (220, 260, 1480)
z1, z2 = .3, .7
parts = [eyebrow("재고의 딜레마", a + .1, b, pv(240, 110)),
         el("tag abs", "재고 부족", a + .2, b, f"left:{gx}px;top:{gy - 70}px;font-size:30px;color:#ff8a70"),
         el("tag abs", "적정", a + .2, b, f"left:{gx + gw2 * .5 - 30:.0f}px;top:{gy - 70}px;font-size:30px;color:var(--gold-soft)"),
         el("tag abs", "과잉 생산", a + .2, b, f"left:{gx + gw2 - 130:.0f}px;top:{gy - 70}px;font-size:30px;color:#ff8a70"),
         box(f"left:{gx}px;top:{gy}px;width:{gw2}px;height:34px;border-radius:17px;overflow:hidden;border:1.5px solid rgba(255,255,255,.16);"
             f"background:linear-gradient(90deg, rgba(194,81,63,.55) 0%, rgba(194,81,63,.25) {z1*100:.0f}%, rgba(210,164,95,.35) {z1*100:.0f}%, rgba(210,164,95,.35) {z2*100:.0f}%, rgba(194,81,63,.25) {z2*100:.0f}%, rgba(194,81,63,.55) 100%)", a + .15, b, "", a="fade"),
         f'<div class="abs" style="left:{gx + gw2 * .5 - 16:.0f}px;top:{gy - 18}px;width:32px;height:70px;border-radius:16px;background:#f4f1ec;box-shadow:0 0 0 6px rgba(244,241,236,.18)" '
         f'data-mv="{klow:.2f},{klow + .9:.2f},0,0,{-gw2 * .36:.0f},0;{khigh:.2f},{khigh + 1.0:.2f},{-gw2 * .36:.0f},0,{gw2 * .36:.0f},0;{koem - .3:.2f},{koem + .5:.2f},{gw2 * .36:.0f},0,0,0" {A(a + .3, b, "scale")}></div>',
         card(f"left:{gx}px;top:{gy + 90}px;width:{pv(430, 520)}px;height:{pv(150, 130)}px;padding:26px 30px", klow + .5, b, f'<div class="h3" style="font-size:{pv(40, 42)}px">판매 기회를<br><span style="color:#ff8a70">놓침</span></div>'),
         card(f"left:{gx + gw2 - pv(430, 520)}px;top:{gy + 90}px;width:{pv(430, 520)}px;height:{pv(150, 130)}px;padding:26px 30px", khigh + .5, b, f'<div class="h3" style="font-size:{pv(40, 42)}px">재고 <span style="color:#ff8a70">부담</span>이<br>생김</div>')]
# OEM 생산 일정 타임라인
ty = gy + pv(400, 340); tl = [(0, .18, "발주"), (.18, .78, "OEM 생산"), (.78, 1.0, "입고")]
for k, (u0, u1, lab) in enumerate(tl):
    x0 = gx + gw2 * u0; ww = gw2 * (u1 - u0) - 8; tin = koem + k * .35
    col = "linear-gradient(90deg,#b97935,#d2a45f)" if k == 1 else "rgba(255,255,255,.14)"
    parts.append(box(f"left:{x0:.0f}px;top:{ty}px;width:{ww:.0f}px;height:64px;border-radius:14px;background:{col};border:1.5px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:{'#16110d' if k == 1 else '#f4f1ec'}", tin, b, esc(lab), a="left"))
parts.append(el("tag abs", "여기에 OEM 생산 일정까지", koem - .2, b, f"left:{gx}px;top:{ty - 56}px;font-size:30px;color:rgba(244,241,236,.6)"))
parts.append(note(a + .5, b, NOTE_CON, top=pv(1255, 760)))
scene(a, b, "\n".join(parts), "S")
sfx(klow, "swish"); sfx(koem, "tick")

# ═════════ 7. MIRYEO AX — 개발 중 (실제 개발 화면, 천천히 밀고 들어감) ═════════
a, b = T(6)
km = K("MIRYEO AX")
if v:
    br = browser(72, 640, 888, 560, [("pc_ax", a, b, [(a + .6, b, (230, 0, 1210), (240, 50, 1170))])], a + .4, b, a="card")
    tt = [el("h3 abs dim", "이 문제를 해결하기 위해", a + .2, b, "left:72px;top:250px"), el("h0 abs", "**MIRYEO AX**", km - .2, b, "left:72px;top:330px;font-size:120px", "up"),
          status("개발 중", km + .5, b, "left:72px;top:500px;font-size:40px")]
else:
    br = browser(860, 130, 940, 640, [("pc_ax", a, b, [(a + .6, b, (0, 0, 1440), (200, 30, 1240))])], a + .4, b, a="card")
    tt = [el("h3 abs dim", "이 문제를 해결하기 위해", a + .2, b, "left:120px;top:220px"), el("h0 abs", "**MIRYEO**\nAX", km - .2, b, "left:120px;top:300px;font-size:150px;line-height:1.02", "up"),
          status("개발 중", km + .5, b, "left:120px;top:640px;font-size:42px")]
scene(a, b, "\n".join(tt + [br, note(km, b, "실제 개발 화면 · " + NOTE_APP, top=pv(1240, 790), left=pv(72, 860), width=pv(888, 940))]))
sfx(km, "pop")

# ═════════ 8. 핵심 — 판매·재고·생산 데이터 + 고객의 구매 전 관심정보 → 연결 (흩어졌다 모임) ═════════
a, b = T(7)
kcu, kcn = K("고객의 구매 전"), K("연결하는 것")
cx, cy = (540, 800) if v else (960, 440)
toks = [("판매", -1, -1, a + .3, GOLD), ("재고", -1, 0, a + .55, GOLD), ("생산", -1, 1, a + .8, GOLD), ("고객 관심", 1, 0, kcu, SEC)]
parts = [eyebrow("핵심", a + .1, b, pv(240, 100))]
for k, (lab, sx, sy, tin, c) in enumerate(toks):
    ex, ey = (cx + sx * 360, cy + sy * 330) if v else (cx + sx * 640, cy + sy * 220)
    w_t = pv(250, 260)
    fx, fy = cx + sx * 360, cy + sy * 130          # 모인 뒤: 고리 바깥 · 칩 사이 20px (겹침 없음)
    dx, dy = fx - ex, fy - ey
    parts.append(f'<div class="node abs{" hi" if c == SEC else ""}" style="left:{ex - w_t / 2:.0f}px;top:{ey - 50:.0f}px;width:{w_t}px;--bc:{c};font-size:{pv(42, 44)}px" '
                 f'data-mv="{kcn - .2:.2f},{kcn + .7:.2f},0,0,{dx:.0f},{dy:.0f}" data-ease="q" {A(tin, b, "card")}>{esc(lab)}</div>')
parts.append(f'<div class="ring abs" style="left:{cx - 230}px;top:{cy - 230}px;width:460px;height:460px" {A(kcn, b, "scale")}></div>')
parts.append(hub("연결", cx, cy, pv(120, 120), kcn + .4, b, size=60))
parts.append(el("h3 abs center", "고객의 **구매 전 관심정보**까지", kcu + .3, b, f"left:0;right:0;top:{pv(1215, 720)}px;text-align:center;font-size:{pv(44, 46)}px"))
scene(a, b, "\n".join(parts))
sfx(kcn + .4, "pop")

# ═════════ 9. 롱테이크 — 고객 앱에서 관심 → 데이터 축적 → 판매·재고·생산 → 판단 지원 (이어지는 카메라 + 커서 클릭 + 버튼→카드) ═════════
a, b = T(8)
k_look, k_int, k_acc, k_link, k_design = K("어떤 상품을"), K("관심을 보이는지"), K("데이터를 축적"), K("이를 실제"), K("설계했습니다")
k_ex, k_up, k_sp, k_st, k_lt = K("예를 들어"), K("관심도가"), K("판매속도와 현재"), K("현재 재고"), K("추가 생산기간")
k_first, k_ch, k_help = K("먼저 생산"), K("어느 채널에"), K("판단을 돕는")
HIDE.append([a - .1, b])
VIEW = (1080, 1080) if v else (1920, 900)       # 카메라가 가운데로 잡는 영역 (자막 위)
OFFY = pv(220, 0)
# 세계 좌표
if v:
    PH = (330, 0); PB = (100, 1700); PC = (100, 3300); PD = (100, 4900); PW, PHH = 880, 760
else:
    PH = (0, 0); PB = (640, 70); PC = (1520, 70); PD = (2400, 70); PW, PHH = 760, 780
phw, phh = 420, 912
# 휴대폰 (고객용 MIRYEO AI Beauty 화면을 HTML로 다시 그림)
grid = [("ampoule-b", "앰플"), ("cream-i", "크림"), ("essence-a", "에센스"), ("toner-e", "토너")]
cards_ = ""
for k, (img_k, nm) in enumerate(grid):
    gx_, gy_ = 18 + (k % 2) * 186, 150 + (k // 2) * 290
    cards_ += (f'<div class="pcard" style="left:{gx_}px;top:{gy_}px;width:172px;height:270px" {("data-on=" + chr(34) + f"{k_look + .05:.2f}" + chr(34)) if k == 0 else ""}>'
               f'<img src="{P[img_k]}"><div class="nm">{nm}</div><div class="pr">MIRYEO</div></div>')
detail = (f'<div class="abs" style="left:0;top:64px;right:0;bottom:0;background:#fff" {A(k_look + .25, b, "up")}>'
          f'<img src="{P["ampoule-b"]}" style="width:100%;height:430px;object-fit:cover;object-position:center 40%;display:block">'
          f'<div style="padding:22px 26px"><div style="font-size:20px;font-weight:700;color:rgba(23,27,32,.5)">MIRYEO · 에센스/앰플</div><div style="font-size:34px;font-weight:800;margin-top:6px">앰플</div>'
          f'<div style="margin-top:14px;display:flex;gap:8px"><span style="padding:6px 14px;border-radius:999px;background:#f3ece2;font-size:18px;font-weight:700">추천 루틴</span><span style="padding:6px 14px;border-radius:999px;background:#f3ece2;font-size:18px;font-weight:700">구매처 3곳</span></div></div>'
          f'<div class="btn" style="left:24px;top:690px;width:180px;height:66px" data-press="{k_int + .25:.2f}" data-on="{k_int + .3:.2f}"><span class="hrt"></span>관심 저장</div>'
          f'<div class="btn dark" style="left:216px;top:690px;width:166px;height:66px">구매처 보기</div></div>')
phone_ = (f'<div class="phone" style="position:absolute;left:{PH[0]}px;top:{PH[1]}px;width:{phw}px;height:{phh}px"><div class="screen">'
          f'<div class="hd" style="height:64px;display:flex;align-items:center;padding:0 22px;font-weight:900;letter-spacing:.12em;font-size:20px;border-bottom:1px solid rgba(23,27,32,.08)">MIRYEO <span style="color:#c2513f;margin-left:8px;font-size:15px;letter-spacing:.18em">AI BEAUTY</span></div>'
          f'<div style="position:absolute;left:18px;top:84px;right:18px;height:46px;border-radius:999px;background:#f3ece2;font-size:18px;color:rgba(23,27,32,.45);display:flex;align-items:center;padding:0 20px">제품 · 고민으로 찾기</div>'
          f'{cards_}{detail}</div><div class="notch"></div></div>')
# 버튼 → 카드 (관심 신호)
bxw, byw = PH[0] + 14 + 24, PH[1] + 14 + 64 + 690           # 화면 안 버튼의 세계 좌표 (테두리 14)
mc = (PH[0] + phw + 40, PH[1] + 330, 360, 150) if not v else (PH[0] - 300, PH[1] + phh + 40, 360, 140)
morph = (f'<div class="morph" data-morph="{k_int + .45:.2f},.6,{bxw},{byw},180,66,{mc[0]},{mc[1]},{mc[2]},{mc[3]}" {A(k_int + .4, b, "fade")}>'
         f'<div style="padding:20px 24px" {A(k_int + 1.05, b, "up")}><div style="font-size:20px;font-weight:800;letter-spacing:.12em;color:#e8c995">관심 신호</div>'
         f'<div style="font-size:30px;font-weight:800;margin-top:8px">앰플 · 관심 저장</div><div style="font-size:20px;color:rgba(244,241,236,.6);margin-top:4px">국가 B · 예시</div></div></div>')
# 패널 B — 관심 데이터 축적
def panel(x, y, title, inner, tin):
    return f'<div class="panel" style="left:{x}px;top:{y}px;width:{PW}px;height:{PHH}px;padding:40px 44px" {A(tin, b, "card")}><div class="pt">{title}</div>{inner}</div>'
cty = [("국가 A", .42), ("국가 B", .48), ("국가 C", .30)]
binner = '<div style="margin-top:30px;font-size:26px;color:rgba(244,241,236,.6);font-weight:700">제품별 · 국가별 관심 (예시)</div>'
for k, (lab, fr) in enumerate(cty):
    grow_to = .9 if k == 1 else fr
    bw = PW - 88 - 140
    binner += (f'<div style="display:flex;align-items:center;margin-top:{26 if k else 22}px"><div style="width:140px;font-size:32px;font-weight:800">{lab}</div>'
               f'<div style="position:relative;flex:1;height:30px;border-radius:15px;background:rgba(255,255,255,.08);overflow:hidden">'
               f'<div style="position:absolute;left:0;top:0;bottom:0;border-radius:15px;background:{"linear-gradient(90deg,#b97935,#e8c995)" if k == 1 else "rgba(127,183,178,.8)"}" '
               f'data-w="{k_acc + .2 + k * .15:.2f},{k_acc + 1.1 + k * .15:.2f},0,{bw * fr:.0f}' + (f';{k_up:.2f},{k_up + 1.0:.2f},{bw * fr:.0f},{bw * grow_to:.0f}' if k == 1 else "") + '"></div></div></div>')
logs = [("조회", "앰플"), ("관심 저장", "앰플"), ("추천 확인", "크림"), ("구매처 확인", "앰플")]
binner += '<div style="margin-top:34px;font-size:26px;color:rgba(244,241,236,.6);font-weight:700">행동 기록</div>'
for k, (ev, pr) in enumerate(logs):
    binner += (f'<div style="display:flex;justify-content:space-between;margin-top:14px;padding:12px 18px;border-radius:14px;border:1.5px solid rgba(255,255,255,.12);font-size:26px;font-weight:700" {A(k_acc + .3 + k * .35, b, "up")}>'
               f'<span>{ev}</span><span style="color:#e8c995">{pr}</span></div>')
upTag = f'<div class="abs chip" style="left:{PB[0] + PW - 340}px;top:{PB[1] + 30}px;--c:{RED};font-size:34px;padding:10px 22px" {A(k_up + .3, b, "up")}>국가 B 관심도 ↑</div>'
# 패널 C — 판매·재고·생산 연결
rows = [("판매속도", k_sp + .2, "spark"), ("현재 재고", k_st + .2, "stock"), ("추가 생산기간", k_lt + .2, "lead")]
cinner = '<div style="margin-top:22px;font-size:26px;color:rgba(244,241,236,.6);font-weight:700">실제 판매 · 재고 · 생산정보에 연결</div>'
for k, (lab, tchk, kind) in enumerate(rows):
    if kind == "spark": vis_ = '<svg width="230" height="70" viewBox="0 0 230 70"><path d="M4,60 L50,52 L96,48 L142,34 L188,22 L226,8" fill="none" stroke="#7fb7b2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    elif kind == "stock": vis_ = '<div style="width:230px;height:26px;border-radius:13px;background:rgba(255,255,255,.08);overflow:hidden"><div style="width:42%;height:100%;background:rgba(127,183,178,.8);border-radius:13px"></div></div>'
    else: vis_ = '<div style="display:flex;gap:6px;width:230px"><div style="flex:1;height:26px;border-radius:8px;background:rgba(255,255,255,.14)"></div><div style="flex:3;height:26px;border-radius:8px;background:linear-gradient(90deg,#b97935,#d2a45f)"></div><div style="flex:1;height:26px;border-radius:8px;background:rgba(255,255,255,.14)"></div></div>'
    cinner += (f'<div style="display:flex;align-items:center;justify-content:space-between;margin-top:30px;padding:24px 26px;border-radius:20px;border:1.5px solid rgba(255,255,255,.12)">'
               f'<div style="font-size:34px;font-weight:800;width:220px">{lab}</div>{vis_}<span class="chk" data-on="{tchk:.2f}">✓</span></div>')
# 패널 D — 판단 지원
dinner = ('<div style="margin-top:22px;font-size:26px;color:rgba(244,241,236,.6);font-weight:700">어느 제품을 먼저 · 어느 채널에</div>'
          f'<div style="margin-top:28px;display:flex;gap:24px;align-items:center;padding:24px;border-radius:22px;border:1.5px solid {GB}" {A(k_first, b, "up")}>'
          f'<img src="{P["ampoule-b"]}" style="width:150px;height:150px;border-radius:16px;object-fit:cover;object-position:center 40%">'
          '<div><div style="font-size:24px;font-weight:800;letter-spacing:.1em;color:#e8c995">먼저 생산</div><div style="font-size:44px;font-weight:800;margin-top:6px">앰플</div></div></div>'
          f'<div style="margin-top:24px;display:flex;gap:24px;align-items:center;padding:24px;border-radius:22px;border:1.5px solid {GB}" {A(k_ch, b, "up")}>'
          '<div style="width:150px;height:150px;border-radius:16px;border:1.5px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:900;color:#7fb7b2">②</div>'
          '<div><div style="font-size:24px;font-weight:800;letter-spacing:.1em;color:#e8c995">공급 우선</div><div style="font-size:44px;font-weight:800;margin-top:6px">채널 ② · 국가 B</div></div></div>'
          f'<div style="margin-top:26px;font-size:24px;color:rgba(244,241,236,.55)" {A(k_help, b, "fade")}>판단을 돕는 정보 · 예시</div>')
# 연결선 (세계 좌표 SVG)
def conn(p, q, t0):
    return f'<path d="M{p[0]},{p[1]} L{q[0]},{q[1]}" fill="none" stroke="rgba(232,201,149,.7)" stroke-width="5" stroke-dasharray="14 12" data-draw="{t0:.2f},{t0 + .7:.2f}"/>'
if v:
    links = conn((540, phh + 10), (540, PB[1] - 10), k_acc - .4) + conn((540, PB[1] + PHH + 10), (540, PC[1] - 10), k_link - .2) + conn((540, PC[1] + PHH + 10), (540, PD[1] - 10), k_first - .4)
    WORLD_W, WORLD_H = 1080, PD[1] + PHH + 100
else:
    links = conn((phw + 10, 456), (PB[0] - 10, 456), k_acc - .4) + conn((PB[0] + PW + 10, 456), (PC[0] - 10, 456), k_link - .2) + conn((PC[0] + PW + 10, 456), (PD[0] - 10, 456), k_first - .4)
    WORLD_W, WORLD_H = PD[0] + PW + 100, 1000
cursor = ('<div class="cursor" data-cursor="' +
          (f"{k_look - .6:.2f},{k_look - .05:.2f},{PH[0] + 360},{PH[1] + 760},{PH[0] + 14 + 18 + 86},{PH[1] + 14 + 150 + 120};"
           f"{k_int - .5:.2f},{k_int + .2:.2f},{PH[0] + 14 + 18 + 86},{PH[1] + 14 + 150 + 120},{bxw + 90},{byw + 33}") +
          f'" {A(k_look - .7, k_acc - .2, "fade")}><svg width="40" height="40" viewBox="0 0 40 40"><path d="M6 3 L6 33 L14 25 L20 37 L25 35 L19 23 L30 23 Z" fill="#fff" stroke="#171b20" stroke-width="2.5" stroke-linejoin="round"/></svg></div>')
rip = (f'<div class="ripple" style="left:{PH[0] + 14 + 18 + 86}px;top:{PH[1] + 14 + 150 + 120}px" data-ripple="{k_look - .05:.2f}"></div>'
       f'<div class="ripple" style="left:{bxw + 90}px;top:{byw + 33}px" data-ripple="{k_int + .25:.2f}"></div>')
world_inner = (svg(links, a, b, WORLD_W, WORLD_H) + phone_ + morph +
               panel(PB[0], PB[1], "관심 데이터 축적", binner, k_acc - .5) + upTag +
               panel(PC[0], PC[1], "판매 · 재고 · 생산", cinner, k_link - .3) +
               panel(PD[0], PD[1], "판단 지원", dinner, k_first - .5) + cursor + rip)
# 카메라 정지점 (세계 x, y, 배율) — quintInOut 이동
cphone = (PH[0] + phw / 2, PH[1] + phh / 2)
cB, cC, cD = [(p[0] + PW / 2, p[1] + PHH / 2) for p in (PB, PC, PD)]
if v:
    zp, zpanel = 1.02, 1.0
    cBC = ((cB[0] + cC[0]) / 2, (cB[1] + cC[1]) / 2); zBC = .52
    stops = [(a, k_acc - .5, cphone, zp), (k_acc - .5, k_link - .4, cB, zpanel), (k_link - .4, k_design, cC, zpanel), (k_design, k_up + .6, cB, zpanel),
             (k_up + .6, k_first - .5, cC, zpanel), (k_first - .5, b, cD, zpanel)]
else:
    zp, zpanel = .72, 1.0
    cBC = ((cB[0] + cC[0]) / 2, cB[1]); zBC = .98
    cAll = (WORLD_W / 2 - 50, 470); zAll = .55
    stops = [(a, k_acc - .5, cphone, zp), (k_acc - .5, k_link - .4, (cB[0] - 120, cB[1]), zpanel), (k_link - .4, k_design, cBC, zBC),
             (k_design, k_first - .5, cBC, zBC), (k_first - .5, k_help - .1, cD, zpanel), (k_help - .1, b, cAll, zAll)]
cam = []
prev = stops[0]
for k, (t0, t1, c_, z_) in enumerate(stops):
    if k == 0: cam.append(f"{t0:.2f},{t0 + .01:.2f},{c_[0]:.0f},{c_[1]:.0f},{z_},{c_[0]:.0f},{c_[1]:.0f},{z_}"); continue
    pc_, pz = stops[k - 1][2], stops[k - 1][3]
    cam.append(f"{t0 - .45:.2f},{t0 + .45:.2f},{pc_[0]:.0f},{pc_[1]:.0f},{pz},{c_[0]:.0f},{c_[1]:.0f},{z_}")
    sfx(t0 - .3, "swish")
world = (f'<div class="world" style="width:{WORLD_W}px;height:{WORLD_H}px;top:{OFFY}px" data-view="{VIEW[0]},{VIEW[1]}" data-cam="{";".join(cam)}">{world_inner}</div>')
bar_ = (f'<div class="axbar" style="left:{BX}px;top:{pv(48, 22)}px;{"width:" + str(BW) + "px;" if v else ""}padding:{pv("18px 28px 16px", "12px 26px")}" {A(a, b, "fade")}><div style="display:flex;align-items:center;white-space:nowrap">'
        f'<span class="num" style="font-size:{pv(28, 26)}px">MIRYEO AX</span><span class="ttl" style="font-size:{pv(34, 32)}px">관심에서 판단까지</span></div>'
        + (f'<div class="sub" style="font-size:22px;margin-top:8px"><i></i>고객용 화면을 단순화해 다시 그림 · 예시</div>' if v else "") + '</div>')
if not v: bar_ = bar_.replace('</span></div></div>', f'</span><span class="sub" style="font-size:21px;margin-left:24px;padding-left:22px;border-left:1px solid rgba(255,255,255,.22)"><i></i>고객용 화면을 단순화해 다시 그림 · 예시</span></div></div>', 1)
scene(a, b, world + bar_, "D")
sfx(k_look - .05, "click"); sfx(k_int + .25, "click"); sfx(k_sp + .2, "tick")

# ═════════ 10. 기존 ERP vs MIRYEO AX — 분해도 (층이 들리며 지시선 라벨) ═════════
a, b = T(9)
kerp, kus, kdec, kboth = a, K("저희는 고객의"), K("생산·판매 의사결정"), K("AX와 플랫폼을")
ISO = "matrix(0.866,0.5,-0.866,0.5,0,0)"
def plate(x, y, s, fill, tin, lift=0, t_lift=None, label_dim=None):
    mv = f'data-mv="{t_lift:.2f},{t_lift + .9:.2f},0,0,0,{-lift}" data-ease="q"' if t_lift else ""
    return (f'<div class="abs" style="left:{x}px;top:{y}px" {mv} {A(tin, b, "fade")}>'
            f'<div class="plate" style="left:0;top:16px;width:{s}px;height:{s}px;transform:{ISO};background:rgba(0,0,0,.35);border-color:rgba(232,201,149,.25)"></div>'
            f'<div class="plate" style="left:0;top:0;width:{s}px;height:{s}px;transform:{ISO};background:{fill}"></div></div>')
s_ = pv(220, 230)
s_erp = pv(170, 230)
pw_ = 1.732 * s_
if v:
    ex, ey = 230, 300               # ERP 판 (작게, 왼쪽 위)
    ax_, ay_ = 400, 960             # AX 판 기준(맨 아래)
else:
    ex, ey = 440, 380
    ax_, ay_ = 1250, 610
parts = [eyebrow("기존 ERP와 무엇이 다른가", a + .1, b, pv(220, 96)),
         el("h3 abs", "기존 **ERP**", a + .2, b, f"left:{pv(440, 200)}px;top:{pv(310, 170)}px;font-size:{pv(48, 50)}px"),
         plate(ex, ey, s_erp, "linear-gradient(135deg,#2a3038,#1f242b)", a + .3),
         el("tag abs", "주문 · 재고를 기록하고 조회", a + .6, b, f"left:{pv(440, 200)}px;top:{pv(390, 640)}px;font-size:{pv(32, 32)}px;color:rgba(244,241,236,.7)")]
layers = [("① 고객 관심", "MIRYEO AI Beauty", "linear-gradient(135deg,#2c5f5c,#1e3f3d)"), ("② 판매", "채널별 판매속도", "linear-gradient(135deg,#3a3326,#2a251c)"),
          ("③ 재고 · 생산", "현재 재고 · OEM 기간", "linear-gradient(135deg,#3a3326,#2a251c)"), ("④ 의사결정 지원", "생산 · 공급 판단", "linear-gradient(135deg,#7a5a2c,#5a4220)")]
gap = pv(120, 110)
for k, (lab, sub, fill) in enumerate(layers):
    parts.append(plate(ax_, ay_, s_, fill, kus - .2 + k * .12, lift=k * gap, t_lift=kus + .2))
    ly_ = ay_ + s_ / 2 - k * gap
    lx0 = ax_ + pw_ / 2 + 10
    lx1 = lx0 + pv(80, 120)
    parts.append(svg(line(lx0, ly_, lx1, ly_, kus + 1.1 + k * .2, kus + 1.4 + k * .2, 3, "rgba(232,201,149,.7)"), kus + 1.1 + k * .2, b))
    parts.append(el("abs", f"**{lab}**<br><span style='font-size:{pv(24, 26)}px;color:rgba(244,241,236,.6)'>{esc(sub)}</span>", kus + 1.2 + k * .2, b,
                    f"left:{lx1 + 14}px;top:{ly_ - 34:.0f}px;font-size:{pv(34, 38)}px;font-weight:800;line-height:1.2", raw=True).replace(">**", ">").replace("**<br>", "<br>"))
parts.append(el("h3 abs", "**MIRYEO AX**", kus - .2, b, f"left:{pv(BX, 1060)}px;top:{pv(540, 170)}px;font-size:{pv(48, 50)}px"))
parts.append(el("h3 abs" + (" center" if v else ""), "관심에서 **생산·판매 의사결정**까지", kdec, b, f"left:{pv(0, 120)}px;{'right:0;text-align:center;' if v else ''}top:{pv(1215, 700)}px;font-size:{pv(42, 44)}px"))
parts.append(stagepill("AX + 플랫폼 함께", "#3f8585", kboth, b, f"left:{pv(400, 1060)}px;top:{pv(552, 250)}px;font-size:30px"))
scene(a, b, "\n".join(parts))
sfx(kus + .2, "swish")

# ═════════ 11. 특허 — 2026년 10월 · 1건 ═════════
a, b = T(10)
kp = K("특허 1건")
parts = [eyebrow("기술구조 · 특허", a + .1, b, pv(330, 150)),
         el("h2 abs", "이 기술구조로", a + .2, b, f"left:{BX}px;top:{pv(400, 220)}px;color:var(--ink2)"),
         f'<div class="doc xl abs" style="left:{pv(700, 1440)}px;top:{pv(430, 170)}px;width:{pv(230, 300)}px;height:{pv(300, 390)}px;transform:rotate(4deg)" {A(a + .3, b, "card", chr(100) + "ata-t=" + chr(34) + "rotate(4deg)" + chr(34))}></div>',
         f'<div class="abs" style="left:{pv(800, 1570)}px;top:{pv(640, 450)}px;width:{pv(110, 130)}px;height:{pv(110, 130)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e6c48c,#d2a45f 55%,#b97935);box-shadow:0 0 0 8px rgba(210,164,95,.2)" {A(kp, b, "scale")}></div>',
         el("h1 abs", "**특허 1건** 출원", kp - .3, b, f"left:{BX}px;top:{pv(490, 320)}px;font-size:{pv(100, 110)}px", "up"),
         chip("2026년 10월", a + .5, b, f"left:{BX}px;top:{pv(650, 490)}px", size=pv(44, 46)),
         patent(kp + .3, b, pv(54, 58), f"left:{BX}px;top:{pv(800, 620)}px")]
scene(a, b, "\n".join(parts))
sfx(kp, "tick")

# ═════════ 12. 역할 — 기술 기획·업무 설계는 대표자 주도 · 구현은 외부 전문개발사 협업 ═════════
a, b = T(11)
kme, kimp = a + .55, K("구현은")
if v:
    c1 = card("left:72px;top:330px;width:888px;height:330px;padding:44px", kme - .3, b,
              f'<div class="tag" style="color:#a96a27">기술 기획 · 업무 설계</div><div class="h2" style="margin-top:14px">대표자 <span class="acc">주도</span></div>', light=True)
    c2 = card("left:72px;top:820px;width:888px;height:330px;padding:44px", kimp - .2, b,
              f'<div class="tag" style="color:#3f8585">구현</div><div class="h2" style="margin-top:14px">외부 전문개발사<br><span class="acc">협업</span></div>', light=True)
    conn_ = svg(line(516, 670, 516, 810, kimp, kimp + .5, 5, "#b97935"), kimp, b)
else:
    c1 = card("left:120px;top:200px;width:780px;height:420px;padding:56px", kme - .3, b,
              f'<div class="tag" style="color:#a96a27">기술 기획 · 업무 설계</div><div class="h1" style="margin-top:18px;font-size:92px">대표자<br><span class="acc">주도</span></div>', light=True)
    c2 = card("left:1020px;top:200px;width:780px;height:420px;padding:56px", kimp - .2, b,
              f'<div class="tag" style="color:#3f8585">구현</div><div class="h1" style="margin-top:18px;font-size:84px">외부 전문개발사<br><span class="acc">협업</span></div>', light=True)
    conn_ = svg(line(910, 410, 1010, 410, kimp, kimp + .5, 5, "#b97935"), kimp, b)
scene(a, b, "\n".join([eyebrow("만드는 방식", a + .1, b, pv(260, 120)), c1, c2, conn_]), "L")
sfx(kimp, "pop")

# ═════════ 13. 지금 단계 — 초기 MVP ✓ → 실무 적용·수정·보완(진행 중) / 추가 개발 필요(자동연동 · 정확도 검증) ═════════
a, b = T(12)
kwork, kbut, kacc = K("실무에 적용"), K("다만 모든"), K("정확도 검증")
if v:
    n1 = card("left:72px;top:300px;width:888px;height:170px;padding:34px 40px", a + .2, b, '<div class="tag">완료</div><div class="h3" style="margin-top:8px">초기 <span class="acc">MVP</span> ✓</div>')
    n2 = card("left:72px;top:510px;width:888px;height:170px;padding:34px 40px", kwork - .2, b, '<div class="tag" style="color:var(--gold-soft)">진행 중</div><div class="h3" style="margin-top:8px">실무에 적용하며 <span class="acc">수정·보완</span></div>', gold=True)
    br = browser(72, 720, 888, 300, [("pc_prod", kwork, b, [(kwork + .3, b, (230, 80, 1210), (230, 260, 1210))])], kwork, kbut + .2, label="실무 적용 화면")
    d1 = box("left:72px;top:740px;width:888px;height:150px;padding:30px 40px;border-radius:28px;border:1.5px dashed rgba(232,201,149,.55)", kbut + .1, b, '<div class="tag" style="color:#ff8a70">추가 개발 필요</div><div class="h3" style="margin-top:8px;font-size:44px">모든 채널 <span class="acc">자동연동</span></div>')
    d2 = box("left:72px;top:920px;width:888px;height:150px;padding:30px 40px;border-radius:28px;border:1.5px dashed rgba(232,201,149,.55)", kacc - .1, b, '<div class="tag" style="color:#ff8a70">추가 개발 필요</div><div class="h3" style="margin-top:8px;font-size:44px">판단기능 <span class="acc">정확도 검증</span></div>')
    arr = svg(arrow(516, 474, 516, 506, kwork - .3, kwork, 5), kwork - .3, b)
else:
    n1 = card("left:120px;top:170px;width:470px;height:210px;padding:38px 40px", a + .2, b, '<div class="tag">완료</div><div class="h2" style="margin-top:10px;font-size:58px">초기 <span class="acc">MVP</span> ✓</div>')
    n2 = card("left:680px;top:170px;width:560px;height:210px;padding:38px 40px", kwork - .2, b, '<div class="tag" style="color:var(--gold-soft)">진행 중</div><div class="h3" style="margin-top:10px">실무에 적용하며<br><span class="acc">수정·보완</span></div>', gold=True)
    br = browser(1300, 150, 500, 340, [("pc_prod", kwork, b, [(kwork + .3, b, (230, 80, 1210), (230, 220, 1210))])], kwork + .2, b, label="실무 적용 화면")
    d1 = box("left:120px;top:470px;width:820px;height:190px;padding:36px 44px;border-radius:28px;border:1.5px dashed rgba(232,201,149,.55)", kbut + .1, b, '<div class="tag" style="color:#ff8a70">추가 개발 필요</div><div class="h3" style="margin-top:10px">모든 채널 <span class="acc">자동연동</span></div>')
    d2 = box("left:980px;top:470px;width:820px;height:190px;padding:36px 44px;border-radius:28px;border:1.5px dashed rgba(232,201,149,.55)", kacc - .1, b, '<div class="tag" style="color:#ff8a70">추가 개발 필요</div><div class="h3" style="margin-top:10px">판단기능 <span class="acc">정확도 검증</span></div>')
    arr = svg(arrow(600, 275, 670, 275, kwork - .3, kwork, 5), kwork - .3, b)
scene(a, b, "\n".join([eyebrow("지금 단계", a + .1, b, pv(240, 100)), n1, arr, n2, br, d1, d2, note(kwork, b, "실제 개발 화면 · " + NOTE_APP, top=pv(1255, 700))]), "S")
sfx(kbut, "pop")

# ═════════ 14. 수익모델 — 단계적 준비 (흐름선 배경 · 장 표지) ═════════
a, b = T(13)
cy = pv(800, 440)
scene(a, b, "\n".join([
    flow(19, a, b, (1.0, 1.04)),
    eyebrow("BUSINESS MODEL", a + .15, b, cy - pv(150, 150), left=0).replace(f"right:{W - BX - BW}px", "right:0;text-align:center"),
    el("h0 abs center", "**수익모델**", a + .3, b, f"left:0;right:0;top:{cy - pv(90, 90)}px;text-align:center;font-size:{pv(124, 140)}px"),
    el("h3 abs center dim", "단계적으로 준비", a + .6, b, f"left:0;right:0;top:{cy + pv(80, 90)}px;text-align:center"),
]))
sfx(a + .2, "swish")

# ═════════ 15. 1·2단계 — 자체 상품사업 + AX → 제휴 브랜드 유치 · 상품매출 + 플랫폼 거래수수료 (계단) ═════════
a, b = T(14)
k1, k2, k3 = a, K("MIRYEO 플랫폼에"), K("플랫폼 거래수수료")
if v:
    st1 = ("left:72px;top:760px;width:420px;height:420px;padding:34px", "STEP 1", "자체 상품사업에\n**AX 적용**", "재고관리 · 운영 의사결정 개선")
    st2 = ("left:540px;top:480px;width:420px;height:700px;padding:34px", "STEP 2", "MIRYEO 플랫폼\n**제휴 브랜드** 유치", "상품매출 + 플랫폼 거래수수료")
else:
    st1 = ("left:120px;top:400px;width:700px;height:360px;padding:40px 44px", "STEP 1", "자체 상품사업에 **AX 적용**", "재고관리 · 운영 의사결정 개선")
    st2 = ("left:880px;top:180px;width:920px;height:580px;padding:44px 48px", "STEP 2", "MIRYEO 플랫폼에\n**제휴 브랜드** 유치", "상품매출 + 플랫폼 거래수수료 확대")
parts = [eyebrow("수익모델 · 단계", a + .1, b, pv(240, 110))]
for (st, tag, ttl, sub), tin in ((st1, k1 + .2), (st2, k2 - .2)):
    parts.append(f'<div class="stair abs" style="{st}" {A(tin, b, "push")}><div class="tag" style="color:#a96a27">{tag}</div>'
                 f'<div class="h3" style="margin-top:12px;font-size:{pv(46, 50)}px;line-height:1.25">{em(ttl)}</div><div style="margin-top:14px;font-size:{pv(28, 30)}px;font-weight:700;color:rgba(23,27,32,.6)">{esc(sub)}</div></div>')
# 2단계 안: 매출 두 줄기
if v:
    parts.append(chip("**상품매출**", k3 - .3, b, "left:574px;top:860px", size=36)); parts.append(chip("**플랫폼 거래수수료**", k3, b, "left:574px;top:960px", c=SEC, size=32))
else:
    parts.append(chip("**상품매출**", k3 - .3, b, "left:928px;top:560px", size=40)); parts.append(chip("**플랫폼 거래수수료**", k3, b, "left:1210px;top:560px", c=SEC, size=40))
scene(a, b, "\n".join(parts), "L")
sfx(k2 - .2, "pop")

# ═════════ 16. 3단계 — 헤어·두피 케어 · 바디케어 · 홈뷰티 기기 (뷰티 중심 궤도) ═════════
a, b = T(15)
kh, kbd, khome = K("헤어·두피"), K("바디케어"), K("홈뷰티 기기")
cx, cy, R = (540, 690, 300) if v else (960, 410, 270)
parts = [eyebrow("STEP 3 · 상품군 확장", a + .1, b, pv(240, 100)),
         f'<div class="ring abs" style="left:{cx - R}px;top:{cy - R}px;width:{2 * R}px;height:{2 * R}px" {A(a + .2, b, "scale")}></div>',
         f'<div class="abs" style="left:{cx - 150}px;top:{cy - 110}px;width:300px" {A(a + .2, b, "scale")}><img src="{LINEUP}" class="fe" style="width:100%"></div>',
         el("h3 abs center", "**뷰티**", a + .4, b, f"left:{cx - 150}px;width:300px;top:{cy + 70}px;text-align:center;font-size:44px")]
sats = [("헤어·두피 케어", -150, kh), ("바디케어", -30, kbd), ("홈뷰티 기기", 90, khome)]
for lab, deg, tin in sats:
    x_ = cx + R * math.cos(math.radians(deg)); y_ = cy + R * math.sin(math.radians(deg))
    parts.append(f'<div class="orbit abs" style="left:{x_ - 11:.0f}px;top:{y_ - 11:.0f}px" {A(tin, b, "scale")}></div>')
    w_s = pv(280, 300)
    parts.append(node(f"**{lab}**", None, round(x_ - w_s / 2), round(y_ - 46 - pv(70, 64) * (1 if deg < 0 else -1)), w_s, tin, b, size=pv(38, 40)))
parts.append(el("h3 abs" + (" center" if v else ""), "뷰티와 밀접한 분야로\n**넓힐 수 있음**" if not v else "뷰티와 밀접한 분야로 **넓힐 수 있음**", khome + .6, b, f"left:{pv(0, 1340)}px;{'right:0;text-align:center;' if v else ''}top:{pv(1180, 560)}px;font-size:{pv(40, 42)}px"))
scene(a, b, "\n".join(parts))
sfx(kh, "tick")

# ═════════ 17. 장기 — 업력 5년 미만 중소형 화장품 업체 · 공통 기능 · 월 10만~30만 원대 SaaS (검토) — 눈금 막대 ═════════
a, b = T(16)
kyr, kfn, kpr, krev = K("업력"), K("주문·재고관리 같은"), K("10만"), K("검토하고")
if v:
    parts = [eyebrow("장기 · 검토 중", a + .1, b, 240), chip("**업력 5년 미만**", kyr, b, "left:72px;top:300px", size=40), chip("중소형 화장품 업체", kyr + .3, b, "left:72px;top:390px", c=SEC, size=40),
             card("left:72px;top:500px;width:888px;height:170px;padding:34px 40px", kfn, b, '<div class="tag">공통 기능</div><div class="h3" style="margin-top:8px">주문 · <span class="acc">재고관리</span></div>')]
    ax0, axy, axw = 120, 900, 800
else:
    parts = [eyebrow("장기 · 검토 중", a + .1, b, 100), chip("**업력 5년 미만**", kyr, b, "left:120px;top:160px", size=44), chip("중소형 화장품 업체", kyr + .3, b, "left:480px;top:160px", c=SEC, size=44),
             card("left:1180px;top:140px;width:620px;height:200px;padding:40px 44px", kfn, b, '<div class="tag">공통 기능</div><div class="h2" style="margin-top:10px;font-size:58px">주문 · <span class="acc">재고관리</span></div>')]
    ax0, axy, axw = 220, 520, 1480
# 눈금 막대 0~50만 원/월
tick_ = "".join(line(ax0 + axw * k / 5, axy - 14, ax0 + axw * k / 5, axy + 14, kpr - .8 + k * .05, kpr - .5 + k * .05, 3, "rgba(244,241,236,.5)") for k in range(6))
parts.append(svg(line(ax0, axy, ax0 + axw, axy, kpr - 1.0, kpr - .3, 4, "rgba(244,241,236,.5)") + tick_, kpr - 1.0, b))
for k in range(6):
    parts.append(el("tag abs", f"{k * 10}만" if k else "0", kpr - .6, b, f"left:{ax0 + axw * k / 5 - 30:.0f}px;top:{axy + 26}px;font-size:26px;color:rgba(244,241,236,.6);width:60px;text-align:center"))
band = box(f"left:{ax0 + axw * .2:.0f}px;top:{axy - 40}px;width:0px;height:80px;border-radius:16px;background:rgba(210,164,95,.28);border:1.5px solid {GB}", kpr, b, "", a="fade",
           extra=f'data-w="{kpr:.2f},{kpr + 1.0:.2f},0,{axw * .4:.0f}"')
parts.append(band)
parts.append(el("h2 abs", "월 **10만~30만 원대** SaaS", kpr + .6, b, f"left:{ax0 + axw * .2:.0f}px;top:{axy - pv(150, 140)}px;font-size:{pv(52, 60)}px"))
parts.append(stagepill("검토 단계", "#3f8585", krev, b, f"left:{pv(BX, 1560)}px;top:{pv(1080, 650)}px;font-size:30px"))
parts.append(note(a + .5, b, "SaaS는 장기적으로 검토 중인 방안입니다 · 금액은 대본 기준", top=pv(1255, 760)))
scene(a, b, "\n".join(parts), "S")
sfx(kpr, "tick")

# ═════════ 18. 분명히 해 둘 것 — 매출 자동 상승 아님 · 각 회사의 몫 · 고유 정보 공유 안 함 ═════════
a, b = T(17)
kauto, kown, knot = K("자동으로"), K("각 회사의"), K("공유하지")
rows3 = [(a + .3, "관리도구 → 매출 **자동 상승**", True, "×"), (K("제품 경쟁력") - .1, "제품 경쟁력 · 마케팅은 **각 회사의 몫**", False, "•"), (K("저희 고유의") - .1, "고유 고객정보 · 판매전략은 **공유하지 않음**", False, "🔒")]
parts = [eyebrow("분명히 해 둘 것", a + .1, b, pv(240, 110))]
for k, (tin, txt, strike, ic) in enumerate(rows3):
    y = pv(320 + k * 250, 190 + k * 190)
    inner = (f'<div style="display:flex;align-items:center;gap:26px"><div style="width:68px;height:68px;border-radius:50%;border:1.5px solid {GB};display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:{"#ff8a70" if strike else "#e8c995"}">{ic}</div>'
             f'<div class="h3" style="font-size:{pv(42, 48)}px;position:relative;display:inline-block">{em(txt)}' + (f'<span class="strike" style="background:#ff8a70;height:6px" data-strike="{kauto + .2:.2f}"></span>' if strike else "") + '</div></div>')
    parts.append(card(f"left:{BX}px;top:{y}px;width:{BW}px;height:{pv(210, 160)}px;padding:{pv('40px 40px', '42px 50px')}", tin, b, inner))
scene(a, b, "\n".join(parts))
sfx(kauto + .2, "pop")

# ═════════ 19. 지금 필요한 것 — 실제 데이터 연동 · 운영 판단기능 검증 · 기술 고도화 → 추가 개발자금 ═════════
a, b = T(18)
kd1, kd2, kd3, kfund = a, K("운영 판단기능"), K("기술 고도화"), K("추가 개발자금")
need = [("실제 데이터 **연동**", kd1 + .3), ("운영 판단기능 **검증**", kd2), ("기술 **고도화**", kd3)]
cx, cy = (540, 960) if v else (1400, 440)
parts = [eyebrow("지금 단계에 필요한 것", a + .1, b, pv(240, 100))]
for k, (txt, tin) in enumerate(need):
    x, y = (72, 320 + k * 150) if v else (120, 170 + k * 190)
    w_n = pv(560, 700)
    parts.append(node(txt, None, x, y, w_n, tin, b, size=pv(40, 44)))
    sx, sy = (x + w_n + 10, y + 50) if not v else (x + w_n / 2, y + 100)
    if not v: parts.append(svg(arrow(sx, sy, cx - 230, cy + (k - 1) * 40, kfund - .6 + k * .1, kfund - .1 + k * .1, 4), kfund - .6, b))
if v:
    parts.append(svg(arrow(540, 780, 540, 860, kfund - .5, kfund, 6), kfund - .5, b))
    parts.append(card("left:72px;top:880px;width:888px;height:260px;padding:50px", kfund - .1, b, '<div class="tag" style="color:var(--gold-soft)">지금 중요한 단계</div><div class="h1" style="margin-top:12px;font-size:86px"><span class="acc">추가 개발자금</span></div>', gold=True))
else:
    parts.append(card("left:1180px;top:260px;width:620px;height:360px;padding:56px", kfund - .1, b, '<div class="tag" style="color:var(--gold-soft)">지금 중요한 단계</div><div class="h1" style="margin-top:14px;font-size:92px;line-height:1.1"><span class="acc">추가<br>개발자금</span></div>', gold=True))
scene(a, b, "\n".join(parts), "S")
sfx(kfund, "tick")

# ═════════ 20. 새로운 성장모델 — 기존 사업 실적 + AX 기술 → 성장 곡선 (개념) ═════════
a, b = T(19)
kax2, kgm = K("AX 기술을 더해"), K("성장모델")
if v:
    c1 = box("left:72px;top:260px;width:888px;height:300px;padding:0;overflow:hidden;border-radius:28px;border:1.5px solid rgba(255,255,255,.16)", a + .2, b,
             f'<img src="{STORE_W}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35"><div style="position:absolute;left:40px;top:36px"><div class="tag" style="color:var(--gold-soft)">기존 사업의 실적</div>'
             f'<div class="h2" style="margin-top:10px;font-size:56px">2025 상품매출<br><span class="acc">약 4억 7천만 원</span></div></div>')
    c2 = card("left:72px;top:610px;width:888px;height:170px;padding:36px 40px", kax2 - .2, b, '<div class="tag" style="color:var(--gold-soft)">더하기</div><div class="h3" style="margin-top:8px"><span class="acc">AX 기술</span></div>', gold=True)
    gx0, gy0, gw, gh = 100, 830, 860, 330
else:
    c1 = box("left:120px;top:150px;width:720px;height:330px;padding:0;overflow:hidden;border-radius:28px;border:1.5px solid rgba(255,255,255,.16)", a + .2, b,
             f'<img src="{STORE_W}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35"><div style="position:absolute;left:44px;top:40px"><div class="tag" style="color:var(--gold-soft)">기존 사업의 실적</div>'
             f'<div class="h2" style="margin-top:10px">2025 상품매출<br><span class="acc">약 4억 7천만 원</span></div></div>')
    c2 = card("left:120px;top:520px;width:720px;height:190px;padding:40px 44px", kax2 - .2, b, '<div class="tag" style="color:var(--gold-soft)">더하기</div><div class="h2" style="margin-top:8px;font-size:60px"><span class="acc">AX 기술</span></div>', gold=True)
    gx0, gy0, gw, gh = 960, 160, 840, 520
pts = " L".join(f"{gx0 + u / 30 * gw:.1f},{gy0 + gh - (0.18 + 0.75 * (u / 30) ** 1.8) * gh:.1f}" for u in range(31))
g_ = (line(gx0, gy0 + gh, gx0 + gw, gy0 + gh, a + .3, a + .8, 3, "rgba(244,241,236,.35)") +
      path(f"M{gx0},{gy0 + gh - 0.18 * gh:.1f} L{gx0 + gw * .45:.1f},{gy0 + gh - 0.2 * gh:.1f}", a + .4, a + 1.4, 5, "rgba(244,241,236,.5)") +
      path("M" + pts, kax2, kgm + .6, 7, "var(--gold)"))
parts = [c1, c2, svg(g_, a + .3, b), el("h2 abs", "새로운 **성장모델**", kgm - .2, b, f"left:{pv(BX, gx0)}px;top:{pv(1180, 720)}px;font-size:{pv(56, 60)}px"),
         note(a + .5, b, PHOTO + " · 곡선은 개념도", top=pv(1265, 790))]
scene(a, b, "\n".join(parts))
sfx(kgm, "pop")

# ═════════ 21. 마무리 — 신용보증기금 스타트업지점 · 기술성·사업성 검토 / 감사합니다 (흐름선 배경) ═════════
a, b = T(20)
kt, kty = K("기술성과"), K("감사합니다")
cy = pv(760, 420)
parts = [flow(47, a, b, (1.02, 1.06)),
         el("h2 abs center", "**신용보증기금** 스타트업지점", a + .2, kty - .1, f"left:0;right:0;top:{cy - pv(200, 190)}px;text-align:center;font-size:{pv(60, 70)}px"),
         chip("**기술성**", kt, kty - .1, f"left:{pv(250, 700)}px;top:{cy - pv(60, 60)}px", size=46),
         chip("**사업성**", K("사업성을"), kty - .1, f"left:{pv(560, 1000)}px;top:{cy - pv(60, 60)}px", c=SEC, size=46),
         el("h3 abs center dim", "검토를 받고자 합니다", K("검토받고자"), kty - .1, f"left:0;right:0;top:{cy + pv(70, 70)}px;text-align:center"),
         el("h2 abs center", "주식회사 가연인터내셔널", kty, b, f"left:0;right:0;top:{cy - pv(150, 150)}px;text-align:center;font-size:{pv(58, 64)}px"),
         el("h1 abs center", "**감사합니다**", kty + .25, b, f"left:0;right:0;top:{cy - pv(30, 40)}px;text-align:center;font-size:{pv(100, 110)}px"),
         f'<div class="abs" style="left:0;right:0;top:{cy + pv(150, 140)}px;display:flex;justify-content:center" {A(kty + .5, b, "up")}>{patent(0, 0, pv(38, 36), "position:relative").replace(A(0, 0, "up"), "")}</div>']
scene(a, b, "\n".join(parts))
sfx(kty, "tick")

# ───────── 틀에 넣기 ─────────
subs_js = json.dumps([[s_["in"], s_["out"], s_["text"]] for s_ in SUBS], ensure_ascii=False)
tpl = open("comp.tpl.html").read()
out = (tpl.replace("<!--SCENES-->", "\n".join(scenes)).replace("/*SUBS*/", subs_js).replace("/*DUR*/", str(DUR))
          .replace("/*FMT*/", FMT).replace("/*LIGHT*/", json.dumps(LIGHT)).replace("/*HIDEBRAND*/", json.dumps(HIDE)).replace("<!--GUIDES-->", ""))
open(f"comp/comp_{FMT}.html", "w").write(out)
json.dump([round(x, 2) for x in B], open(f"out/bounds_{FMT}.json", "w"))
# 효과음 솎기 (가이드 §1-7): 우선순위 swish > click > tick > pop, 가까운 큐 제거 — 내레이션 영상이라 최소 간격을 넉넉히
pri = {"click": 0, "swish": 1, "tick": 2, "pop": 3}; gap_ = {"swish": 2.5, "click": .6, "tick": 1.6, "pop": 2.5}
keep = []
for t_, k_ in sorted(SFX, key=lambda q: (pri[q[1]], q[0])):
    if any(abs(t_ - q[0]) < max(gap_[k_], gap_[q[1]], 0.15) or (abs(t_ - q[0]) < 5.0 and k_ in ("tick", "pop")) for q in keep): continue
    keep.append([t_, k_])
keep.sort()
json.dump(keep, open(f"out/sfx_{FMT}.json", "w"))
print(FMT, "장면", len(scenes), "DUR", DUR, "효과음", len(SFX), "→", len(keep))
