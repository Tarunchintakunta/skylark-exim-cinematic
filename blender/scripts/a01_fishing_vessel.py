"""Large Indian fishing vessel — deck, wheelhouse, hold hatch, gantry, crates, nets, crew."""
import bpy, math
from _lib import *
from mathutils import Vector

def build():
    reset_scene()
    p = P()
    root = empty("FishingVessel", (0, 0, 0))

    L, B, D = 34.0, 8.6, 4.4      # LOA, beam, depth
    # ---- hull: lofted sections along +X (bow at +X)
    def hull_profile(t):
        # flatten the bottom slightly -> workboat section
        z = math.sin(t)
        return (1.0, 1.0 if z > -0.35 else 0.72)
    secs = [
        (-L*0.50, 1.25, 1.05, 0.0),
        (-L*0.46, 2.55, 1.75, 0.0),
        (-L*0.35, 3.70, 2.05, 0.0),
        (-L*0.18, 4.28, 2.18, 0.0),
        ( 0.00,   4.30, 2.20, 0.0),
        ( L*0.18, 4.15, 2.20, 0.05),
        ( L*0.32, 3.55, 2.20, 0.15),
        ( L*0.42, 2.45, 2.20, 0.32),
        ( L*0.48, 1.15, 2.15, 0.52),
        ( L*0.50, 0.22, 2.05, 0.72),
    ]
    hull = loft("Hull", secs, p['hull_blue'], parent=root, segs=26, profile=hull_profile)
    # white topsides band
    band_secs = [(x, hw*1.005, hh*1.005, zc) for (x, hw, hh, zc) in secs]
    topside = loft("HullTopside", [(x, hw, hh*0.30, zc + hh*0.80) for (x, hw, hh, zc) in band_secs],
                   p['hull_white'], parent=root, segs=26, cap=False)
    # deck
    deck_pts = []
    for (x, hw, _hh, _zc) in secs:
        deck_pts.append((x, hw*0.985))
    dk = []
    for x, hw in deck_pts: dk.append((x, hw))
    pts = [(x, hw) for x, hw in dk] + [(x, -hw) for x, hw in reversed(dk)]
    deck = poly_extrude("Deck", pts, 0.22, p['deck'], loc=(0, 0, 2.30), parent=root, axis='Z')
    # bulwark rail
    for s in (1, -1):
        rail_pts = [(x, s*hw*0.99, 2.95) for (x, hw, _h, _z) in secs]
        curve_tube(f"Bulwark_{'P' if s>0 else 'S'}", rail_pts, 0.07, p['steel'], parent=root)
        wall = []
        for (x, hw, _h, _z) in secs:
            wall.append((x, hw*0.99))
        # bulwark plate
        bm_pts = [(x, 2.42) for x, _ in wall] + [(x, 2.95) for x, _ in reversed(wall)]
        pe = poly_extrude(f"BulwarkPlate_{'P' if s>0 else 'S'}", bm_pts, 0.09, p['hull_white'],
                          loc=(0, 0, 0), parent=root, axis='Y')
        # bend it to follow sheer: approximate by scaling in Y per-vertex
        me = pe.data
        for v in me.vertices:
            # map by nearest section
            best = min(secs, key=lambda s2: abs(s2[0] - v.co.x))
            v.co.y = s * best[1] * 0.99 + (v.co.y * 0.5)

    # ---- superstructure / wheelhouse (aft third)
    sup = empty("Superstructure", (-L*0.30, 0, 2.52), parent=root)
    box("DeckHouse", (7.6, 6.4, 2.7), (0, 0, 1.35), p['hull_white'], sup, bevel=0.08)
    box("DeckHouseTrim", (7.7, 6.5, 0.14), (0, 0, 2.72), p['hull_blue'], sup)
    wh = empty("Wheelhouse", (0.6, 0, 2.80), parent=sup)
    box("WheelhouseBody", (4.6, 5.0, 2.35), (0, 0, 1.18), p['hull_white'], wh, bevel=0.08)
    box("WheelhouseGlassF", (0.10, 4.4, 1.15), (2.32, 0, 1.55), p['glass'], wh)
    for s in (1, -1):
        box(f"WheelhouseGlass{'P' if s>0 else 'S'}", (3.6, 0.10, 1.05), (0, s*2.52, 1.55), p['glass'], wh)
    box("WheelhouseRoof", (4.9, 5.3, 0.16), (0, 0, 2.42), p['hull_white'], wh, bevel=0.05)
    # mast + radar + nav lights
    mast = empty("Mast", (0, 0, 2.50), parent=wh)
    cyl("MastPole", 0.13, 4.6, (0, 0, 2.3), p['steel'], mast)
    cyl("MastArm", 0.07, 3.2, (0, 0, 3.5), p['steel'], mast, rot=(math.radians(90), 0, 0))
    box("RadarScanner", (0.35, 1.9, 0.20), (0, 0, 4.75), p['hull_white'], mast, bevel=0.05)
    cyl("RadomeBase", 0.22, 0.35, (0, 0, 4.5), p['steel_dark'], mast)
    for s, m in ((1, mat("NavGreen", (0.1,0.6,0.2), 0, .3, (0.2,1,0.35), 5)), (-1, mat("NavRed", (0.6,0.1,0.1), 0, .3, (1,0.25,0.2), 5))):
        sphere(f"NavLight{'P' if s>0 else 'S'}", 0.11, (0, s*1.55, 3.5), m, mast, 10, 8)
    cyl("Funnel", 0.42, 1.5, (-2.0, 0, 1.6), p['hull_blue'], wh, segs=16)
    cyl("FunnelCap", 0.48, 0.16, (-2.0, 0, 2.4), p['steel_dark'], wh, segs=16)

    # ---- working deck: gantry, winches, hatch
    gan = empty("Gantry", (L*0.02, 0, 2.42), parent=root)
    for s in (1, -1):
        cyl(f"GantryLeg{'P' if s>0 else 'S'}", 0.16, 4.6, (0, s*3.7, 2.3), p['orange'], gan)
    cyl("GantryBeam", 0.16, 7.4, (0, 0, 4.6), p['orange'], gan, rot=(math.radians(90), 0, 0))
    cyl("GantryBrace", 0.09, 7.0, (0.9, 0, 3.4), p['orange'], gan, rot=(math.radians(90), 0, 0))
    for s in (1, -1):
        # net drum / winch (animatable pivot)
        w = empty(f"Winch{'P' if s>0 else 'S'}", (-2.6, s*2.6, 3.0), parent=root)
        cyl(f"WinchDrum{'P' if s>0 else 'S'}", 0.55, 1.5, (0, 0, 0), p['steel_dark'], w, rot=(math.radians(90), 0, 0), segs=18)
        for e in (1, -1):
            cyl(f"WinchFlange{'P' if s>0 else 'S'}{e}", 0.78, 0.10, (0, e*0.78, 0), p['orange'], w, rot=(math.radians(90), 0, 0), segs=18)
        # rolled net on drum
        cyl(f"WinchNet{'P' if s>0 else 'S'}", 0.72, 1.35, (0, 0, 0), p['net'], w, rot=(math.radians(90), 0, 0), segs=18)

    # storage hatch (pivoting lid -> onboard chilled hold)
    hatch = empty("HoldHatch", (L*0.16, 0, 2.44), parent=root)
    box("HatchCoaming", (3.4, 3.0, 0.28), (0, 0, 0.14), p['steel'], hatch)
    lid_piv = empty("HatchLidPivot", (-1.7, 0, 0.30), parent=hatch)
    box("HatchLid", (3.4, 3.0, 0.14), (1.7, 0, 0.07), p['hull_white'], lid_piv, bevel=0.03)
    box("HatchLidRib", (0.12, 2.9, 0.10), (1.7, 0, 0.17), p['steel'], lid_piv)
    keyframe(lid_piv, "rotation_euler", [(1, (0, 0, 0)), (40, (0, -1.15, 0)), (90, (0, -1.15, 0)), (120, (0, 0, 0))], 'BEZIER')
    # dark hold interior visible when open
    box("HoldInterior", (3.2, 2.85, 1.6), (L*0.16, 0, 1.65), p['steel_dark'], root)
    box("HoldIce", (3.0, 2.7, 0.5), (L*0.16, 0, 2.05), p['ice'], root)

    # deck crates
    crates = empty("DeckCrates", (0, 0, 2.42), parent=root)
    src = box("CrateProto", (1.05, 0.72, 0.46), (-100, 0, 0), p['crate_blue'], crates, bevel=0.04)
    n = 0
    for row, (cx, cy) in enumerate([(-7.0, 2.4), (-7.0, -2.4), (-8.3, 2.4), (-8.3, -2.4),
                                    (6.5, 2.7), (6.5, -2.7), (7.8, 2.7), (7.8, -2.7), (9.0, 0.0)]):
        for k in range(2 if row % 3 else 3):
            n += 1
            instance(f"Crate{n:02d}", src, (cx, cy, 0.25 + k*0.48), (0, 0, 0.05*(k-1)), parent=crates)
    src.location = (-7.0, 0.0, 0.25)
    # ice boxes (white)
    srcw = box("IceBoxProto", (1.25, 0.85, 0.60), (2.0, 3.0, 0.32), p['crate_white'], crates, bevel=0.05)
    for i, (cx, cy) in enumerate([(2.0, -3.0), (3.6, 3.0), (3.6, -3.0)]):
        instance(f"IceBox{i}", srcw, (cx, cy, 0.32), parent=crates)

    # folded net pile + rope coils on deck
    nets = empty("DeckNets", (-4.5, 0, 2.55), parent=root)
    for i in range(3):
        sphere(f"NetPile{i}", 0.95, (i*1.1 - 1.1, (i%2)*1.6 - 0.8, 0.25), p['net'], nets, 14, 8, (1.3, 1.0, 0.35))
    for i, (cx, cy) in enumerate([(1.0, 3.4), (1.0, -3.4)]):
        torus(f"RopeCoil{i}", 0.55, 0.09, (cx, cy, 2.55), p['rope'], root, segs=20, rings=8)

    # tyre fenders
    for i, x in enumerate([-11.0, -7.5, -4.0, 0.0, 4.0, 7.5]):
        for s in (1, -1):
            hw = max(0.4, min(sec[1] for sec in secs if abs(sec[0]-x) < 6.0) if False else 4.1)
            torus(f"Fender{i}{'P' if s>0 else 'S'}", 0.42, 0.14, (x, s*4.25, 2.05), p['rubber'], root,
                  rot=(0, math.radians(90), 0), segs=14, rings=8)

    # gangway to dock
    gw = empty("Gangway", (-L*0.10, 4.3, 2.4), parent=root)
    box("GangwayPlank", (5.2, 1.0, 0.09), (0, 2.4, -0.9), p['steel'], gw, rot=(math.radians(-19), 0, 0))
    for s in (1, -1):
        curve_tube(f"GangwayRail{'P' if s>0 else 'S'}",
                   [(-2.5, 0.0 + s*0.42, 0.95), (0, 2.4 + s*0.42, 0.10), (2.5, 4.7 + s*0.42, -0.75)],
                   0.035, p['steel'], parent=gw)

    # crew
    crew = empty("Crew", (0, 0, 2.53), parent=root)
    figure("Crew_Boarding", 'walk_crate', p['shirt_orange'], crew, (-4.4, 3.6, 0), (0, 0, math.radians(-100)))
    figure("Crew_Rope", 'rope', p['shirt_teal'], crew, (1.2, 3.2, 0), (0, 0, math.radians(160)))
    figure("Crew_Net", 'net_cast', p['shirt_blue'], crew, (-2.2, -3.0, 0), (0, 0, math.radians(-70)))
    figure("Crew_Carry", 'carry', p['shirt_orange'], crew, (6.2, 1.4, 0), (0, 0, math.radians(15)))
    figure("Crew_Deck", 'stand', p['shirt_teal'], crew, (8.6, -2.0, 0), (0, 0, math.radians(120)))

    # motion pivots for the web app
    empty("Pivot_Roll", (0, 0, 1.2), parent=root, size=1.5)
    empty("Pivot_Wake", (-L*0.52, 0, 1.0), parent=root, size=1.0)
    empty("Pivot_CameraDeck", (2.0, 0, 4.0), parent=root, size=0.8)
    empty("Pivot_NetRelease", (-2.6, -3.3, 3.0), parent=root, size=0.8)
    return root
