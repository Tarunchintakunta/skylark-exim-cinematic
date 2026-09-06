"""Large container vessel with animatable container bay groups + reefer container + port transfer."""
import bpy, math, random
from _lib import *

def build_container(name, dims=(12.03, 2.44, 2.59), mat_=None, parent=None, loc=(0,0,0), reefer=False):
    p = P()
    root = empty(name, loc, parent=parent, size=0.5)
    body = box(name+"_Body", dims, (0, 0, dims[2]/2), mat_ or p['cont_blue'], root, bevel=0.03)
    # corrugation ribs
    n = 14
    for i in range(n):
        x = -dims[0]/2 + dims[0]*(i+0.5)/n
        for s in (1, -1):
            box(f"{name}_Rib{i}{s}", (0.05, 0.03, dims[2]*0.88), (x, s*(dims[1]/2+0.015), dims[2]/2),
                mat_ or p['cont_blue'], root)
    # door end
    box(name+"_DoorFrame", (0.06, dims[1]*1.005, dims[2]*1.005), (dims[0]/2, 0, dims[2]/2), p['steel_dark'], root)
    for s in (1, -1):
        d = empty(f"{name}_Door{'L' if s>0 else 'R'}Pivot", (dims[0]/2, s*dims[1]/2, dims[2]/2), parent=root)
        box(f"{name}_Door{'L' if s>0 else 'R'}", (0.05, dims[1]/2, dims[2]*0.96), (0.02, -s*dims[1]/4, 0),
            mat_ or p['cont_blue'], d)
        cyl(f"{name}_DoorRod{'L' if s>0 else 'R'}", 0.035, dims[2]*0.9, (0.06, -s*dims[1]*0.12, 0), p['steel'], d)
    if reefer:
        box(name+"_ReeferUnit", (0.45, dims[1]*0.92, dims[2]*0.82), (-dims[0]/2 - 0.2, 0, dims[2]/2), p['steel'], root, bevel=0.04)
        for i in range(3):
            cyl(f"{name}_ReeferGrille{i}", 0.30, 0.10, (-dims[0]/2 - 0.44, (i-1)*0.7, dims[2]*0.62),
                p['steel_dark'], root, rot=(0, math.radians(90), 0), segs=14)
        box(name+"_ReeferDisplay", (0.03, 0.44, 0.26), (-dims[0]/2 - 0.44, 0.0, dims[2]*0.30), p['screen'], root)
        text_mesh(name+"_ReeferTemp", "-20 C", 0.13, p['screen'], (-dims[0]/2 - 0.47, 0.0, dims[2]*0.30),
                  root, (math.radians(90), 0, math.radians(-90)))
    # seal bar (drops on scroll)
    sb = empty(name+"_SealBarPivot", (dims[0]/2 + 0.09, 0, dims[2]*0.55), parent=root)
    box(name+"_SealBar", (0.06, dims[1]*0.5, 0.10), (0, 0, 0), p['orange'], sb)
    return root

def build():
    reset_scene()
    p = P()
    root = empty("ContainerVessel", (0, 0, 0))
    L, B = 240.0, 34.0
    def prof(t):
        z = math.sin(t)
        return (1.0, 1.0 if z > -0.3 else 0.55)
    secs = [(-L*0.50, 4.0, 8.0, 0.0), (-L*0.46, 11.0, 11.5, 0.0), (-L*0.38, 15.5, 12.5, 0.0),
            (-L*0.20, 17.0, 13.0, 0.0), (0.0, 17.0, 13.0, 0.0), (L*0.20, 17.0, 13.0, 0.0),
            (L*0.34, 15.5, 13.0, 0.4), (L*0.43, 11.0, 13.0, 1.2), (L*0.48, 5.0, 12.8, 2.4), (L*0.50, 0.8, 12.4, 3.6)]
    loft("CV_Hull", secs, p['hull_red'], parent=root, segs=24, profile=prof)
    loft("CV_Topside", [(x, hw*1.004, hh*0.22, zc + hh*0.86) for (x, hw, hh, zc) in secs],
         p['hull_blue'], parent=root, segs=24, cap=False)
    deck_pts = [(x, hw*0.99) for (x, hw, _h, _z) in secs]
    poly_extrude("CV_Deck", deck_pts + [(x, -hw) for x, hw in reversed(deck_pts)], 0.5,
                 p['steel_dark'], loc=(0, 0, 13.0), parent=root, axis='Z')
    # accommodation block aft
    acc = empty("CV_Accommodation", (-L*0.36, 0, 13.5), parent=root)
    box("CV_AccBlock", (16.0, 22.0, 22.0), (0, 0, 11.0), p['hull_white'], acc, bevel=0.2)
    for i in range(6):
        box(f"CV_AccWindows{i}", (16.2, 22.2, 0.9), (0, 0, 3.5 + i*3.2), p['glass'], acc)
    box("CV_Bridge", (18.0, 26.0, 3.6), (0, 0, 23.5), p['hull_white'], acc, bevel=0.2)
    box("CV_BridgeGlass", (18.3, 26.3, 1.6), (0, 0, 23.9), p['glass'], acc)
    cyl("CV_Funnel", 3.4, 12.0, (-6.0, 0, 30.0), p['hull_blue'], acc, segs=18)
    cyl("CV_FunnelCap", 3.8, 0.8, (-6.0, 0, 36.4), p['steel_dark'], acc, segs=18)
    cyl("CV_Mast", 0.5, 14.0, (5.0, 0, 32.0), p['steel'], acc, segs=10)
    # container bays (animatable groups)
    cols = [-13.5, -9.0, -4.5, 0.0, 4.5, 9.0, 13.5]
    mats = [p['cont_blue'], p['cont_red'], p['cont_green'], p['cont_grey'], p['reefer']]
    random.seed(7)
    bays = []
    for b, bx in enumerate([-88, -74, -60, -46, -32, -18, -4, 10, 24, 38, 52, 66, 80, 94]):
        bay = empty(f"CV_Bay{b:02d}", (bx, 0, 13.5), parent=root, size=2)
        bays.append(bay)
        edge = abs(bx) / 100.0
        for ci, c in enumerate(cols):
            if abs(c) > 13.5 * (1.0 - edge * 0.55): continue
            h = (5 if abs(bx) < 60 else 4) - (1 if abs(c) > 9 else 0)
            for k in range(h):
                m = mats[random.randrange(len(mats))]
                box(f"CV_Cont_{b}_{ci}_{k}", (12.03, 2.44, 2.59), (0, c, 1.3 + k*2.62), m, bay, bevel=0.04)
        # subtle per-bay settle animation for scroll
    # lashing bridges
    for b, bx in enumerate([-88, -60, -32, -4, 24, 52, 80]):
        box(f"CV_Lashing{b}", (0.6, 30.0, 5.4), (bx + 7.0, 0, 16.0), p['steel_dark'], root)
    # bow/stern detail
    box("CV_Forecastle", (14.0, 22.0, 3.0), (L*0.42, 0, 14.6), p['hull_white'], root, bevel=0.2)
    cyl("CV_BulbousBow", 3.2, 9.0, (L*0.50, 0, 3.0), p['hull_red'], root, rot=(0, math.radians(90), 0), segs=16)
    empty("Pivot_CV_Wake", (-L*0.52, 0, 1.0), parent=root, size=3)
    empty("Pivot_CV_Roll", (0, 0, 6.0), parent=root, size=4)
    return root
