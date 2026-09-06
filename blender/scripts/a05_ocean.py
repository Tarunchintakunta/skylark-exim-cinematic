"""Fishing nets & ropes, onboard chilled storage."""
import bpy, math
from _lib import *

def net_sheet(name, w, h, cells, sag, parent, loc=(0,0,0), rot=(0,0,0), m=None, r=0.018):
    p = P(); m = m or p['net']
    grp = empty(name, loc, rot, parent, 0.3)
    for i in range(cells + 1):
        u = i / cells
        pts = []
        for j in range(cells + 1):
            v = j / cells
            x = (u - 0.5) * w
            y = (v - 0.5) * h
            z = -sag * math.sin(math.pi * u) * math.sin(math.pi * v) * 4 * u * (1 - u) * 2
            pts.append((x, y, -abs(sag) * (math.sin(math.pi*u) * math.sin(math.pi*v))))
        curve_tube(f"{name}_U{i}", pts, r, m, parent=grp, res=4, bevel_res=2)
    for j in range(cells + 1):
        v = j / cells
        pts = []
        for i in range(cells + 1):
            u = i / cells
            pts.append(((u - 0.5) * w, (v - 0.5) * h, -abs(sag) * (math.sin(math.pi*u) * math.sin(math.pi*v))))
        curve_tube(f"{name}_V{j}", pts, r, m, parent=grp, res=4, bevel_res=2)
    return grp

def build_nets():
    reset_scene(); p = P()
    root = empty("FishingNetsAndRopes", (0, 0, 0))
    # 1. folded deck net
    folded = empty("Net_FoldedDeck", (0, -6.0, 0), parent=root)
    for i in range(4):
        sphere(f"NetFold{i}", 0.9, (i * 0.85 - 1.3, 0, 0.35 + (i % 2) * 0.12), p['net'], folded, 14, 8, (1.0, 2.2, 0.42))
    # 2. cast net (open, animatable scale)
    cast = empty("Net_Cast", (0, 0, 0), parent=root)
    net_sheet("CastNetSheet", 7.0, 7.0, 9, 2.6, cast)
    torus("CastNetRing", 3.5, 0.07, (0, 0, 0), p['rope'], cast, segs=32, rings=6)
    for i in range(12):
        a = 2 * math.pi * i / 12
        sphere(f"NetWeight{i}", 0.11, (3.5 * math.cos(a), 3.5 * math.sin(a), -0.05), p['steel_dark'], cast, 8, 6)
    keyframe(cast, "scale", [(1, (0.15, 0.15, 0.4)), (55, (1.0, 1.0, 1.0)), (120, (1.05, 1.05, 1.1))], 'BEZIER')
    # 3. trawl net cone underwater
    trawl = empty("Net_Trawl", (0, 7.5, -1.0), parent=root)
    rings = [(0.0, 3.2), (-2.0, 2.9), (-4.2, 2.2), (-6.0, 1.4), (-7.4, 0.7), (-8.2, 0.35)]
    for i, (x, r) in enumerate(rings):
        torus(f"TrawlRing{i}", r, 0.03, (x, 0, 0), p['net'], trawl, rot=(0, math.radians(90), 0), segs=20, rings=5)
    for k in range(14):
        a = 2 * math.pi * k / 14
        pts = [(x, r * math.cos(a), r * math.sin(a)) for x, r in rings]
        curve_tube(f"TrawlLine{k}", pts, 0.022, p['net'], parent=trawl, res=4, bevel_res=2)
    # 4. rope coils + net line
    for i, y in enumerate((-3.0, -1.5)):
        torus(f"RopeCoilA{i}", 0.62, 0.055, (4.0, y, 0.12), p['rope'], root, segs=22, rings=6)
        torus(f"RopeCoilB{i}", 0.48, 0.055, (4.0, y, 0.24), p['rope'], root, segs=22, rings=6)
    curve_tube("NetLine", [(-6, 4.0, 3.5), (-2, 4.0, 1.2), (2, 4.0, -0.6), (6, 4.0, -1.6)], 0.045, p['rope'], parent=root)
    for i in range(8):
        sphere(f"Float{i}", 0.20, (-6 + i * 1.7, 5.4, 0.0), p['orange'], root, 10, 8)
    empty("Pivot_NetOpen", (0, 0, 0), parent=root, size=1.0)
    return root

def build_chilled_storage():
    reset_scene(); p = P()
    root = empty("OnboardChilledStorage", (0, 0, 0))
    W, D, H = 6.0, 5.0, 3.0
    # insulated hold shell
    box("Hold_Floor", (W, D, 0.15), (0, 0, -0.07), p['crate_white'], root)
    for s in (1, -1):
        box(f"Hold_WallY{s}", (W, 0.18, H), (0, s * D / 2, H / 2), p['crate_white'], root)
        box(f"Hold_WallX{s}", (0.18, D, H), (s * W / 2, 0, H / 2), p['crate_white'], root)
    box("Hold_Ceiling", (W, D, 0.16), (0, 0, H), p['crate_white'], root)
    # hatch with pivot in ceiling
    hp = empty("Hold_HatchPivot", (-1.4, 0, H + 0.09), parent=root)
    box("Hold_Hatch", (2.8, 2.4, 0.14), (1.4, 0, 0), p['steel'], hp, bevel=0.03)
    keyframe(hp, "rotation_euler", [(1, (0, 0, 0)), (45, (0, -1.2, 0)), (95, (0, -1.2, 0)), (120, (0, 0, 0))], 'BEZIER')
    # insulated compartments
    for i in range(3):
        for j in range(2):
            c = empty(f"Compartment{i}{j}", (i * 1.85 - 1.85, j * 2.2 - 1.1, 0), parent=root)
            box(f"CompWall{i}{j}", (1.7, 2.0, 1.0), (0, 0, 0.5), p['stainless'], c, bevel=0.03)
            box(f"CompIce{i}{j}", (1.55, 1.85, 0.45), (0, 0, 0.75), p['ice'], c)
            for k in range(3):
                cyl(f"IceLump{i}{j}{k}", 0.13, 0.10, (k * 0.42 - 0.42, (k % 2) * 0.5 - 0.25, 1.0), p['ice'], c, segs=8)
    # fish stowed in ice
    import a04_products as PR
    # stowed on their flanks with the dark backs facing the hatch, the way a
    # crew lands them so the belly never takes the weight
    PR.tuna(root, (-1.55, -0.95, 1.05), (math.radians(90), 0, math.radians(14)), "Hold_Tuna1")
    PR.tuna(root, (0.35, 1.05, 1.05), (math.radians(90), 0, math.radians(-9)), "Hold_Tuna2")
    PR.swordfish(root, (1.85, -0.85, 1.06), (math.radians(90), 0, math.radians(26)), "Hold_Swordfish")
    # temperature panel
    panel = empty("Hold_Panel", (W / 2 - 0.12, 1.6, 1.8), (0, 0, math.radians(180)), root)
    box("PanelBody", (0.08, 1.0, 0.7), (0, 0, 0), p['steel_dark'], panel, bevel=0.02)
    box("PanelScreen", (0.02, 0.86, 0.30), (-0.06, 0, 0.14), p['screen'], panel)
    text_mesh("PanelTemp", "-1.0 C", 0.15, p['screen'], (-0.08, 0, 0.14), panel, (math.radians(90), 0, math.radians(-90)))
    text_mesh("PanelLot", "LOT BOB-1142", 0.08, p['screen'], (-0.08, 0, -0.14), panel, (math.radians(90), 0, math.radians(-90)))
    # ladder + crew
    for i in range(6):
        cyl(f"Rung{i}", 0.035, 0.6, (-W / 2 + 0.35, 0, 0.3 + i * 0.45), p['steel'], root, rot=(math.radians(90), 0, 0), segs=8)
    for s in (1, -1):
        cyl(f"LadderRail{s}", 0.04, 2.9, (-W / 2 + 0.35, s * 0.3, 1.45), p['steel'], root, segs=8)
    figure("Hold_Crew", 'carry', p['coat_white'], root, (2.2, 1.8, 0.0), (0, 0, math.radians(-140)), coat=True)
    for i in range(4):
        cyl(f"HoldLamp{i}", 0.16, 0.06, ((i % 2) * 3.0 - 1.5, (i // 2) * 2.4 - 1.2, H - 0.12), p['lamp'], root, segs=12)
    empty("Pivot_Storage_Camera", (0, -3.0, 1.6), parent=root, size=0.6)
    return root
