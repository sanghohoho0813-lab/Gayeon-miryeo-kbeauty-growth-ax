#  crop_products.py — 회사소개서 제품 라인업 사진(p41_01)에서 '럭셔리 크림' 한 개만 잘라 company/prod/luxury.png 로 저장 (V2 장면 7)
#  골드 아이패치(p01_04)·골드 사각 크림(p10_05)은 원래 배경이 투명한 단독 사진이라 그대로 쓴다.
import pymupdf as f
src = f.Pixmap("company/img/p41_01_1694x984.png")
x0, y0, x1, y1 = 228, 661, 462, 886          # 옆 제품이 섞이지 않는 범위
p = f.Pixmap(f.csRGB, f.IRect(0, 0, x1 - x0, y1 - y0), 1); p.set_origin(x0, y0); p.clear_with(0)
p.copy(src, f.IRect(x0, y0, x1, y1)); p.set_origin(0, 0); p.save("company/prod/luxury.png")
