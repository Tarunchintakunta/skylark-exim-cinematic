"""Andhra pond grid, globe with export routes, fishing crew set."""
import bpy, math
from _lib import *

def build_ponds():
    reset_scene(); p = P()
    root = empty("AndhraPondGrid", (0, 0, 0))
    box("PondGround", (200, 160, 0.4), (0, 0, -0.2), p['soil'], root)
    PW, PH, GAP = 34.0, 22.0, 5.0
    for r in range(3):
        for c in range(4):
            x = c*(PW+GAP) - (PW+GAP)*1.5
            y = r*(PH+GAP) - (PH+GAP)
            pond = empty(f"Pond_{r}{c}", (x, y, 0), parent=root)
            box(f"PondBasin{r}{c}", (PW, PH, 1.6), (0, 0, -0.8), p['soil'], pond)
            plane(f"PondWater{r}{c}", PW-2.4, PH-2.4, (0, 0, 0.05), p['pond'], pond, subd=6)
            for s in (1, -1):
                box(f"PondBundX{r}{c}{s}", (PW+GAP*0.9, GAP*0.8, 0.7), (0, s*(PH/2 + GAP*0.42), 0.35), p['soil'], pond)
                box(f"PondBundY{r}{c}{s}", (GAP*0.8, PH, 0.7), (s*(PW/2 + GAP*0.42), 0, 0.35), p['soil'], pond)
            # aerators
            for k in range(2):
                a = empty(f"Aerator{r}{c}{k}", (k*12.0 - 6.0, 0, 0.15), parent=pond)
                cyl(f"AerShaft{r}{c}{k}", 0.10, 5.0, (0, 0, 0.3), p['steel'], a, rot=(math.radians(90), 0, 0), segs=8)
                for w in range(4):
                    box(f"AerPaddle{r}{c}{k}{w}", (0.55, 0.5, 0.06), (0, w*1.4 - 2.1, 0.3), p['orange'], a)
                keyframe(a, "rotation_euler", [(1, (0, 0, 0)), (120, (math.radians(720), 0, 0))])
    # bund road
    box("BundRoad", (170, 6.0, 0.5), (0, -(PH+GAP)*1.6, 0.25), p['concrete'], root)
    # sampling station
    st = empty("SamplingStation", (-40, -8, 0.8), parent=root)
    box("SampleTable", (1.6, 0.9, 0.06), (0, 0, 0.9), p['stainless'], st, bevel=0.02)
    for sx in (-1,1):
        for sy in (-1,1):
            cyl(f"STLeg{sx}{sy}", 0.04, 0.88, (sx*0.7, sy*0.35, 0.44), p['stainless'], st, segs=8)
    for i in range(4):
        cyl(f"SampleBottle{i}", 0.055, 0.22, (i*0.22 - 0.33, 0.1, 1.04), p['glass'], st, segs=10)
        cyl(f"SampleCap{i}", 0.058, 0.03, (i*0.22 - 0.33, 0.1, 1.17), p['crate_blue'], st, segs=10)
    box("PondLogBook", (0.34, 0.26, 0.03), (0.45, -0.2, 0.95), p['paper'], st, bevel=0.008)
    figure("Pond_Technician", 'inspect', p['coat_white'], root, (-41.5, -9.8, 0.8), (0, 0, math.radians(40)), coat=True)
    # harvest crates + batch tags
    for i in range(6):
        c = empty(f"HarvestCrate{i}", (-30 + i*3.0, -14.0, 0.8), parent=root)
        box(f"HCBody{i}", (1.1, 0.8, 0.55), (0, 0, 0.28), p['crate_blue'], c, bevel=0.04)
        box(f"HCIce{i}", (1.0, 0.7, 0.18), (0, 0, 0.50), p['ice'], c)
        box(f"BatchTag{i}", (0.30, 0.02, 0.20), (0.4, -0.41, 0.36), p['paper'], c)
    text_mesh("PondBatchLabel", "BATCH AP-2291", 0.9, mat("PondInk", (0.98,0.98,0.96), 0, 0.4, (1,1,1), 1.0),
              (-24.0, -18.5, 0.9), root, (math.radians(90), 0, 0))
    empty("Pivot_Pond_Camera", (0, -40, 22), parent=root, size=2)
    return root

def _latlon(lat, lon, r):
    la, lo = math.radians(lat), math.radians(lon)
    return (r*math.cos(la)*math.cos(lo), r*math.cos(la)*math.sin(lo), r*math.sin(la))

MARKETS = [("Rotterdam", 51.92, 4.48), ("Antwerp", 51.22, 4.40), ("Osaka", 34.69, 135.50),
           ("Tokyo", 35.65, 139.83), ("New York", 40.70, -74.01), ("Los Angeles", 33.74, -118.27),
           ("Dubai", 25.27, 55.30), ("Cairo", 30.04, 31.24), ("Singapore", 1.29, 103.85),
           ("Shanghai", 31.23, 121.47), ("Sydney", -33.87, 151.21), ("Hamburg", 53.55, 9.99),
           ("Busan", 35.18, 129.08), ("Jeddah", 21.49, 39.19)]
VIZAG = (17.72, 83.30)

def build_globe():
    import land
    reset_scene(); p = P()
    R = 5.0
    root = empty("GlobeRoutes", (0, 0, 0))
    sphere("GlobeBody", R, (0, 0, 0), p['globe'], root, 64, 40)
    # continents, so the sphere reads as Earth and India reads as the origin
    land_mat = mat("GlobeLand", (0.35, 0.325, 0.265), 0.0, 0.92)
    for nm, ring in land.LANDMASSES.items():
        land.land_mesh(f"Land_{nm}", ring, R * 1.008, land_mat, root)
    # graticule
    for i in range(12):
        lon = i*30
        pts = [_latlon(la, lon, R*1.004) for la in range(-88, 89, 8)]
        curve_tube(f"Meridian{i}", pts, 0.009, p['globe_line'], parent=root, res=3, bevel_res=2)
    for lat in range(-60, 61, 30):
        pts = [_latlon(lat, lo, R*1.004) for lo in range(0, 361, 10)]
        curve_tube(f"Parallel{lat}", pts, 0.009, p['globe_line'], parent=root, res=3, bevel_res=2)
    # India origin marker
    org = _latlon(VIZAG[0], VIZAG[1], R*1.01)
    sphere("OriginIndia", 0.20, org, p['india'], root, 12, 9)
    cyl("OriginPin", 0.02, 0.9, [c*1.09 for c in org], p['india'], root, segs=8,
        rot=(0,0,0))
    bpy.data.objects["OriginPin"].rotation_euler = mathutils_track(org)
    # routes as great-circle arcs lifted off the sphere
    for i, (nm, lat, lon) in enumerate(MARKETS):
        a = _latlon(VIZAG[0], VIZAG[1], R)
        b = _latlon(lat, lon, R)
        pts = []
        n = 26
        import mathutils
        va, vb = mathutils.Vector(a), mathutils.Vector(b)
        for k in range(n+1):
            t = k/n
            v = va.lerp(vb, t)
            if v.length < 1e-4: v = mathutils.Vector((0,0,1))
            lift = 1.0 + 0.30 * math.sin(math.pi * t)
            pts.append(tuple(v.normalized() * R * lift))
        arc = curve_tube(f"Route_{i}", pts, 0.042, p['route'], parent=root, res=3, bevel_res=2)
        sphere(f"Market_{i}", 0.115, tuple(vb.normalized()*R*1.02), p['route'], root, 10, 7)
        empty(f"MarketAnchor_{i}", tuple(vb.normalized()*R*1.16), parent=root, size=0.1)
    empty("Pivot_Globe_Spin", (0, 0, 0), parent=root, size=1.0)
    return root

def mathutils_track(vec):
    import mathutils, math as m
    v = mathutils.Vector(vec)
    return v.to_track_quat('Z', 'Y').to_euler()

def build_crew_set():
    reset_scene(); p = P()
    root = empty("FishingCrewSet", (0, 0, 0))
    specs = [("Crew_Board", 'walk_crate', p['shirt_orange'], False),
             ("Crew_Rope", 'rope', p['shirt_teal'], False),
             ("Crew_NetCast", 'net_cast', p['shirt_blue'], False),
             ("Crew_Carry", 'carry', p['shirt_orange'], False),
             ("Crew_Stand", 'stand', p['shirt_teal'], False),
             ("Crew_Inspect", 'inspect', p['coat_white'], True)]
    for i, (nm, pose, shirt, coat) in enumerate(specs):
        f = figure(nm, pose, shirt, root, (0, i*1.2 - 3.0, 0), (0, 0, 0), coat=coat)
        if pose == 'carry':
            box(nm+"_Crate", (0.9, 0.6, 0.4), (0.45, 0, 1.0), p['crate_blue'], f, bevel=0.03)
    return root
