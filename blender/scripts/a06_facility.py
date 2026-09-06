"""Processing facility, QC lab, freezing/glazing, cold storage, export documents."""
import bpy, math
from _lib import *

def _room(name, W, D, H, root, floor_m=None, wall_m=None, lights=True, rows=3):
    p = P()
    box(name+"_Floor", (W, D, 0.12), (0, 0, -0.06), floor_m or p['floor'], root)
    for s in (1, -1):
        box(f"{name}_WallY{s}", (W, 0.15, H), (0, s*D/2, H/2), wall_m or p['wall'], root)
        box(f"{name}_WallX{s}", (0.15, D, H), (s*W/2, 0, H/2), wall_m or p['wall'], root)
    box(name+"_Ceiling", (W, D, 0.14), (0, 0, H), wall_m or p['wall'], root)
    if lights:
        for i in range(rows):
            for j in range(3):
                box(f"{name}_Light{i}{j}", (2.4, 0.34, 0.09), (i*(W/rows) - W/2 + W/(2*rows), j*(D/3) - D/3, H-0.10),
                    p['lamp'], root)

def build_processing():
    reset_scene(); p = P()
    root = empty("ProcessingFacility", (0, 0, 0))
    W, D, H = 26.0, 16.0, 5.2
    _room("Plant", W, D, H, root, rows=5)
    # stainless cutting tables
    for i in range(4):
        t = empty(f"CutStation{i}", (i*4.6 - 7.0, -4.4, 0), parent=root)
        box(f"CutTop{i}", (3.8, 1.5, 0.07), (0, 0, 0.92), p['stainless'], t, bevel=0.02)
        box(f"CutSplash{i}", (3.8, 0.06, 0.28), (0, 0.72, 1.09), p['stainless'], t)
        for sx in (-1, 1):
            for sy in (-1, 1):
                cyl(f"CutLeg{i}{sx}{sy}", 0.045, 0.9, (sx*1.7, sy*0.6, 0.45), p['stainless'], t, segs=8)
        box(f"CutBoard{i}", (1.2, 0.85, 0.035), (-0.6, -0.15, 0.96), p['crate_white'], t, bevel=0.01)
        # portions
        for k in range(3):
            box(f"Portion{i}{k}", (0.30, 0.22, 0.09), (-0.9 + k*0.32, -0.15, 1.02),
                mat("TunaLoin", (0.72, 0.16, 0.14), 0.05, 0.32), t, bevel=0.015)
        box(f"Tray{i}", (0.9, 0.65, 0.10), (1.2, -0.1, 1.0), p['stainless'], t, bevel=0.02)
        cyl(f"CutLamp{i}", 0.20, 0.5, (0, 0, H-0.7), p['lamp'], t, segs=12)
        figure(f"Cutter{i}", 'inspect', p['coat_white'], root, (i*4.6 - 7.0 - 0.2, -5.6, 0), (0, 0, math.radians(90)), coat=True)
    # washing channels
    for j in range(2):
        wsh = empty(f"WashChannel{j}", (0, j*2.0 + 0.4, 0), parent=root)
        box(f"WashTrough{j}", (18.0, 1.1, 0.55), (0, 0, 0.75), p['stainless'], wsh, bevel=0.04)
        box(f"WashWater{j}", (17.6, 0.95, 0.28), (0, 0, 0.90), p['water'], wsh)
        for k in range(9):
            cyl(f"WashJet{j}{k}", 0.035, 0.5, (k*2.0 - 8.0, 0.0, 1.35), p['stainless'], wsh, segs=8)
        cyl(f"WashDrum{j}", 0.75, 2.4, (-9.6, 0, 1.05), p['stainless'], wsh, rot=(0, math.radians(90), 0), segs=18)
    # grading conveyor with diverging channels
    conv = empty("GradingConveyor", (0, 5.4, 0), parent=root)
    box("ConvBed", (20.0, 1.4, 0.12), (0, 0, 0.95), p['steel_dark'], conv)
    box("ConvBelt", (20.0, 1.3, 0.05), (0, 0, 1.03), p['rubber'], conv)
    for k in range(5):
        box(f"GradeChute{k}", (3.0, 0.9, 0.08), (k*3.6 - 7.2, -1.5, 0.80), p['stainless'], conv, rot=(0, math.radians(-9), 0))
        box(f"GradeBin{k}", (1.1, 0.9, 0.55), (k*3.6 - 7.2, -2.6, 0.28), p['crate_blue'], conv, bevel=0.04)
        text_mesh(f"GradeLabel{k}", ["10/20","21/25","26/30","31/40","41/50"][k], 0.17,
                  mat("LabelInk2", (0.06,0.13,0.16), 0, 0.4), (k*3.6 - 7.2, -2.6, 0.58), conv, (0, 0, math.radians(-90)))
    for sx in range(11):
        cyl(f"ConvLeg{sx}", 0.05, 0.95, (sx*2.0 - 10.0, 0.55, 0.47), p['stainless'], conv, segs=8)
    figure("Grader", 'inspect', p['coat_white'], root, (2.5, 4.0, 0), (0, 0, math.radians(-90)), coat=True)
    figure("Washer", 'stand', p['coat_white'], root, (-8.0, 2.2, 0), (0, 0, math.radians(-45)), coat=True)
    # roller door / entry
    box("PlantDoorFrame", (0.2, 5.0, 4.2), (-W/2 + 0.1, -3.0, 2.1), p['steel_dark'], root)
    dp = empty("PlantDoorPivot", (-W/2 + 0.14, -3.0, 4.1), parent=root)
    box("PlantDoor", (0.08, 4.6, 3.9), (0, 0, -1.95), p['steel'], dp)
    keyframe(dp, "scale", [(1, (1, 1, 1)), (50, (1, 1, 0.05)), (120, (1, 1, 0.05))], 'BEZIER')
    empty("Pivot_Plant_Camera", (-9.0, -2.0, 1.8), parent=root, size=0.8)
    return root

def build_qc_lab():
    reset_scene(); p = P()
    root = empty("QCLabStation", (0, 0, 0))
    W, D, H = 11.0, 8.0, 3.4
    _room("Lab", W, D, H, root, rows=3)
    bench = empty("LabBench", (0, 2.4, 0), parent=root)
    box("BenchTop", (8.0, 1.1, 0.08), (0, 0, 0.92), p['stainless'], bench, bevel=0.02)
    box("BenchBody", (7.8, 0.95, 0.85), (0, 0, 0.45), p['wall'], bench, bevel=0.03)
    box("BenchSplash", (8.0, 0.06, 0.5), (0, 0.52, 1.2), p['stainless'], bench)
    # analyser instrument (HPLC-like)
    inst = empty("Analyser", (-2.3, 2.2, 0.96), parent=root)
    box("AnalyserBody", (1.5, 0.8, 0.95), (0, 0, 0.48), p['crate_white'], inst, bevel=0.04)
    box("AnalyserScreen", (0.62, 0.03, 0.4), (-0.35, -0.42, 0.62), p['screen'], inst)
    text_mesh("AnalyserText", "PASS", 0.11, p['screen'], (-0.35, -0.44, 0.62), inst, (math.radians(90), 0, 0))
    for i in range(3):
        cyl(f"AnalyserKnob{i}", 0.05, 0.05, (0.35 + i*0.16, -0.42, 0.35), p['steel_dark'], inst, rot=(math.radians(90),0,0), segs=10)
    box("AnalyserTray", (0.9, 0.5, 0.1), (0.1, -0.1, 1.0), p['stainless'], inst)
    # vial rack
    rack = empty("VialRack", (0.4, 2.3, 0.96), parent=root)
    box("RackBase", (0.8, 0.45, 0.06), (0, 0, 0.03), p['steel_dark'], rack)
    for i in range(4):
        for j in range(2):
            cyl(f"Vial{i}{j}", 0.028, 0.15, (i*0.17 - 0.26, j*0.2 - 0.1, 0.12), p['glass'], rack, segs=10)
            cyl(f"VialCap{i}{j}", 0.030, 0.03, (i*0.17 - 0.26, j*0.2 - 0.1, 0.20), p['orange'], rack, segs=10)
    # inspection lamp + sample
    lampp = empty("InspectionLamp", (2.6, 2.0, 0.96), parent=root)
    cyl("LampStem", 0.03, 0.9, (0, 0.35, 0.45), p['steel'], lampp, segs=8)
    cyl("LampArm", 0.028, 0.7, (0, 0.05, 0.88), p['steel'], lampp, rot=(math.radians(72), 0, 0), segs=8)
    torus("LampRing", 0.22, 0.035, (0, -0.25, 1.05), p['steel'], lampp, segs=18, rings=6)
    cyl("LampGlow", 0.20, 0.02, (0, -0.25, 1.05), p['lamp'], lampp, segs=18)
    box("SampleTray", (0.5, 0.4, 0.04), (0, -0.25, 0.02), p['stainless'], lampp, bevel=0.01)
    import a04_products as PR
    PR.shrimp("QC_Sample", "HLSO", lampp, (0, -0.25, 0.10), (0, 0, math.radians(30)), 0.7)
    # document stack + clipboard
    docs = empty("CertificateStack", (-3.6, 1.9, 0.96), parent=root)
    for i, nm in enumerate(("Residue Certificate", "HACCP Record", "EIC Document", "Batch File")):
        d = box(f"Doc{i}", (0.42, 0.30, 0.006), (0, 0, i*0.012), p['paper'], docs, )
        d.rotation_euler = (0, 0, math.radians((i % 2) * 3 - 1.5))
    box("DocFolder", (0.48, 0.34, 0.03), (0.6, -0.1, 0.015), p['carton_band'], docs, bevel=0.01)
    # clearance stamp
    st = empty("ClearanceStampPivot", (-2.9, 1.5, 1.05), parent=root)
    cyl("StampBody", 0.07, 0.16, (0, 0, 0.10), p['steel_dark'], st, segs=12)
    cyl("StampHandle", 0.10, 0.05, (0, 0, 0.21), p['rubber'], st, segs=12)
    keyframe(st, "location", [(1, (-2.9, 1.5, 1.30)), (40, (-2.9, 1.5, 1.00)), (55, (-2.9, 1.5, 1.30)), (120, (-2.9, 1.5, 1.30))], 'BEZIER')
    # inspector
    figure("QC_Inspector", 'inspect', p['coat_white'], root, (2.4, 0.9, 0), (0, 0, math.radians(75)), coat=True)
    # wall document board
    board = empty("HACCPBoard", (0, D/2 - 0.1, 2.0), parent=root)
    box("BoardPanel", (4.2, 0.05, 1.5), (0, 0, 0), p['crate_white'], board, bevel=0.02)
    for i in range(3):
        box(f"BoardCard{i}", (1.1, 0.02, 1.0), (i*1.3 - 1.3, -0.04, 0.0), p['paper'], board)
    empty("Pivot_QC_Camera", (0, -2.2, 1.5), parent=root, size=0.6)
    return root

def build_freezing():
    reset_scene(); p = P()
    root = empty("FreezingGlazingSystem", (0, 0, 0))
    W, D, H = 22.0, 12.0, 5.0
    _room("Freeze", W, D, H, root, floor_m=p['floor'], wall_m=p['stainless'], rows=4)
    # IQF tunnel
    tun = empty("IQFTunnel", (0, -2.5, 0), parent=root)
    box("TunnelShell", (16.0, 3.2, 2.6), (0, 0, 1.7), p['stainless'], tun, bevel=0.08)
    box("TunnelMouthIn", (0.3, 2.4, 1.1), (-8.0, 0, 1.15), p['steel_dark'], tun)
    box("TunnelMouthOut", (0.3, 2.4, 1.1), (8.0, 0, 1.15), p['steel_dark'], tun)
    for i in range(5):
        box(f"TunnelWindow{i}", (1.6, 3.25, 0.6), (i*3.0 - 6.0, 0, 2.1), p['glass'], tun)
    box("TunnelBelt", (17.5, 1.6, 0.06), (0, 0, 1.0), p['rubber'], tun)
    # product on belt (IQF pieces, animatable)
    belt = empty("IQFProduct", (0, -2.5, 1.06), parent=root)
    import a04_products as PR
    for i in range(14):
        PR.shrimp(f"IQF_{i}", "PTO", belt, (i*1.15 - 8.0, ((i*37) % 7) * 0.16 - 0.5, 0.06),
                  (0, 0, math.radians((i*53) % 360)), 0.55)
    keyframe(belt, "location", [(1, (-1.2, -2.5, 1.06)), (120, (1.2, -2.5, 1.06))])
    # frost anchors
    for i in range(10):
        empty(f"Anchor_Frost{i}", (i*1.7 - 7.6, -2.5, 1.4), parent=root, size=0.2)
    # blast / block freezer cabinets
    for i in range(3):
        c = empty(f"BlastCab{i}", (i*5.0 - 5.0, 4.0, 0), parent=root)
        box(f"BlastBody{i}", (4.2, 2.6, 3.4), (0, 0, 1.7), p['stainless'], c, bevel=0.06)
        dp = empty(f"BlastDoorPivot{i}", (-2.1, -1.3, 1.6), parent=c)
        box(f"BlastDoor{i}", (0.12, 2.5, 3.0), (0.06, 1.25, 0), p['crate_white'], dp, bevel=0.03)
        box(f"BlastDisplay{i}", (0.6, 0.03, 0.3), (0.6, -1.32, 2.6), p['screen'], c)
        text_mesh(f"BlastTemp{i}", ["-40 C", "-35 C", "-18 C"][i], 0.13, p['screen'], (0.6, -1.35, 2.6), c, (math.radians(90), 0, 0))
        keyframe(dp, "rotation_euler", [(1, (0,0,0)), (45, (0, 0, math.radians(-95))), (85, (0,0,math.radians(-95))), (120, (0,0,0))], 'BEZIER')
    # glazing station
    gl = empty("GlazingStation", (9.0, -2.5, 0), parent=root)
    box("GlazeFrame", (2.6, 3.0, 2.8), (0, 0, 1.6), p['stainless'], gl, bevel=0.05)
    for i in range(6):
        cyl(f"GlazeNozzle{i}", 0.035, 0.3, ((i % 3)*0.8 - 0.8, (i//3)*1.0 - 0.5, 2.1), p['stainless'], gl, segs=8)
        empty(f"Anchor_Glaze{i}", ((i % 3)*0.8 - 0.8, (i//3)*1.0 - 0.5, 1.85), parent=gl, size=0.15)
    box("GlazeCurtain", (2.2, 2.4, 0.9), (0, 0, 1.5), mat("Mist", (0.9,0.96,1.0), 0, 0.1, alpha=0.16), gl)
    # finished IQF tray
    box("IQFTray", (1.6, 1.1, 0.09), (12.0, 1.0, 0.95), p['stainless'], root, bevel=0.02)
    box("IQFTrayStand", (1.4, 0.9, 0.9), (12.0, 1.0, 0.45), p['stainless'], root)
    for i in range(9):
        PR.shrimp(f"Finished_{i}", "PTO", root, (12.0 + (i%3)*0.4 - 0.4, 1.0 + (i//3)*0.3 - 0.3, 1.02), (0,0,math.radians(i*40)), 0.5)
    figure("Freeze_Operator", 'stand', p['coat_white'], root, (-9.5, 1.5, 0), (0, 0, math.radians(-20)), coat=True)
    empty("Pivot_Freeze_Camera", (-2.0, -7.0, 1.8), parent=root, size=0.8)
    return root

def build_cold_storage():
    reset_scene(); p = P()
    root = empty("ColdStorage700", (0, 0, 0))
    W, D, H = 40.0, 26.0, 9.0
    box("CS_Floor", (W, D, 0.2), (0, 0, -0.1), p['floor'], root)
    for s in (1, -1):
        box(f"CS_WallY{s}", (W, 0.2, H), (0, s*D/2, H/2), p['crate_white'], root)
    box("CS_WallXback", (0.2, D, H), (W/2, 0, H/2), p['crate_white'], root)
    box("CS_Ceiling", (W, D, 0.2), (0, 0, H), p['crate_white'], root)
    # doors at -X
    box("CS_DoorFrame", (0.3, 7.0, 5.4), (-W/2, 0, 2.7), p['steel_dark'], root)
    for s in (1, -1):
        dp = empty(f"CS_Door{s}Pivot", (-W/2 + 0.06, s*3.4, 2.6), parent=root)
        box(f"CS_Door{s}", (0.16, 3.3, 5.0), (0, -s*1.65, 0), p['crate_white'], dp, bevel=0.04)
        keyframe(dp, "rotation_euler", [(1, (0,0,0)), (40, (0, 0, math.radians(-s*100))), (110, (0,0,math.radians(-s*100))), (120, (0,0,0))], 'BEZIER')
    # racking rows (700-pallet scale)
    total = 0
    for r in range(6):
        row = empty(f"CS_Row{r}", (0, r*4.2 - 10.5, 0), parent=root)
        for s in (1, -1):
            # uprights
            for i in range(15):
                cyl(f"CS_Up{r}{s}{i}", 0.07, H-1.0, (i*2.6 - 18.2, s*0.65, (H-1.0)/2), p['cont_blue'], row, segs=8)
            for lvl in range(4):
                box(f"CS_Beam{r}{s}{lvl}", (37.0, 0.12, 0.12), (0, s*0.65, 1.6 + lvl*1.85), p['orange'], row)
        for lvl in range(4):
            for i in range(14):
                if total >= 700: break
                pl = empty(f"CS_Pal{r}{lvl}{i}", (i*2.6 - 16.9, 0, 1.7 + lvl*1.85), parent=row)
                box(f"CS_PalWood{r}{lvl}{i}", (1.2, 1.0, 0.13), (0, 0, 0.065), p['pallet'], pl)
                box(f"CS_PalLoad{r}{lvl}{i}", (1.16, 0.96, 1.30), (0, 0, 0.78), p['carton'], pl)
                box(f"CS_PalBand{r}{lvl}{i}", (1.17, 0.97, 0.16), (0, 0, 0.85), p['carton_band'], pl)
                total += 1
    # temperature display
    disp = empty("CS_TempDisplay", (-W/2 + 0.4, -5.0, 3.2), (0, 0, math.radians(0)), root)
    box("CS_DispBody", (0.12, 2.4, 1.2), (0, 0, 0), p['steel_dark'], disp, bevel=0.03)
    box("CS_DispScreen", (0.03, 2.2, 0.6), (0.07, 0, 0.2), p['screen'], disp)
    text_mesh("CS_DispTemp", "-20 C", 0.32, p['screen'], (0.10, 0, 0.22), disp, (math.radians(90), 0, math.radians(90)))
    text_mesh("CS_DispCap", "700 PALLETS", 0.14, p['screen'], (0.10, 0, -0.28), disp, (math.radians(90), 0, math.radians(90)))
    for i in range(12):
        box(f"CS_Lamp{i}", (3.0, 0.3, 0.1), ((i%4)*9.5 - 14.2, (i//4)*8.5 - 8.5, H-0.14), p['lamp'], root)
    figure("CS_Worker", 'stand', p['coat_white'], root, (-14.0, -1.0, 0), (0, 0, 0), coat=True)
    empty("Pivot_CS_Camera", (-17.0, 0, 2.2), parent=root, size=1.0)
    empty("Meta_PalletCount", (0, 0, 0), parent=root, size=0.1)
    return root

def build_documents():
    reset_scene(); p = P()
    root = empty("ExportDocuments", (0, 0, 0))
    docs = ["Health Certificate", "Packing List", "Certificate of Origin",
            "Residue Certificate", "Compliance Record", "HACCP", "EIC"]
    ink = mat("DocInk", (0.06, 0.13, 0.16), 0, 0.45)
    accent = mat("DocAccent", (0.05, 0.43, 0.56), 0, 0.4)
    for i, d in enumerate(docs):
        card = empty(f"Doc_{i}", (0, 0, i*0.16), parent=root)
        box(f"DocCard{i}", (2.1, 1.5, 0.02), (0, 0, 0), p['paper'], card, bevel=0.006)
        box(f"DocHeader{i}", (2.1, 0.22, 0.024), (0, 0.6, 0.002), accent, card)
        text_mesh(f"DocTitle{i}", d, 0.11, ink, (0, 0.30, 0.014), card)
        for L in range(5):
            box(f"DocLine{i}_{L}", (1.5 - (L % 3)*0.25, 0.03, 0.021), (-0.2, 0.06 - L*0.13, 0.001), ink, card)
        box(f"DocStamp{i}", (0.36, 0.36, 0.022), (0.72, -0.44, 0.002), mat("StampInk", (0.72,0.22,0.16), 0, 0.5), card)
        keyframe(card, "location", [(1, (0, 0, 0.0)), (40 + i*6, (0, 0, i*0.16)), (120, (0, 0, i*0.16))], 'BEZIER')
        keyframe(card, "rotation_euler", [(1, (0, 0, 0)), (40 + i*6, (0, 0, math.radians((i % 3 - 1) * 4))), (120, (0, 0, math.radians((i % 3 - 1) * 4)))], 'BEZIER')
    box("DocDesk", (3.4, 2.4, 0.08), (0, 0, -0.10), p['stainless'], root, bevel=0.02)
    empty("Pivot_Docs_Camera", (0, -2.0, 1.2), parent=root, size=0.4)
    return root
