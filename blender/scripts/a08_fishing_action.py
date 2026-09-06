"""Chapter 5-6: the crew actually working the gear.

A hauling team on the rail, a net bag coming up full of mixed catch, a cast net
in flight, and fish landing on deck. Everything is keyframed 1-120 so the site
scrubs it with scroll rather than playing it on a clock.
"""
import bpy, math, random
from _lib import *
import a04_products as PR


def _pull_cycle(fig_name, phase, reach, root):
    """Keyframe one crew member's arms and torso through a haul stroke."""
    la = bpy.data.objects.get(f"{fig_name}_LArm")
    ra = bpy.data.objects.get(f"{fig_name}_RArm")
    hips = bpy.data.objects.get(f"{fig_name}_Hips")
    frames = [1, 30, 60, 90, 120]
    for i, f in enumerate(frames):
        t = (i / 4.0 + phase) % 1.0
        # reach out, grip, haul back
        swing = math.sin(t * math.pi * 2.0)
        if la:
            la.rotation_euler = (la.rotation_euler[0], reach - swing * 0.55, la.rotation_euler[2])
            la.keyframe_insert("rotation_euler", frame=f)
        if ra:
            ra.rotation_euler = (ra.rotation_euler[0], reach - swing * 0.42 - 0.18, ra.rotation_euler[2])
            ra.keyframe_insert("rotation_euler", frame=f)
        if hips:
            hips.rotation_euler = (0.0, -0.12 - swing * 0.14, 0.0)
            hips.location = (0.0, 0.0, 0.95 - abs(swing) * 0.05)
            hips.keyframe_insert("rotation_euler", frame=f)
            hips.keyframe_insert("location", frame=f)
    # Blender 5 keeps f-curves inside action slots, so reach them defensively
    for o in (la, ra, hips):
        if not (o and o.animation_data and o.animation_data.action):
            continue
        act = o.animation_data.action
        curves = []
        try:
            curves = list(act.fcurves)
        except AttributeError:
            try:
                for layer in act.layers:
                    for strip in layer.strips:
                        for bag in strip.channelbags:
                            curves.extend(bag.fcurves)
            except Exception:
                curves = []
        for fc in curves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'


def net_bag(name, parent, L=2.9, W=1.7, H=1.5, mesh=7):
    """A bulging net bag: cage of net cords over an ovoid of catch."""
    p = P()
    grp = empty(name, (0, 0, 0), parent=parent, size=0.4)
    # the mass of fish inside, read as a soft silvery volume
    sphere(name + "_Mass", 1.0, (0, 0, 0), mat("CatchMass", (0.42, 0.47, 0.50), 0.40, 0.38),
           grp, 18, 12, (L * 0.40, W * 0.38, H * 0.38))
    # net cords wrapping it
    for i in range(mesh):
        a = math.pi * i / mesh
        pts = []
        for k in range(15):
            u = k / 14.0
            th = -math.pi / 2 + u * math.pi
            pts.append((math.sin(th) * L / 2 * 1.03,
                        math.cos(th) * math.cos(a) * W / 2 * 1.06,
                        math.cos(th) * math.sin(a) * H / 2 * 1.06))
        curve_tube(f"{name}_Cord{i}", pts, 0.014, p['net'], parent=grp, res=4, bevel_res=2)
    for j in range(3):
        pts = []
        for k in range(21):
            th = 2 * math.pi * k / 20
            pts.append((math.cos(th) * L / 2 * (0.30 + j * 0.22),
                        math.sin(th) * W / 2 * 1.05,
                        math.sin(th) * 0.0 + (j - 1.0) * 0.16))
        curve_tube(f"{name}_Ring{j}", pts, 0.012, p['net'], parent=grp, res=4, bevel_res=2)
    # visible catch breaking the surface of the bag
    random.seed(21)
    for i in range(11):
        a = random.uniform(0, math.pi * 2)
        fx = random.uniform(-L * 0.34, L * 0.34)
        fy = math.cos(a) * W * 0.40
        fz = math.sin(a) * H * 0.40
        specs = [("Bag_Mack%d" % i, 0.40, 0.88, 0.82, (0.095, 0.215, 0.195)),
                 ("Bag_Sard%d" % i, 0.26, 0.86, 0.80, (0.155, 0.245, 0.300)),
                 ("Bag_Snap%d" % i, 0.50, 0.92, 1.20, (0.520, 0.160, 0.125))]
        nm, FL, sl, dp, back = specs[i % 3]
        PR.generic_fish(nm, FL, grp, (fx, fy, fz),
                        (random.uniform(-0.6, 0.6), random.uniform(-0.4, 0.4), random.uniform(0, 6.28)),
                        sl, back=back, depth=dp)
    # bridle ropes so the bag hangs from something
    for s in (1, -1):
        curve_tube(f"{name}_Bridle{s}", [(0.0, s * W * 0.30, H * 0.45), (0.0, s * 0.16, 1.35), (0.0, 0.0, 1.85)],
                   0.028, p['rope'], parent=grp, res=4)
    return grp


def build():
    reset_scene()
    p = P()
    root = empty("FishingAction", (0, 0, 0))

    # ---- hauling team on the starboard rail ----------------------------------
    team = empty("HaulTeam", (0, 0, 0), parent=root)
    crew_specs = [(-1.35, p['shirt_orange'], 0.00),
                  ( 0.05, p['shirt_teal'],   0.33),
                  ( 1.45, p['shirt_blue'],   0.66)]
    for i, (x, shirt, phase) in enumerate(crew_specs):
        nm = f"Hauler{i}"
        figure(nm, 'rope', shirt, team, (x, -2.55, 0.0), (0, 0, math.radians(-90)))
        _pull_cycle(nm, phase, 1.15, team)

    # ---- the net bag coming up over the side --------------------------------
    lift = empty("NetLift", (0.2, -4.1, -2.2), parent=root, size=0.5)
    net_bag("NetBag", lift)
    keyframe(lift, "location", [
        (1,   (0.2, -4.6, -2.6)),
        (45,  (0.2, -4.2, -0.5)),
        (80,  (0.2, -3.4,  1.35)),
        (120, (0.2, -2.2,  1.15)),
    ], 'BEZIER')
    keyframe(lift, "rotation_euler", [
        (1, (0, 0, 0)), (60, (0.10, 0.05, -0.12)), (120, (-0.06, 0, 0.10)),
    ], 'BEZIER')

    # ---- gantry rope running down to the bag --------------------------------
    curve_tube("HaulRope", [(0.2, -1.1, 4.4), (0.2, -2.4, 3.4), (0.2, -3.2, 2.3)],
               0.030, p['rope'], parent=root, res=5)
    cyl("HaulBlock", 0.16, 0.34, (0.2, -1.05, 4.30), p['steel_dark'], root,
        rot=(math.radians(90), 0, 0), segs=12)

    # ---- cast net in flight, thrown from the bow quarter --------------------
    cast = empty("CastNetFlight", (4.2, -3.0, 2.2), parent=root, size=0.4)
    from a05_ocean import net_sheet
    net_sheet("CastSheet", 4.6, 4.6, 8, 1.5, cast)
    torus("CastRim", 2.3, 0.055, (0, 0, 0), p['rope'], cast, segs=26, rings=6)
    for i in range(10):
        a = 2 * math.pi * i / 10
        sphere(f"CastWeight{i}", 0.085, (2.3 * math.cos(a), 2.3 * math.sin(a), -0.04),
               p['steel_dark'], cast, 8, 6)
    # thrown from the rail, out over the side and down into the sea
    keyframe(cast, "location", [
        (1,   (2.9, -2.4,  1.9)),
        (30,  (4.4, -4.4,  2.9)),
        (62,  (5.6, -6.4,  0.6)),
        (95,  (6.2, -7.4, -1.9)),
        (120, (6.4, -7.8, -2.9)),
    ], 'BEZIER')
    keyframe(cast, "scale", [
        (1, (0.18, 0.18, 0.40)), (40, (0.95, 0.95, 0.88)),
        (78, (1.10, 1.10, 0.70)), (120, (1.18, 1.18, 0.42)),
    ], 'BEZIER')
    # the thrower
    figure("Caster", 'net_cast', p['shirt_orange'], root, (3.3, -2.35, 0.0), (0, 0, math.radians(-118)))

    # ---- fish already landed on deck ----------------------------------------
    deck = empty("DeckCatch", (-2.4, -0.4, 0.02), parent=root)
    PR.tuna(deck, (0.35, 0.30, 0.30), (math.radians(90), 0, math.radians(18)), "Deck_Tuna")
    random.seed(5)
    for i, (nm, FL, sl, dp, back) in enumerate([
        ("Deck_Mack", 0.42, 0.88, 0.82, (0.095, 0.215, 0.195)),
        ("Deck_Seer", 0.95, 0.74, 0.72, (0.140, 0.190, 0.245)),
        ("Deck_Snap", 0.55, 0.92, 1.20, (0.520, 0.160, 0.125)),
        ("Deck_Pom",  0.38, 0.52, 1.55, (0.300, 0.330, 0.360)),
        ("Deck_Sard", 0.26, 0.86, 0.80, (0.155, 0.245, 0.300)),
    ]):
        PR.generic_fish(nm, FL, deck,
                        (random.uniform(-1.5, 1.5), random.uniform(-0.9, 0.9), 0.10),
                        (math.radians(90), 0, random.uniform(0, 6.28)), sl, back=back, depth=dp)
    # a sorting crate the crew fill
    box("SortCrate", (1.3, 0.95, 0.52), (-2.0, 1.5, 0.26), p['crate_blue'], root, bevel=0.04)
    box("SortCrateIce", (1.16, 0.82, 0.16), (-2.0, 1.5, 0.50), p['ice'], root)
    figure("Sorter", 'inspect', p['shirt_teal'], root, (-2.0, 2.5, 0.0), (0, 0, math.radians(-90)))

    # ---- anchors the website hangs spray and splash particles on ------------
    for i, loc in enumerate([(0.2, -4.4, 0.0), (5.9, -6.9, 0.0), (2.6, -4.0, 0.0)]):
        empty(f"Anchor_Splash{i}", loc, parent=root, size=0.3)
    empty("Pivot_Action_Camera", (1.0, -6.0, 3.0), parent=root, size=0.8)
    return root
