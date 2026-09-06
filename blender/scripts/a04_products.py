"""Hero seafood: swordfish, tuna, supporting fish, shrimp product forms."""
import bpy, math
from _lib import *

# ---------------------------------------------------------------- fish anatomy
def _fish_body(name, sections, parent, mat_, loc=(0, 0, 0), rot=(0, 0, 0), segs=26):
    """Fusiform body. The cross-section is a rounded teardrop, not a plain ellipse:
    slightly narrower over the back, fuller and flatter through the belly."""
    def prof(t):
        z = math.sin(t)
        ym = 1.0 - 0.14 * max(0.0, z) - 0.05 * max(0.0, -z)
        zm = 1.0 if z >= 0 else 0.94
        return (ym, zm)
    return loft(name, sections, mat_, parent=parent, loc=loc, rot=rot, segs=segs, profile=prof)


def fin(name, pts, thickness, m, parent, loc=(0, 0, 0), rot=(0, 0, 0)):
    return poly_extrude(name, pts, thickness, m, loc=loc, parent=parent, rot=rot, axis='Y')


def crescent_tail(name, span, chord, notch, thickness, m, parent, loc=(0, 0, 0)):
    """Lunate caudal fin: swept tips, concave trailing edge, forked centre."""
    s, c, n = span, chord, notch
    pts = [
        (-c, s),            # upper tip
        (-c * 0.70, s * 0.62),
        (-c * 0.38, s * 0.28),
        (-n, 0.0),          # fork notch
        (-c * 0.38, -s * 0.28),
        (-c * 0.70, -s * 0.62),
        (-c, -s),           # lower tip
        (-c * 0.66, -s * 0.94),
        (-c * 0.28, -s * 0.50),
        (0.0, 0.0),         # root at the peduncle
        (-c * 0.28, s * 0.50),
        (-c * 0.66, s * 0.94),
    ]
    return fin(name, pts, thickness, m, parent, loc)


def fish_eye(name, r, loc, parent, eye_m, sclera_m):
    """Small, recessed, with a catchlight. No cartoon eye."""
    x, y, z = loc
    s = 1.0 if y >= 0 else -1.0
    sphere(name + "_Socket", r * 1.10, (x, y - s * r * 0.30, z), sclera_m, parent, 10, 8, (1.0, 0.45, 1.0))
    sphere(name + "_Iris", r * 0.82, (x, y, z), eye_m, parent, 12, 9, (1.0, 0.55, 1.0))
    sphere(name + "_Spec", r * 0.20, (x + r * 0.34, y + s * r * 0.26, z + r * 0.30),
           mat("EyeSpec", (1, 1, 1), 0.0, 0.05, (1, 1, 1), 1.6), parent, 8, 6)


SWORD_BACK = (0.062, 0.118, 0.215)
SWORD_FLANK = (0.255, 0.335, 0.400)
SWORD_BELLY = (0.840, 0.870, 0.880)
TUNA_BACK = (0.068, 0.135, 0.250)
TUNA_FLANK = (0.270, 0.370, 0.455)
TUNA_BELLY = (0.865, 0.890, 0.900)
TUNA_LINE = (0.800, 0.635, 0.210)


def swordfish(parent=None, loc=(0, 0, 0), rot=(0, 0, 0), name="Swordfish"):
    """Xiphias gladius. 3.0 m overall, bill about a third of that and lofted as
    part of the head so it reads as jaw, not a rod stuck on the nose."""
    p = P()
    root = empty(name, loc, rot, parent, 0.4)
    body_m = vcol_mat("SwordBody", metallic=0.62, rough=0.26)
    fin_m = mat("SwordFin", (0.055, 0.085, 0.130), 0.35, 0.44)
    keel_m = mat("SwordKeel", (0.100, 0.130, 0.170), 0.55, 0.38)

    secs = [
        ( 1.500, 0.008, 0.009,  0.020),
        ( 1.320, 0.015, 0.018,  0.017),
        ( 1.080, 0.025, 0.030,  0.013),
        ( 0.860, 0.036, 0.045,  0.008),
        ( 0.680, 0.050, 0.066,  0.004),
        ( 0.560, 0.072, 0.100,  0.000),
        ( 0.450, 0.100, 0.142,  0.004),
        ( 0.320, 0.132, 0.184,  0.010),
        ( 0.150, 0.155, 0.216,  0.012),
        ( 0.000, 0.162, 0.228,  0.012),
        (-0.180, 0.153, 0.219,  0.008),
        (-0.400, 0.132, 0.190,  0.002),
        (-0.650, 0.106, 0.152, -0.004),
        (-0.900, 0.078, 0.110, -0.010),
        (-1.120, 0.052, 0.072, -0.014),
        (-1.290, 0.040, 0.042, -0.016),
        (-1.400, 0.034, 0.026, -0.016),
        (-1.480, 0.022, 0.017, -0.016),
    ]
    body = _fish_body(name + "_Body", secs, root, body_m)
    shade_fish(body, secs, SWORD_BACK, SWORD_FLANK, SWORD_BELLY,
               line=(0.170, 0.225, 0.280), line_at=0.10, line_w=0.20, noise=0.030, seed=3)

    # gill cover and jaw line, read as form rather than decoration
    fin(name + "_GillLine", [(0.0, 0.0), (-0.035, 0.10), (-0.030, -0.10)], 0.001,
        mat("SwordGill", (0.09, 0.12, 0.16), 0.5, 0.4), root, (0.40, 0.0, 0.0))

    # first dorsal: falcate, swept, deliberately not a big triangle
    fin(name + "_Dorsal1", [
        (0.170, 0.000), (0.130, 0.130), (0.055, 0.245), (-0.030, 0.288),
        (-0.010, 0.200), (-0.075, 0.096), (-0.205, 0.000),
    ], 0.016, fin_m, root, (0.150, 0.0, 0.205))
    fin(name + "_Dorsal2", [(0.0, 0.0), (-0.015, 0.052), (-0.070, 0.010), (-0.080, 0.0)], 0.010,
        fin_m, root, (-1.060, 0.0, 0.062))
    fin(name + "_Anal1", [(0.0, 0.0), (-0.030, -0.140), (-0.115, -0.055), (-0.150, 0.0)], 0.013,
        fin_m, root, (-0.520, 0.0, -0.150))
    fin(name + "_Anal2", [(0.0, 0.0), (-0.015, -0.048), (-0.065, -0.008), (-0.075, 0.0)], 0.010,
        fin_m, root, (-1.105, 0.0, -0.048))

    # long swept pectorals, set low on the flank
    for s in (1, -1):
        f = fin(f"{name}_Pect{'L' if s > 0 else 'R'}", [
            (0.0, 0.0), (-0.090, -0.055), (-0.240, -0.150), (-0.400, -0.290),
            (-0.300, -0.170), (-0.155, -0.055), (-0.055, 0.020),
        ], 0.011, fin_m, root, (0.180, s * 0.125, -0.075))
        f.rotation_euler = (math.radians(s * 52), 0.0, math.radians(-s * 12))

    crescent_tail(name + "_Tail", 0.430, 0.290, 0.045, 0.020, fin_m, root, (-1.395, 0.0, -0.016))

    for s in (1, -1):
        box(f"{name}_Keel{'L' if s > 0 else 'R'}", (0.210, 0.016, 0.030),
            (-1.300, s * 0.040, -0.016), keel_m, root)
    fish_eye(name + "_Eye_L", 0.024, (0.430, 0.118, 0.052), root,
             mat("FishIris", (0.020, 0.022, 0.028), 0.0, 0.12),
             mat("FishSclera", (0.145, 0.170, 0.195), 0.35, 0.28))
    fish_eye(name + "_Eye_R", 0.024, (0.430, -0.118, 0.052), root,
             mat("FishIris", (0.020, 0.022, 0.028), 0.0, 0.12),
             mat("FishSclera", (0.145, 0.170, 0.195), 0.35, 0.28))
    return root


def tuna(parent=None, loc=(0, 0, 0), rot=(0, 0, 0), name="Tuna"):
    """Yellowfin-type tuna. 2.0 m fork length, conical head, no bill."""
    p = P()
    root = empty(name, loc, rot, parent, 0.4)
    body_m = vcol_mat("TunaBody", metallic=0.58, rough=0.24)
    fin_m = mat("TunaFin", (0.070, 0.105, 0.150), 0.35, 0.42)
    yellow_m = mat("TunaYellow", (0.880, 0.700, 0.140), 0.30, 0.34)
    keel_m = mat("TunaKeel", (0.120, 0.150, 0.185), 0.55, 0.36)

    secs = [
        ( 1.000, 0.019, 0.022,  0.000),
        ( 0.945, 0.048, 0.056,  0.000),
        ( 0.860, 0.088, 0.106,  0.004),
        ( 0.740, 0.135, 0.164,  0.009),
        ( 0.590, 0.180, 0.222,  0.012),
        ( 0.410, 0.209, 0.266,  0.013),
        ( 0.200, 0.220, 0.286,  0.012),
        ( 0.000, 0.218, 0.283,  0.010),
        (-0.190, 0.203, 0.262,  0.006),
        (-0.390, 0.174, 0.220,  0.000),
        (-0.580, 0.140, 0.174, -0.006),
        (-0.740, 0.104, 0.126, -0.010),
        (-0.860, 0.072, 0.084, -0.013),
        (-0.940, 0.052, 0.048, -0.015),
        (-0.985, 0.040, 0.026, -0.015),
        (-1.000, 0.028, 0.017, -0.015),
    ]
    body = _fish_body(name + "_Body", secs, root, body_m)
    shade_fish(body, secs, TUNA_BACK, TUNA_FLANK, TUNA_BELLY,
               line=TUNA_LINE, line_at=-0.02, line_w=0.13, noise=0.032, seed=11)

    fin(name + "_Dorsal1", [
        (0.180, 0.000), (0.140, 0.115), (0.060, 0.196), (-0.020, 0.212),
        (0.000, 0.150), (-0.070, 0.078), (-0.215, 0.000),
    ], 0.015, fin_m, root, (0.300, 0.0, 0.268))
    fin(name + "_Dorsal2", [
        (0.070, 0.0), (0.040, 0.088), (-0.045, 0.128), (-0.030, 0.070), (-0.105, 0.0),
    ], 0.013, yellow_m, root, (-0.130, 0.0, 0.238))
    fin(name + "_Anal", [
        (0.070, 0.0), (0.035, -0.082), (-0.050, -0.118), (-0.030, -0.064), (-0.100, 0.0),
    ], 0.013, yellow_m, root, (-0.240, 0.0, -0.212))

    # small, natural finlets rather than chunky blocks
    for i in range(8):
        f = i / 7.0
        x = -0.330 - i * 0.076
        hz = 0.208 - f * 0.128
        sz = 0.030 - f * 0.011
        fin(f"{name}_FinletD{i}", [(0.0, 0.0), (-0.014, sz), (-0.046, sz * 0.42), (-0.050, 0.0)],
            0.006, yellow_m, root, (x, 0.0, hz))
        fin(f"{name}_FinletV{i}", [(0.0, 0.0), (-0.014, -sz), (-0.046, -sz * 0.42), (-0.050, 0.0)],
            0.006, yellow_m, root, (x, 0.0, -hz + 0.010))

    for s in (1, -1):
        f = fin(f"{name}_Pect{'L' if s > 0 else 'R'}", [
            (0.0, 0.0), (-0.085, -0.048), (-0.220, -0.128), (-0.365, -0.238),
            (-0.270, -0.140), (-0.140, -0.046), (-0.050, 0.018),
        ], 0.011, fin_m, root, (0.360, s * 0.170, -0.030))
        f.rotation_euler = (math.radians(s * 48), 0.0, math.radians(-s * 10))
        pv = fin(f"{name}_Pelvic{'L' if s > 0 else 'R'}", [
            (0.0, 0.0), (-0.045, -0.090), (-0.115, -0.040), (-0.120, 0.0),
        ], 0.008, yellow_m, root, (0.240, s * 0.085, -0.205))
        pv.rotation_euler = (math.radians(s * 26), 0.0, 0.0)

    crescent_tail(name + "_Tail", 0.360, 0.248, 0.038, 0.019, fin_m, root, (-0.935, 0.0, -0.015))

    box(name + "_KeelMain", (0.120, 0.070, 0.020), (-0.955, 0.0, -0.015), keel_m, root)
    for s in (1, -1):
        box(f"{name}_Keel{'L' if s > 0 else 'R'}", (0.080, 0.012, 0.014),
            (-0.900, s * 0.038, -0.014), keel_m, root)
    for s in (1, -1):
        fish_eye(f"{name}_Eye_{'L' if s > 0 else 'R'}", 0.026, (0.715, s * 0.142, 0.058), root,
                 mat("FishIris", (0.020, 0.022, 0.028), 0.0, 0.12),
                 mat("FishSclera", (0.145, 0.170, 0.195), 0.35, 0.28))
    return root


def generic_fish(name, L, parent, loc=(0, 0, 0), rot=(0, 0, 0), slim=1.0,
                 back=(0.055, 0.100, 0.170), flank=(0.230, 0.290, 0.340),
                 belly=(0.820, 0.845, 0.860), line=None, tail_span=0.30, depth=1.0):
    """Supporting species. Every dimension is a fraction of fork length, so a
    sardine is a small fish and not a scaled-down grouper."""
    root = empty(name, loc, rot, parent, 0.2)
    body_m = vcol_mat(name + "Body", metallic=0.50, rough=0.30)
    fin_m = mat(name + "Fin", (0.085, 0.115, 0.155), 0.30, 0.45)
    h = L * 0.5
    W = L * slim
    D = L * depth
    secs = [
        ( h * 1.000, W * 0.010, D * 0.011,  0.000),
        ( h * 0.905, W * 0.028, D * 0.037,  D * 0.004),
        ( h * 0.740, W * 0.048, D * 0.074,  D * 0.008),
        ( h * 0.500, W * 0.062, D * 0.100,  D * 0.010),
        ( h * 0.200, W * 0.067, D * 0.112,  D * 0.010),
        (-h * 0.110, W * 0.062, D * 0.104,  D * 0.006),
        (-h * 0.420, W * 0.049, D * 0.080,  0.000),
        (-h * 0.680, W * 0.033, D * 0.053, -D * 0.006),
        (-h * 0.860, W * 0.020, D * 0.030, -D * 0.010),
        (-h * 0.955, W * 0.014, D * 0.015, -D * 0.011),
        (-h * 1.000, W * 0.009, D * 0.008, -D * 0.011),
    ]
    body = _fish_body(name + "_Body", secs, root, body_m, segs=18)
    shade_fish(body, secs, back, flank, belly, line=line, line_at=0.0, line_w=0.15,
               noise=0.030, seed=abs(hash(name)) % 500)

    dz = D * 0.108
    fin(name + "_Dorsal", [
        (h * 0.30, 0.0), (h * 0.22, D * 0.048), (h * 0.02, D * 0.066),
        (-h * 0.12, D * 0.044), (-h * 0.26, 0.0),
    ], L * 0.010, fin_m, root, (h * 0.10, 0.0, dz))
    fin(name + "_Anal", [
        (0.0, 0.0), (-h * 0.06, -D * 0.052), (-h * 0.21, -D * 0.018), (-h * 0.24, 0.0),
    ], L * 0.009, fin_m, root, (-h * 0.42, 0.0, -D * 0.076))
    for s in (1, -1):
        f = fin(f"{name}_Pect{'L' if s > 0 else 'R'}", [
            (0.0, 0.0), (-h * 0.12, -D * 0.024), (-h * 0.30, -D * 0.068),
            (-h * 0.21, -D * 0.029), (-h * 0.07, D * 0.007),
        ], L * 0.008, fin_m, root, (h * 0.44, s * W * 0.055, -D * 0.020))
        f.rotation_euler = (math.radians(s * 46), 0.0, 0.0)
    crescent_tail(name + "_Tail", tail_span * L, tail_span * L * 0.60, tail_span * L * 0.11,
                  L * 0.012, fin_m, root, (-h * 0.915, 0.0, -D * 0.011))
    for s in (1, -1):
        fish_eye(f"{name}_Eye_{'L' if s > 0 else 'R'}", L * 0.017,
                 (h * 0.780, s * W * 0.043, D * 0.030), root,
                 mat("FishIris", (0.020, 0.022, 0.028), 0.0, 0.12),
                 mat("FishSclera", (0.145, 0.170, 0.195), 0.35, 0.28))
    return root


def shrimp(name, form, parent, loc=(0,0,0), rot=(0,0,0), scale=1.0):
    """form: HOSO | HLSO | PUD | PTO"""
    p = P()
    root = empty(name, loc, rot, parent, 0.1)
    root.scale = (scale, scale, scale)
    meat = p['shrimp_meat'] if form in ('PUD', 'PTO') else p['shrimp_shell']
    # curled abdomen: 6 segments on an arc
    segs_n = 6
    for i in range(segs_n):
        t = i / (segs_n - 1)
        ang = math.radians(-18 - t * 78)
        r = 0.42
        x = math.cos(ang) * r * 0.9
        z = math.sin(ang) * r * 0.55 + 0.24
        rad = 0.115 * (1.0 - 0.44 * t)
        seg = cyl(f"{name}_Seg{i}", rad, 0.115, (x, 0, z), meat, root,
                  rot=(0, math.radians(90) + ang * 0.75, 0), segs=12)
        if form in ('HOSO', 'HLSO'):
            cyl(f"{name}_Shell{i}", rad * 1.10, 0.058, (x, 0, z), p['shrimp_shell'], root,
                rot=(0, math.radians(90) + ang * 0.75, 0), segs=12)
        if form in ('HOSO', 'HLSO'):
            for s in (1, -1):
                cyl(f"{name}_Leg{i}{s}", 0.010, 0.13, (x, s * rad * 0.55, z - rad * 0.85), p['shrimp_shell'],
                    root, rot=(math.radians(20*s), 0, 0), segs=6)
    # tail fan
    tail_m = p['shrimp_tail'] if form in ('HOSO', 'HLSO', 'PTO') else p['shrimp_meat']
    tp = empty(f"{name}_Tail", (-0.055, 0, 0.005), (0, 0, 0), root)
    for k, a in enumerate((-26, -9, 9, 26)):
        poly_extrude(f"{name}_TailFan{k}", [(0, 0), (-0.17, 0.05), (-0.23, 0.0), (-0.17, -0.05)], 0.006,
                     tail_m, loc=(0, 0, 0), parent=tp, rot=(0, math.radians(18), math.radians(a)), axis='Z')
    # head (HOSO only)
    if form == 'HOSO':
        h = empty(f"{name}_Head", (0.44, 0, 0.16), parent=root)
        sphere(f"{name}_Carapace", 0.135, (0, 0, 0), p['shrimp_shell'], h, 14, 10, (1.45, 0.9, 1.0))
        curve_tube(f"{name}_Rostrum", [(0.16, 0, 0.02), (0.34, 0, 0.10), (0.50, 0, 0.14)], 0.014, p['shrimp_shell'], parent=h)
        for s in (1, -1):
            curve_tube(f"{name}_Antenna{s}", [(0.14, s*0.05, 0.0), (0.5, s*0.14, -0.04), (0.95, s*0.28, -0.12)],
                       0.007, p['shrimp_shell'], parent=h)
            sphere(f"{name}_Eye{s}", 0.030, (0.16, s*0.075, 0.06), p['eye'], h, 8, 6)
    # devein line for PUD/PTO shown as absent; HLSO shows shell only
    return root

def build_swordfish():
    reset_scene()
    root = empty("SwordfishAsset", (0, 0, 0))
    disp = swordfish(root, (0, 0, 0.0), (0, 0, 0), "Swordfish_Display")
    keyframe(disp, "rotation_euler",
             [(1, (0, 0, 0)), (60, (0, math.radians(3), 0)), (120, (0, 0, 0))], 'BEZIER')
    # handled-on-deck pose: laid over on its flank, head slightly raised
    swordfish(root, (0, 2.6, -0.215),
              (math.radians(90), math.radians(-2), math.radians(6)), "Swordfish_OnDeck")
    return root


def build_tuna():
    reset_scene()
    root = empty("TunaAsset", (0, 0, 0))
    disp = tuna(root, (0, 0, 0), (0, 0, 0), "Tuna_Display")
    keyframe(disp, "rotation_euler",
             [(1, (0, 0, 0)), (60, (0, math.radians(3), 0)), (120, (0, 0, 0))], 'BEZIER')
    tuna(root, (0, 2.0, -0.275),
         (math.radians(90), math.radians(-2), math.radians(-7)), "Tuna_OnDeck")
    return root


def build_supporting():
    reset_scene()
    p = P()
    root = empty("SupportingFish", (0, 0, 0))
    specs = [
        # name, fork length, width, depth, back, flank, belly, lateral line
        ("Mackerel",  0.42, 0.88, 0.82, (0.095, 0.215, 0.195), (0.300, 0.390, 0.380),
         (0.830, 0.855, 0.860), (0.075, 0.115, 0.120)),
        ("Seer",      0.95, 0.74, 0.72, (0.140, 0.190, 0.245), (0.370, 0.415, 0.450),
         (0.845, 0.865, 0.875), None),
        ("Pomfret",   0.38, 0.52, 1.55, (0.300, 0.330, 0.360), (0.630, 0.660, 0.680),
         (0.880, 0.895, 0.900), None),
        ("Snapper",   0.55, 0.92, 1.20, (0.520, 0.160, 0.125), (0.720, 0.300, 0.240),
         (0.860, 0.720, 0.690), None),
        ("Sardine",   0.24, 0.86, 0.80, (0.155, 0.245, 0.300), (0.470, 0.525, 0.560),
         (0.870, 0.885, 0.890), (0.520, 0.560, 0.580)),
        ("Barracuda", 1.10, 0.52, 0.50, (0.170, 0.215, 0.195), (0.400, 0.430, 0.415),
         (0.845, 0.860, 0.860), None),
    ]
    y = 0.0
    for nm, L, sl, dp, back, flank, belly, line in specs:
        generic_fish(nm, L, root, (0, y, 0), (0, 0, 0), sl,
                     back=back, flank=flank, belly=belly, line=line, depth=dp)
        y += L * 0.30 + 0.26
    return root


def build_shrimp_forms():
    reset_scene(); p = P()
    root = empty("ShrimpProductForms", (0, 0, 0))
    for i, form in enumerate(("HOSO", "HLSO", "PUD", "PTO")):
        grp = empty(f"Form_{form}", (0, i * 1.5 - 2.25, 0), parent=root)
        # display tray
        box(f"Tray_{form}", (1.1, 1.1, 0.05), (0, 0, -0.02), p['stainless'], grp, bevel=0.02)
        text_mesh(f"Label_{form}", form, 0.15, mat("LabelInk", (0.06, 0.13, 0.16), 0, 0.4), (0.72, 0.0, 0.02), grp, (0, 0, math.radians(-90)))
        for k in range(3):
            shrimp(f"{form}_{k}", form, grp, (k * 0.42 - 0.42, (k % 2) * 0.22 - 0.11, 0.09),
                   (0, 0, math.radians(18 * k - 18)), 0.85)
    return root
