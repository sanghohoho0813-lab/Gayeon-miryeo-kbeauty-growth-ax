# python3 sheet.py <dir> <prefix(h|v)> <tag> — 프레임 접촉 시트
import subprocess, glob, sys
D, F, TAG = sys.argv[1], sys.argv[2], sys.argv[3]
w, cols = (640, 3) if F == "h" else (300, 6)
fs = sorted(glob.glob(f"{D}/{F}_*.png"))
for part in range(0, len(fs), cols * 4):
    grp = fs[part:part + cols * 4]
    inp = sum([["-i", f] for f in grp], [])
    n = len(grp)
    while n % cols: n += 1
    fl = "".join(f"[{i}]scale={w}:-1,drawtext=text='{grp[i].split('_')[-1][:-4]}':x=8:y=8:fontsize=22:fontcolor=red:box=1[s{i}];" for i in range(len(grp)))
    for i in range(len(grp), n): fl += f"color=c=white:s={w}x{w*16//9 if F=='v' else w*9//16}[s{i}];"
    rows = []
    for r in range(n // cols):
        fl += "".join(f"[s{r*cols+c}]" for c in range(cols)) + f"hstack={cols}[r{r}];"; rows.append(f"[r{r}]")
    fl += "".join(rows) + (f"vstack={len(rows)}" if len(rows) > 1 else "null")
    out = f"sheet_{TAG}_{F}_{part//(cols*4)}.png"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inp, "-filter_complex", fl, "-frames:v", "1", out], check=True)
    print(out)
