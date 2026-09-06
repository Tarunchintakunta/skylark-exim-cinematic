"""Coarse continental outlines, projected onto the globe.

The globe read as a featureless blue ball, so the closing export sequence had
nothing to anchor it. These are deliberately simplified coastlines: enough
resolution that the shape of each landmass is unmistakable, and enough around
the Bay of Bengal that Visakhapatnam sits where a viewer expects it.

Outlines are stored in (lat, lon) degrees, wound as a single closed ring each.
They are triangulated by ear clipping in the lat/lon plane, subdivided until no
edge spans more than a few degrees, and only then projected onto the sphere, so
the tessellation hugs the surface instead of cutting chords through it.
"""
import math

# Each entry is a closed ring of (lat, lon), no repeated final point.
LANDMASSES = {
    "Africa": [
        (36, -6), (33, 10), (32, 20), (31, 33), (18, 39), (12, 43), (12, 51),
        (2, 46), (-2, 42), (-11, 40), (-20, 35), (-26, 33), (-34, 26), (-34, 20),
        (-29, 16), (-22, 14), (-13, 12), (-5, 12), (0, 9), (4, 9), (4, 5),
        (5, -4), (5, -8), (10, -14), (15, -17), (21, -17), (28, -11), (33, -8),
    ],
    "Eurasia": [
        (37, -9), (43, -9), (48, -4), (51, 2), (53, 5), (57, 8), (60, 5),
        (65, 12), (71, 25), (69, 41), (69, 60), (73, 80), (76, 105), (72, 130),
        (70, 155), (69, 172), (62, 179), (60, 165), (52, 158), (54, 141),
        (46, 143), (43, 132), (39, 122), (34, 120), (30, 122), (22, 114),
        (21, 109), (10, 107), (9, 105), (13, 100), (8, 100), (6, 96),
        (16, 94), (21, 90), (22, 88), (20, 87), (16, 82), (13, 80), (8, 77),
        (10, 76), (15, 74), (21, 72), (24, 68), (25, 62), (26, 57), (29, 48),
        (24, 52), (23, 59), (17, 55), (13, 45), (16, 41), (21, 39), (28, 34),
        (31, 34), (36, 36), (36, 30), (40, 26), (38, 16), (41, 15), (44, 12),
        (43, 7), (41, 3), (37, -2),
    ],
    "NorthAmerica": [
        (70, -160), (71, -145), (70, -130), (69, -110), (68, -95), (63, -78),
        (60, -64), (52, -56), (47, -53), (45, -66), (40, -74), (35, -76),
        (32, -80), (25, -80), (30, -84), (30, -89), (29, -94), (26, -97),
        (21, -97), (18, -94), (21, -90), (21, -87), (17, -88), (13, -84),
        (9, -80), (14, -92), (16, -96), (20, -105), (23, -110), (28, -115),
        (32, -117), (37, -122), (46, -124), (52, -131), (58, -136), (60, -147),
        (58, -158), (62, -166), (66, -164),
    ],
    "SouthAmerica": [
        (11, -72), (11, -62), (8, -60), (5, -52), (0, -50), (-1, -44),
        (-5, -35), (-9, -35), (-13, -38), (-18, -39), (-23, -43), (-28, -48),
        (-33, -53), (-38, -58), (-41, -62), (-46, -66), (-51, -68), (-55, -68),
        (-52, -73), (-46, -75), (-40, -73), (-33, -71), (-24, -70), (-18, -70),
        (-12, -77), (-6, -81), (-2, -80), (2, -79), (8, -77),
    ],
    "Australia": [
        (-11, 131), (-12, 137), (-11, 142), (-15, 145), (-19, 147), (-24, 153),
        (-27, 153), (-33, 152), (-37, 150), (-38, 145), (-38, 141), (-35, 137),
        (-32, 133), (-32, 129), (-34, 122), (-34, 116), (-32, 115), (-26, 113),
        (-22, 114), (-20, 118), (-17, 122), (-14, 127), (-13, 130),
    ],
    "Greenland": [
        (83, -32), (80, -18), (76, -18), (70, -22), (65, -37), (60, -44),
        (64, -51), (68, -53), (73, -56), (78, -60), (82, -48),
    ],
    "Japan": [
        (45, 142), (43, 145), (41, 141), (38, 141), (35, 141), (34, 137),
        (33, 132), (31, 130), (34, 129), (36, 133), (38, 138), (41, 140),
    ],
    "Sumatra": [
        (5, 95), (2, 99), (-2, 102), (-6, 106), (-5, 104), (-2, 100), (2, 96),
    ],
    "Java": [
        (-6, 106), (-6, 110), (-7, 113), (-8, 114), (-8, 110), (-8, 107),
    ],
    "Borneo": [
        (7, 117), (3, 119), (-2, 117), (-4, 114), (-2, 110), (2, 109),
        (5, 113),
    ],
    "NewGuinea": [
        (-1, 131), (-2, 137), (-3, 142), (-6, 147), (-9, 150), (-10, 148),
        (-9, 144), (-8, 140), (-6, 136), (-4, 132),
    ],
    "Madagascar": [
        (-12, 49), (-16, 50), (-21, 48), (-25, 47), (-25, 44), (-19, 44),
        (-15, 46),
    ],
    "SriLanka": [
        (10, 80), (8, 82), (6, 81), (6, 80), (9, 79),
    ],
    "BritishIsles": [
        (58, -5), (55, -2), (51, 1), (50, -4), (53, -5), (55, -6), (58, -7),
    ],
    "NewZealand": [
        (-35, 173), (-38, 178), (-41, 175), (-45, 171), (-46, 167), (-43, 170),
        (-40, 172),
    ],
}


def _area2(ring):
    s = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][1], ring[i][0]
        x2, y2 = ring[(i + 1) % n][1], ring[(i + 1) % n][0]
        s += x1 * y2 - x2 * y1
    return s


def _cross(o, a, b):
    return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1])


def _inside(p, a, b, c):
    d1 = _cross(a, b, p)
    d2 = _cross(b, c, p)
    d3 = _cross(c, a, p)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def earclip(ring):
    """Triangulate a simple polygon of (lat, lon) points. Returns index triples."""
    n = len(ring)
    idx = list(range(n))
    if _area2(ring) < 0:
        idx.reverse()
    tris = []
    guard = 0
    while len(idx) > 3 and guard < 4 * n * n:
        guard += 1
        clipped = False
        for k in range(len(idx)):
            i0 = idx[k - 1]
            i1 = idx[k]
            i2 = idx[(k + 1) % len(idx)]
            a, b, c = ring[i0], ring[i1], ring[i2]
            if _cross(a, b, c) <= 0:
                continue  # reflex in CCW winding
            bad = False
            for j in idx:
                if j in (i0, i1, i2):
                    continue
                if _inside(ring[j], a, b, c):
                    bad = True
                    break
            if bad:
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            clipped = True
            break
        if not clipped:
            break
    if len(idx) == 3:
        tris.append(tuple(idx))
    return tris


def _mid(a, b):
    return ((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5)


def _span(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def refine(verts, tris, max_span=5.0, depth=0):
    """Split any triangle with a long edge so the mesh hugs the sphere."""
    if depth > 5:
        return verts, tris
    out = []
    cache = {}
    changed = False

    def mid_index(i, j):
        key = (min(i, j), max(i, j))
        if key not in cache:
            verts.append(_mid(verts[i], verts[j]))
            cache[key] = len(verts) - 1
        return cache[key]

    for (a, b, c) in tris:
        if max(_span(verts[a], verts[b]), _span(verts[b], verts[c]),
               _span(verts[c], verts[a])) <= max_span:
            out.append((a, b, c))
            continue
        changed = True
        ab, bc, ca = mid_index(a, b), mid_index(b, c), mid_index(c, a)
        out += [(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)]
    if not changed:
        return verts, out
    return refine(verts, out, max_span, depth + 1)


def project(lat, lon, r):
    la, lo = math.radians(lat), math.radians(lon)
    return (r * math.cos(la) * math.cos(lo),
            r * math.cos(la) * math.sin(lo),
            r * math.sin(la))


def land_mesh(name, ring, radius, material, parent, thickness=0.0, max_span=9.0):
    """Build one landmass as a shell sitting just proud of the globe surface."""
    import bpy
    verts = [tuple(v) for v in ring]
    tris = earclip(verts)
    if not tris:
        return None
    verts, tris = refine(verts, tris, max_span=max_span)

    pts = [project(la, lo, radius) for (la, lo) in verts]
    faces = list(tris)
    if thickness > 0.0:
        base = len(pts)
        pts += [project(la, lo, radius - thickness) for (la, lo) in verts]
        faces += [(b + base, a + base, c + base) for (a, b, c) in tris]
        # rim: every edge used by exactly one top triangle is a boundary edge
        counts = {}
        for (a, b, c) in tris:
            for e in ((a, b), (b, c), (c, a)):
                key = (min(e), max(e))
                counts[key] = counts.get(key, 0) + 1
        for (a, b, c) in tris:
            for (i, j) in ((a, b), (b, c), (c, a)):
                if counts[(min(i, j), max(i, j))] == 1:
                    faces.append((i, j, j + base, i + base))

    me = bpy.data.meshes.new(name)
    me.from_pydata(pts, [], faces)
    me.validate()
    me.update()
    # smooth shading: the shell follows the sphere, so interpolated normals put
    # the land under the same terminator as the ocean instead of reading as a
    # flat paper cut-out floating above it
    for poly in me.polygons:
        poly.use_smooth = True
    if material is not None:
        me.materials.append(material)
    o = bpy.data.objects.new(name, me)
    if parent is not None:
        o.parent = parent
    bpy.context.scene.collection.objects.link(o)
    return o
