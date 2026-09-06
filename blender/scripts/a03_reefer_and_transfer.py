"""Reefer container (hero, animatable doors + seal bar) and port transfer system."""
import bpy, math
from _lib import *
from a02_container_vessel import build_container

def build_reefer():
    reset_scene()
    p = P()
    root = empty("ReeferContainer", (0, 0, 0))
    c = build_container("Reefer", mat_=p['reefer'], parent=root, reefer=True)
    keyframe(bpy.data.objects["Reefer_DoorLPivot"], "rotation_euler",
             [(1, (0, 0, math.radians(115))), (60, (0, 0, 0)), (120, (0, 0, 0))], 'BEZIER')
    keyframe(bpy.data.objects["Reefer_DoorRPivot"], "rotation_euler",
             [(1, (0, 0, math.radians(-115))), (60, (0, 0, 0)), (120, (0, 0, 0))], 'BEZIER')
    keyframe(bpy.data.objects["Reefer_SealBarPivot"], "rotation_euler",
             [(1, (0, 0, 0)), (70, (0, 0, 0)), (100, (math.radians(-95), 0, 0)), (120, (math.radians(-95), 0, 0))], 'BEZIER')
    # pallets of cartons inside
    pal = empty("Reefer_Load", (-1.2, 0, 0), parent=root)
    for i in range(4):
        for s in (1, -1):
            base = empty(f"Reefer_Pallet{i}{s}", (-4.4 + i*2.6, s*0.6, 0), parent=pal)
            box(f"Reefer_PalletWood{i}{s}", (1.2, 1.0, 0.14), (0, 0, 0.07), p['pallet'], base)
            for k in range(4):
                box(f"Reefer_Carton{i}{s}{k}", (1.1, 0.92, 0.36), (0, 0, 0.26 + k*0.38), p['carton'], base, bevel=0.02)
                box(f"Reefer_Band{i}{s}{k}", (1.11, 0.93, 0.07), (0, 0, 0.32 + k*0.38), p['carton_band'], base)
    empty("Pivot_Reefer_Camera", (2.0, 0, 1.4), parent=root, size=0.6)
    return root

def build_transfer():
    reset_scene()
    p = P()
    root = empty("PortTransfer", (0, 0, 0))
    # quay
    box("Quay", (40.0, 26.0, 1.6), (0, -13.0, -0.8), p['concrete'], root)
    box("QuayEdge", (40.0, 0.6, 0.35), (0, -0.3, 0.18), p['orange'], root)
    for i in range(9):
        cyl(f"Bollard{i}", 0.28, 0.85, (-18 + i*4.5, -1.6, 0.42), p['steel_dark'], root, segs=12)
        sphere(f"BollardCap{i}", 0.32, (-18 + i*4.5, -1.6, 0.85), p['steel_dark'], root, 12, 8, (1,1,0.5))
    # water
    plane("Harbour", 120, 40, (0, 18.0, -0.4), p['water'], root, subd=24)
    # cold-chain transfer container on chassis (hero object, animated along quay)
    hero = empty("TransferHero", (-12.0, -8.0, 0), parent=root)
    box("Chassis", (7.4, 2.5, 0.35), (0, 0, 0.95), p['steel_dark'], hero)
    for s in (1, -1):
        for x in (-2.4, 2.4, 3.1):
            cyl(f"Wheel{s}{x}", 0.52, 0.34, (x, s*1.25, 0.52), p['rubber'], hero, rot=(math.radians(90), 0, 0), segs=16)
    ins = empty("InsulatedBox", (0, 0, 1.12), parent=hero)
    box("InsulatedBody", (6.6, 2.4, 2.3), (0, 0, 1.15), p['crate_white'], ins, bevel=0.06)
    box("InsulatedBand", (6.62, 2.42, 0.26), (0, 0, 1.75), p['carton_band'], ins)
    box("InsulatedUnit", (0.4, 2.2, 1.6), (-3.5, 0, 1.35), p['steel'], ins, bevel=0.04)
    box("InsulatedDisplay", (0.03, 0.5, 0.3), (-3.72, 0, 0.9), p['screen'], ins)
    text_mesh("InsulatedTemp", "-1 C", 0.14, p['screen'], (-3.75, 0, 0.9), ins, (math.radians(90), 0, math.radians(-90)))
    keyframe(hero, "location", [(1, (-12.0, -8.0, 0)), (120, (16.0, -8.0, 0))])
    # forklift
    fk = empty("Forklift", (6.0, -16.0, 0), (0, 0, math.radians(90)), root)
    box("FL_Body", (2.6, 1.5, 1.3), (0, 0, 0.85), p['orange'], fk, bevel=0.06)
    box("FL_Cab", (1.2, 1.4, 1.2), (-0.5, 0, 2.05), p['steel_dark'], fk)
    box("FL_Roof", (1.5, 1.6, 0.1), (-0.5, 0, 2.7), p['orange'], fk)
    for s in (1, -1):
        cyl(f"FL_WheelF{s}", 0.42, 0.3, (0.9, s*0.8, 0.42), p['rubber'], fk, rot=(math.radians(90),0,0), segs=14)
        cyl(f"FL_WheelR{s}", 0.34, 0.26, (-0.9, s*0.7, 0.34), p['rubber'], fk, rot=(math.radians(90),0,0), segs=14)
        cyl(f"FL_Mast{s}", 0.08, 3.0, (1.5, s*0.55, 1.5), p['steel_dark'], fk)
    forks = empty("FL_ForksPivot", (1.5, 0, 0.2), parent=fk)
    for s in (1, -1):
        box(f"FL_Fork{s}", (1.3, 0.14, 0.06), (0.65, s*0.4, 0), p['steel'], forks)
    box("FL_Carriage", (0.12, 1.1, 0.7), (1.5, 0, 0.55), p['steel_dark'], fk)
    keyframe(forks, "location", [(1, (1.5, 0, 0.2)), (40, (1.5, 0, 1.3)), (80, (1.5, 0, 1.3)), (120, (1.5, 0, 0.2))], 'BEZIER')
    figure("Transfer_Worker1", 'carry', p['shirt_orange'], root, (-4.0, -5.0, 0), (0, 0, math.radians(200)))
    figure("Transfer_Worker2", 'inspect', p['coat_white'], root, (2.5, -4.2, 0), (0, 0, math.radians(-30)), coat=True)
    # insulated bins queue
    for i in range(6):
        b = empty(f"Bin{i}", (-16 + i*3.0, -3.4, 0), parent=root)
        box(f"BinBody{i}", (1.5, 1.2, 1.0), (0, 0, 0.5), p['crate_white'], b, bevel=0.06)
        box(f"BinLid{i}", (1.52, 1.22, 0.1), (0, 0, 1.02), p['crate_blue'], b)
    # gantry crane leg suggestion
    for s in (1, -1):
        cyl(f"CraneLeg{s}", 0.5, 22.0, (14.0 + s*6.0, -20.0, 11.0), p['orange'], root, segs=10)
    box("CraneBeam", (2.0, 30.0, 1.6), (14.0, -14.0, 22.0), p['orange'], root)
    empty("Pivot_Transfer_Camera", (0, -6, 3.0), parent=root, size=1)
    return root
