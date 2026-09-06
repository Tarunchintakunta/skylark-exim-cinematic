"""Skylark Blender asset library. Executed inside Blender via MCP.
All helpers build named, parented, metre-scale geometry and export GLB + preview PNG."""
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix, Euler

ROOT = "/Users/tarunchintakunta/Desktop/project/skylark-site"
MODELS = ROOT + "/public/assets/models"
PREV = ROOT + "/public/assets/renders/blender-previews"

# ---------------------------------------------------------------- scene mgmt
def reset_scene():
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights,
                 bpy.data.cameras, bpy.data.actions, bpy.data.armatures, bpy.data.fonts):
        for d in list(coll):
            if d.users == 0:
                try: coll.remove(d)
                except Exception: pass
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)
    _MATS.clear()
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end, sc.frame_current = 1, 120, 1
    sc.render.fps = 30
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0

def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o

# ---------------------------------------------------------------- materials
_MATS = {}
def mat(name, rgb, metallic=0.0, rough=0.5, emission=None, estr=2.0, alpha=1.0):
    try:
        if name in _MATS and _MATS[name].name and bpy.data.materials.get(name):
            return bpy.data.materials[name]
    except ReferenceError:
        _MATS.pop(name, None)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.get("Material Output") or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = estr
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        for attr, val in (("surface_render_method", 'BLENDED'), ("blend_method", 'BLEND')):
            if hasattr(m, attr):
                try: setattr(m, attr, val)
                except Exception: pass
    _MATS[name] = m
    return m

# palette
def P():
    return dict(
        hull_white=mat("HullWhite", (0.92, 0.93, 0.92), 0.0, 0.45),
        hull_blue=mat("HullBlue", (0.05, 0.30, 0.45), 0.0, 0.4),
        hull_red=mat("HullRed", (0.55, 0.13, 0.10), 0.0, 0.55),
        steel=mat("Steel", (0.68, 0.72, 0.74), 0.9, 0.3),
        steel_dark=mat("SteelDark", (0.35, 0.38, 0.40), 0.8, 0.45),
        stainless=mat("Stainless", (0.80, 0.83, 0.85), 1.0, 0.22),
        deck=mat("DeckGreen", (0.36, 0.45, 0.42), 0.0, 0.7),
        wood=mat("Wood", (0.45, 0.30, 0.17), 0.0, 0.65),
        rubber=mat("Rubber", (0.06, 0.06, 0.06), 0.0, 0.8),
        glass=mat("Glass", (0.55, 0.75, 0.85), 0.1, 0.05, alpha=0.35),
        rope=mat("Rope", (0.78, 0.68, 0.45), 0.0, 0.85),
        net=mat("Net", (0.15, 0.45, 0.40), 0.0, 0.7, alpha=0.55),
        ice=mat("Ice", (0.86, 0.95, 0.99), 0.0, 0.15, alpha=0.9),
        crate_blue=mat("CrateBlue", (0.10, 0.40, 0.62), 0.0, 0.5),
        crate_white=mat("CrateWhite", (0.93, 0.95, 0.96), 0.0, 0.5),
        orange=mat("SafetyOrange", (0.90, 0.38, 0.10), 0.0, 0.55),
        brass=mat("Brass", (0.84, 0.66, 0.31), 0.9, 0.35),
        screen=mat("Screen", (0.05, 0.2, 0.3), 0.0, 0.3, emission=(0.35, 0.85, 1.0), estr=3.0),
        screen_amber=mat("ScreenAmber", (0.3, 0.2, 0.05), 0.0, 0.3, emission=(1.0, 0.7, 0.25), estr=3.0),
        lamp=mat("LampWhite", (1, 1, 1), 0.0, 0.3, emission=(1.0, 0.98, 0.92), estr=6.0),
        floor=mat("FloorEpoxy", (0.78, 0.82, 0.84), 0.0, 0.35),
        wall=mat("WallPanel", (0.90, 0.92, 0.93), 0.0, 0.6),
        concrete=mat("Concrete", (0.60, 0.60, 0.58), 0.0, 0.9),
        water=mat("Water", (0.10, 0.45, 0.50), 0.0, 0.08, alpha=0.8),
        carton=mat("Carton", (0.94, 0.94, 0.92), 0.0, 0.7),
        carton_band=mat("CartonBand", (0.05, 0.43, 0.56), 0.0, 0.6),
        pallet=mat("Pallet", (0.55, 0.42, 0.25), 0.0, 0.8),
        reefer=mat("Reefer", (0.95, 0.96, 0.97), 0.1, 0.4),
        cont_blue=mat("ContBlue", (0.10, 0.28, 0.50), 0.1, 0.55),
        cont_red=mat("ContRed", (0.62, 0.15, 0.12), 0.1, 0.55),
        cont_green=mat("ContGreen", (0.12, 0.42, 0.32), 0.1, 0.55),
        cont_grey=mat("ContGrey", (0.55, 0.58, 0.60), 0.1, 0.55),
        skin=mat("Skin", (0.50, 0.32, 0.22), 0.0, 0.6),
        shirt_blue=mat("ShirtBlue", (0.12, 0.30, 0.50), 0.0, 0.7),
        shirt_orange=mat("ShirtOrange", (0.90, 0.45, 0.15), 0.0, 0.7),
        shirt_teal=mat("ShirtTeal", (0.15, 0.55, 0.50), 0.0, 0.7),
        trousers=mat("Trousers", (0.15, 0.17, 0.22), 0.0, 0.8),
        coat_white=mat("CoatWhite", (0.96, 0.97, 0.97), 0.0, 0.6),
        glove=mat("Glove", (0.85, 0.90, 0.95), 0.0, 0.5),
        hair=mat("Hair", (0.06, 0.05, 0.04), 0.0, 0.7),
        fish_blue=mat("FishBlue", (0.12, 0.25, 0.40), 0.6, 0.30),
        fish_silver=mat("FishSilver", (0.80, 0.84, 0.86), 0.8, 0.25),
        fish_yellow=mat("FishYellow", (0.95, 0.78, 0.15), 0.3, 0.4),
        fin_dark=mat("FinDark", (0.08, 0.12, 0.18), 0.4, 0.5),
        eye=mat("Eye", (0.02, 0.02, 0.02), 0.0, 0.2),
        shrimp_shell=mat("ShrimpShell", (0.72, 0.44, 0.32), 0.05, 0.32),
        shrimp_meat=mat("ShrimpMeat", (0.97, 0.55, 0.42), 0.0, 0.28),
        shrimp_tail=mat("ShrimpTail", (0.85, 0.26, 0.16), 0.05, 0.32),
        paper=mat("Paper", (0.98, 0.98, 0.97), 0.0, 0.8),
        soil=mat("Soil", (0.50, 0.42, 0.30), 0.0, 0.95),
        pond=mat("PondWater", (0.25, 0.50, 0.42), 0.0, 0.1, alpha=0.85),
        grass=mat("Grass", (0.40, 0.52, 0.28), 0.0, 0.9),
        globe=mat("Globe", (0.07, 0.23, 0.36), 0.0, 0.72),
        globe_line=mat("GlobeLine", (0.55, 0.80, 0.90), 0.0, 0.5, emission=(0.55, 0.85, 1.0), estr=1.0),
        route=mat("Route", (0.90, 0.66, 0.22), 0.1, 0.45, emission=(1.0, 0.72, 0.24), estr=0.85),
        india=mat("India", (0.98, 0.50, 0.14), 0.0, 0.4, emission=(1.0, 0.50, 0.14), estr=1.6),
    )

# ---------------------------------------------------------------- primitives
def _finish(name, bm, mat_=None, loc=(0,0,0), rot=(0,0,0), parent=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    if parent is not None: o.parent = parent
    if mat_ is not None: me.materials.append(mat_)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    link(o)
    return o

def empty(name, loc=(0,0,0), rot=(0,0,0), parent=None, size=0.5):
    o = bpy.data.objects.new(name, None)
    o.empty_display_type = 'PLAIN_AXES'; o.empty_display_size = size
    o.location = loc; o.rotation_euler = rot
    if parent is not None: o.parent = parent
    return link(o)

def box(name, dims, loc=(0,0,0), mat_=None, parent=None, rot=(0,0,0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=min(bevel, min(dims)*0.45), segments=2, affect='EDGES')
    return _finish(name, bm, mat_, loc, rot, parent, smooth=bevel > 0)

def cyl(name, r, depth, loc=(0,0,0), mat_=None, parent=None, rot=(0,0,0), segs=24, r2=None, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r, radius2=(r if r2 is None else r2), depth=depth)
    return _finish(name, bm, mat_, loc, rot, parent, smooth=True)

def sphere(name, r, loc=(0,0,0), mat_=None, parent=None, segs=20, rings=12, scale=(1,1,1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    return _finish(name, bm, mat_, loc, (0,0,0), parent, smooth=True)

def torus(name, R, r, loc=(0,0,0), mat_=None, parent=None, rot=(0,0,0), segs=24, rings=10):
    bm = bmesh.new()
    verts = []
    for i in range(segs):
        a = 2*math.pi*i/segs
        ring = []
        for j in range(rings):
            b = 2*math.pi*j/rings
            x = (R + r*math.cos(b))*math.cos(a); y = (R + r*math.cos(b))*math.sin(a); z = r*math.sin(b)
            ring.append(bm.verts.new((x, y, z)))
        verts.append(ring)
    for i in range(segs):
        for j in range(rings):
            a0, a1 = verts[i], verts[(i+1) % segs]
            bm.faces.new((a0[j], a1[j], a1[(j+1)%rings], a0[(j+1)%rings]))
    return _finish(name, bm, mat_, loc, rot, parent, smooth=True)

def plane(name, w, h, loc=(0,0,0), mat_=None, parent=None, rot=(0,0,0), subd=1):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=subd, y_segments=subd, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((w, h, 1)), verts=bm.verts)
    return _finish(name, bm, mat_, loc, rot, parent)

def loft(name, sections, mat_=None, loc=(0,0,0), parent=None, segs=20, cap=True, rot=(0,0,0), profile=None):
    """sections: list of (x, half_w, half_h, z_center[, top_bias]) ellipse rings along local X.
    profile(theta)->(y_mult, z_mult) optionally reshapes the ring (theta 0..2pi, 0 = +Y)."""
    bm = bmesh.new()
    rings = []
    for s in sections:
        x, hw, hh, zc = s[0], s[1], s[2], s[3]
        ring = []
        for i in range(segs):
            t = 2*math.pi*i/segs
            ym, zm = (1, 1) if profile is None else profile(t)
            y = hw*math.cos(t)*ym; z = hh*math.sin(t)*zm
            ring.append(bm.verts.new((x, y, zc + z)))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], b[i], b[(i+1)%segs], a[(i+1)%segs]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(name, bm, mat_, loc, rot, parent, smooth=True)

def poly_extrude(name, pts2d, thickness, mat_=None, loc=(0,0,0), parent=None, rot=(0,0,0), axis='Y'):
    """Extrude a 2D polygon (in XZ plane by default, thickness along Y)."""
    bm = bmesh.new()
    vs = []
    for (a, b) in pts2d:
        if axis == 'Y': vs.append(bm.verts.new((a, -thickness/2, b)))
        elif axis == 'Z': vs.append(bm.verts.new((a, b, -thickness/2)))
        else: vs.append(bm.verts.new((-thickness/2, a, b)))
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    ext = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    vec = {'Y': (0, thickness, 0), 'Z': (0, 0, thickness), 'X': (thickness, 0, 0)}[axis]
    bmesh.ops.translate(bm, vec=vec, verts=ext)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(name, bm, mat_, loc, rot, parent)

def curve_tube(name, points, radius, mat_=None, parent=None, loc=(0,0,0), res=8, bevel_res=4, smooth=True):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('NURBS' if smooth else 'POLY')
    sp.points.add(len(points)-1)
    for p, pt in zip(sp.points, points): p.co = (*pt, 1.0)
    if smooth:
        sp.use_endpoint_u = True; sp.order_u = min(4, len(points))
    cu.bevel_depth = radius; cu.bevel_resolution = bevel_res; cu.resolution_u = res
    cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu); o.location = loc
    if parent is not None: o.parent = parent
    if mat_ is not None: cu.materials.append(mat_)
    link(o)
    # convert to mesh so GLB export is deterministic
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    return o

def text_mesh(name, text, size=0.3, mat_=None, loc=(0,0,0), parent=None, rot=(0,0,0), extrude=0.01, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = text; cu.size = size; cu.extrude = extrude
    cu.align_x = align
    o = bpy.data.objects.new(name, cu); o.location = loc; o.rotation_euler = rot
    if parent is not None: o.parent = parent
    if mat_ is not None: cu.materials.append(mat_)
    link(o)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    return o

def instance(name, src, loc=(0,0,0), rot=(0,0,0), scale=(1,1,1), parent=None):
    o = bpy.data.objects.new(name, src.data)
    o.location = loc; o.rotation_euler = rot; o.scale = scale
    if parent is not None: o.parent = parent
    return link(o)

def keyframe(obj, prop, frames_values, interp='LINEAR'):
    for f, v in frames_values:
        setattr(obj, prop, v)
        obj.keyframe_insert(data_path=prop, frame=f)
    if obj.animation_data and obj.animation_data.action:
        act = obj.animation_data.action
        fcs = act.fcurves if hasattr(act, 'fcurves') else []
        try:
            for fc in fcs:
                for kp in fc.keyframe_points: kp.interpolation = interp
        except Exception: pass

# ---------------------------------------------------------------- figures
def figure(name, pose='stand', shirt=None, parent=None, loc=(0,0,0), rot=(0,0,0), coat=False, gloves=True, cap=True):
    """Stylised-realistic 1.72 m worker. Poses: stand, walk_crate, rope, net_cast, carry, inspect."""
    p = P()
    shirt = shirt or p['shirt_blue']
    root = empty(name, loc, rot, parent, 0.3)
    hips = empty(name+"_Hips", (0, 0, 0.95), parent=root, size=0.2)
    torso_m = p['coat_white'] if coat else shirt
    loft(name+"_Torso", [(-0.02, 0.17, 0.11, 0.0), (0.0, 0.19, 0.12, 0.25), (0.0, 0.20, 0.12, 0.50), (0.0, 0.16, 0.10, 0.62)],
         torso_m, parent=hips, segs=14)
    neck = cyl(name+"_Neck", 0.05, 0.08, (0, 0, 0.66), p['skin'], hips, segs=10)
    head = sphere(name+"_Head", 0.105, (0, 0, 0.78), p['skin'], hips, 16, 10, (0.95, 1.0, 1.12))
    sphere(name+"_Hair", 0.108, (0, 0, 0.80), p['hair'], hips, 16, 10, (0.97, 1.0, 0.9))
    if cap:
        cyl(name+"_Cap", 0.115, 0.06, (0, 0, 0.86), p['shirt_teal'] if not coat else p['coat_white'], hips, segs=16)
        box(name+"_CapPeak", (0.09, 0.16, 0.012), (0.13, 0, 0.84), p['shirt_teal'] if not coat else p['coat_white'], hips)
    # legs
    poses = {
        'stand': dict(lu=(0,0), ru=(0,0), la=(0.1,0), ra=(-0.1,0), lf=0.2, rf=0.2),
        'walk_crate': dict(lu=(0.5,0), ru=(-0.35,0), la=(1.3,0), ra=(1.3,0), lf=0.9, rf=0.9),
        'rope': dict(lu=(0.15,0), ru=(-0.1,0), la=(1.0,0.3), ra=(0.5,-0.3), lf=0.9, rf=0.6),
        'net_cast': dict(lu=(0.3,0), ru=(-0.2,0), la=(2.2,0.4), ra=(2.4,-0.5), lf=0.2, rf=0.2),
        'carry': dict(lu=(0.2,0), ru=(-0.2,0), la=(1.2,0.2), ra=(1.2,-0.2), lf=1.4, rf=1.4),
        'inspect': dict(lu=(0,0), ru=(0,0), la=(1.5,0.25), ra=(1.3,-0.25), lf=1.5, rf=1.7),
    }[pose]
    def limb(side, upper, fore, ang, fold, is_leg):
        s = -1 if side == 'L' else 1
        if is_leg:
            piv = empty(f"{name}_{side}Leg", (0, s*0.10, 0.0), (0, ang, 0), hips, 0.1)
            cyl(f"{name}_{side}Thigh", 0.075, upper, (0, 0, -upper/2), p['trousers'], piv, segs=10)
            piv2 = empty(f"{name}_{side}Knee", (0, 0, -upper), (0, -ang*0.5, 0), piv, 0.1)
            cyl(f"{name}_{side}Shin", 0.06, fore, (0, 0, -fore/2), p['trousers'], piv2, segs=10)
            box(f"{name}_{side}Boot", (0.26, 0.11, 0.09), (0.05, 0, -fore-0.04), p['rubber'], piv2)
        else:
            piv = empty(f"{name}_{side}Arm", (0, s*0.24, 0.55), (fold*s, ang, 0), hips, 0.1)
            cyl(f"{name}_{side}UpperArm", 0.05, upper, (0, 0, -upper/2), torso_m, piv, segs=10)
            piv2 = empty(f"{name}_{side}Elbow", (0, 0, -upper), (0, -poses['lf'] if side=='L' else -poses['rf'], 0), piv, 0.1)
            cyl(f"{name}_{side}Forearm", 0.042, fore, (0, 0, -fore/2), torso_m if coat else p['skin'], piv2, segs=10)
            sphere(f"{name}_{side}Hand", 0.05, (0, 0, -fore-0.03), p['glove'] if gloves else p['skin'], piv2, 10, 8, (1.2, 0.8, 1.0))
    limb('L', 0.45, 0.45, poses['lu'][0], 0, True)
    limb('R', 0.45, 0.45, poses['ru'][0], 0, True)
    limb('L', 0.30, 0.28, poses['la'][0], poses['la'][1], False)
    limb('R', 0.30, 0.28, poses['ra'][0], poses['ra'][1], False)
    return root

# ---------------------------------------------------------------- export / verify
def hierarchy(root):
    out = [root]
    for c in root.children: out += hierarchy(c)
    return out

def bbox(objs):
    mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
    bpy.context.view_layer.update()
    for o in objs:
        if o.type != 'MESH': continue
        for v in o.bound_box:
            w = o.matrix_world @ Vector(v)
            mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    return mn, mx

def stats(root):
    objs = hierarchy(root)
    tris = 0; verts = 0
    for o in objs:
        if o.type == 'MESH':
            me = o.data
            verts += len(me.vertices)
            tris += sum(len(p.vertices) - 2 for p in me.polygons)
    mn, mx = bbox(objs)
    return dict(objects=len(objs), meshes=sum(1 for o in objs if o.type=='MESH'), verts=verts, tris=tris,
                dims=[round(v, 2) for v in (mx - mn)], min=[round(v,2) for v in mn], max=[round(v,2) for v in mx],
                pivots=[o.name for o in objs if o.type == 'EMPTY' and o is not root])

import contextlib, io
@contextlib.contextmanager
def _quiet():
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            yield
    finally:
        pass

def export_glb(path, roots):
    if not isinstance(roots, (list, tuple)): roots = [roots]
    bpy.ops.object.select_all(action='DESELECT')
    for r in roots:
        for o in hierarchy(r): o.select_set(True)
    bpy.context.view_layer.objects.active = roots[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
              export_animations=True, export_yup=True, export_normals=True, export_materials='EXPORT',
              export_extras=True)
    # the fish carry their countershading in COLOR_0 rather than a texture
    for _k, _v in (('export_vertex_color', 'MATERIAL'), ('export_all_vertex_colors', True)):
        try:
            bpy.ops.export_scene.gltf.get_rna_type().properties[_k]
            kw[_k] = _v
        except Exception:
            pass
    with _quiet():
        bpy.ops.export_scene.gltf(**kw)
    return os.path.getsize(path)

def preview(path, roots, az=35, el=20, fov=38, sky=(0.66, 0.80, 0.90), res=(1024, 576), fill=1.25, focus=None, frame=60, cam_pos=None, cam_target=None, sun_energy=3.0):
    if not isinstance(roots, (list, tuple)): roots = [roots]
    objs = []
    for r in roots: objs += hierarchy(r)
    mn, mx = bbox(objs)
    center = (mn + mx) / 2 if focus is None else Vector(focus)
    radius = max((mx - mn).length / 2, 0.5)
    sc = bpy.context.scene
    sc.frame_set(frame)
    cam = bpy.data.cameras.new("PrevCam"); cam.lens_unit = 'FOV'; cam.angle = math.radians(fov)
    cam.clip_end = 5000
    camo = bpy.data.objects.new("PrevCam", cam); link(camo)
    if cam_pos is not None:
        pos = Vector(cam_pos)
        tgt = Vector(cam_target) if cam_target is not None else center
    else:
        dist = radius * fill / math.tan(math.radians(fov) / 2)
        a, e = math.radians(az), math.radians(el)
        pos = center + Vector((math.cos(e)*math.cos(a), math.cos(e)*math.sin(a), math.sin(e))) * dist
        tgt = center
    camo.location = pos
    camo.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camo
    sun = bpy.data.lights.new("PrevSun", 'SUN'); sun.energy = sun_energy; sun.angle = math.radians(2)
    suno = bpy.data.objects.new("PrevSun", sun); link(suno)
    suno.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    fillL = bpy.data.lights.new("PrevFill", 'SUN'); fillL.energy = 1.2; fillL.color = (0.75, 0.85, 1.0)
    fillo = bpy.data.objects.new("PrevFill", fillL); link(fillo)
    fillo.rotation_euler = (math.radians(60), 0, math.radians(140))
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    if bg: bg.inputs[0].default_value = (*sky, 1); bg.inputs[1].default_value = 1.0
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try: sc.render.engine = eng; break
        except Exception: continue
    try: sc.eevee.taa_render_samples = 24
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    try: sc.render.image_settings.media_type = 'IMAGE'
    except Exception: pass
    sc.render.film_transparent = False
    _vt = [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items]
    for _c in ('Standard', 'AgX', 'Filmic'):
        if _c in _vt:
            sc.view_settings.view_transform = _c; break
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    with _quiet():
        bpy.ops.render.render(write_still=True)
    for o in (camo, suno, fillo): bpy.data.objects.remove(o, do_unlink=True)
    return os.path.exists(path)

def finish(asset_id, rel_glb, roots, preview_kw=None, blend_name=None):
    glb = os.path.join(MODELS, rel_glb)
    size = export_glb(glb, roots)
    st = stats(roots[0] if isinstance(roots, (list, tuple)) else roots)
    if isinstance(roots, (list, tuple)) and len(roots) > 1:
        for r in roots[1:]:
            s2 = stats(r); st['tris'] += s2['tris']; st['objects'] += s2['objects']; st['pivots'] += s2['pivots']
    pv = os.path.join(PREV, asset_id + ".png")
    ok = preview(pv, roots, **(preview_kw or {}))
    blend_dir = os.path.join(ROOT, "blender", "blends"); os.makedirs(blend_dir, exist_ok=True)
    with _quiet():
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(blend_dir, (blend_name or asset_id) + ".blend"), copy=True)
    return dict(asset=asset_id, glb=glb, glb_bytes=size, preview=pv if ok else None, **st)


# ---------------------------------------------------------------- vertex colour shading
def vcol_mat(name, metallic=0.55, rough=0.30, spec=0.5):
    """Material driven by a COLOR_0 attribute, so a back-to-belly gradient survives
    the GLB export without any texture files."""
    try:
        if name in _MATS and _MATS[name].name and bpy.data.materials.get(name):
            return bpy.data.materials[name]
    except ReferenceError:
        _MATS.pop(name, None)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.get("Material Output") or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs[0], out.inputs[0])
    for n in list(nt.nodes):
        if n.type == 'VERTEX_COLOR':
            nt.nodes.remove(n)
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    vc.location = (-320, 240)
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    _MATS[name] = m
    return m


def _sstep(x, a, b):
    if b == a:
        return 0.0 if x < a else 1.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _mix3(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def shade_fish(obj, sections, back, flank, belly, line=None,
               line_at=0.12, line_w=0.16, noise=0.035, seed=1):
    """Paint a countershaded gradient onto a lofted fish body.

    ``sections`` is the loft's (x, half_w, half_h, z_centre) list, so the
    dorsal/ventral split follows the real silhouette rather than a flat plane.
    """
    import random as _r
    _r.seed(seed)
    me = obj.data
    ca = me.color_attributes.get("Col")
    if ca is None:
        ca = me.color_attributes.new(name="Col", type='FLOAT_COLOR', domain='POINT')
    xs = [s[0] for s in sections]
    hh = [s[2] for s in sections]
    zc = [s[3] for s in sections]

    def interp(x, arr):
        if x <= xs[0]:
            return arr[0]
        if x >= xs[-1]:
            return arr[-1]
        for i in range(len(xs) - 1):
            if xs[i] <= x <= xs[i + 1]:
                f = (x - xs[i]) / max(1e-6, xs[i + 1] - xs[i])
                return arr[i] + (arr[i + 1] - arr[i]) * f
        return arr[-1]

    for i, v in enumerate(me.vertices):
        h = max(1e-4, interp(v.co.x, hh))
        c = interp(v.co.x, zc)
        # -1 at the belly, +1 along the back
        t = max(-1.0, min(1.0, (v.co.z - c) / h))
        col = _mix3(belly, flank, _sstep(t, -0.62, 0.06))
        col = _mix3(col, back, _sstep(t, 0.10, 0.68))
        if line is not None:
            d = abs(t - line_at)
            col = _mix3(col, line, math.exp(-(d / line_w) ** 2) * 0.55)
        if noise:
            n = (_r.random() - 0.5) * noise
            col = (max(0.0, col[0] + n), max(0.0, col[1] + n), max(0.0, col[2] + n))
        ca.data[i].color = (col[0], col[1], col[2], 1.0)
    return obj
