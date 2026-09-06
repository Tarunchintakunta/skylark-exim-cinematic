"""Higgsfield Blender collector package.

Collects, from the verified Blender scenes:
  * cinematic chapter plates (the exact camera of each website chapter)
  * hero-asset turntables
  * a camera-path + prompt manifest Higgsfield's Blender collector consumes

Everything lands under public/assets/media/ so the website can ship the Blender
plates today and swap in Higgsfield video the moment credits are available.
"""
import bpy, math, os, json, importlib
import _lib; importlib.reload(_lib)
from _lib import ROOT, preview, reset_scene

COLLECT = os.path.join(ROOT, "public", "assets", "media")
PLATES = os.path.join(COLLECT, "fallbacks")
TURN = os.path.join(COLLECT, "higgsfield", "collector", "turntables")
META = os.path.join(COLLECT, "higgsfield", "collector")

NEG_COMMON = "night, storm, dirty handling, unsafe deck, spoiled seafood, blood, gore, cartoon, low quality, illegible text, fake logos, tourist beach"

# chapter plate = (id, module, builder, camera kw, higgsfield prompt)
PLATES_SPEC = [
    ("ch01-opening-port", "a01_fishing_vessel", "build",
     dict(cam_pos=(-30, -46, 12), cam_target=(2, 0, 4), fov=44, sky=(0.72, 0.85, 0.93), sun_energy=3.2),
     "Premium cinematic shot of a large Indian fishing vessel preparing to leave Visakhapatnam port for the Bay of Bengal, bright 10 AM sunlight, blue-green water, humid coastal haze, fishermen boarding with clean equipment, insulated crates and nets visible, high-end seafood export film, realistic maritime scale, slow dolly camera, 16:9"),
    ("ch02-boarding", "a01_fishing_vessel", "build",
     dict(cam_pos=(-14, -17, 8.5), cam_target=(-2, 1, 4.2), fov=48, sky=(0.74, 0.86, 0.94), sun_energy=3.2),
     "Indian fishing crew boarding a large fishing vessel at Visakhapatnam with nets, insulated crates and ice boxes, bright late-morning sunlight, clean professional seafood operation, cinematic dock-to-deck camera push, premium export film, 16:9"),
    ("ch05-nets", "a05_ocean", "build_nets",
     dict(cam_pos=(-13, -16, 7), cam_target=(0, 3, -1), fov=48, sky=(0.70, 0.84, 0.93), sun_energy=3.0),
     "Indian fishing crew casting nets from a large fishing vessel in the Bay of Bengal, bright daylight, waves and clouds, cinematic deck-level camera, clean professional seafood operation, ropes and nets moving through water, export-quality documentary commercial, 16:9"),
    ("ch06-catch", "a04_products", "build_swordfish",
     dict(cam_pos=(3.2, -4.4, 1.5), cam_target=(0, 1.2, 0), fov=40, sky=(0.74, 0.86, 0.93), sun_energy=3.0),
     "Premium seafood export cinematic scene showing swordfish and tuna as hero ocean catch on a clean fishing vessel deck, bright Bay of Bengal daylight, ice crates, careful handling, realistic texture, no gore, high-end Indian export film, 16:9"),
    ("ch07-chilled-hold", "a05_ocean", "build_chilled_storage",
     dict(cam_pos=(-2.35, -1.95, 2.15), cam_target=(1.4, -0.5, 1.05), fov=58, sky=(0.85, 0.91, 0.96), sun_energy=1.0),
     "Cinematic close-up of swordfish and tuna moving into clean onboard chilled fish storage, crushed ice, temperature display, insulated storage hold, bright coastal daylight glints, professional cold-chain discipline at sea, premium seafood export commercial, 16:9"),
    ("ch09-transfer", "a03_reefer_and_transfer", "build_transfer",
     dict(cam_pos=(-18, -26, 9), cam_target=(2, -8, 2), fov=48, sky=(0.76, 0.87, 0.94), sun_energy=3.1),
     "Large Indian fishing vessel returning to Visakhapatnam port from the Bay of Bengal, late morning sunlight, cranes and containers visible, clean cold-chain transfer operation beginning, cinematic aerial-to-dock camera, premium seafood logistics export film, 16:9"),
    ("ch10-processing", "a06_facility", "build_processing",
     dict(cam_pos=(-11.4, -6.6, 2.7), cam_target=(4.0, 1.5, 1.5), fov=56, sky=(0.86, 0.91, 0.95), sun_energy=1.2),
     "Premium seafood processing facility in India handling swordfish, tuna and shrimp, stainless steel tables, clean cutting and portioning stations, hygienic PPE workers, washing channels, grading conveyor, bright white-blue industrial light, non-graphic, high-trust export quality, 16:9"),
    ("ch12-ponds", "a07_world", "build_ponds",
     dict(cam_pos=(-30, -96, 62), cam_target=(0, 0, 0), fov=44, sky=(0.74, 0.86, 0.94), sun_energy=3.2),
     "Aerial cinematic view of coastal Andhra Pradesh aquaculture shrimp ponds in a precise grid with bund roads, water sampling technician at the pond edge, harvest crates and batch tags, bright 10 AM daylight, audit-ready and organised, premium Indian seafood export film, 16:9"),
    ("ch13-product-forms", "a04_products", "build_shrimp_forms",
     dict(cam_pos=(2.2, -3.4, 2.6), cam_target=(0.4, 0, 0.1), fov=40, sky=(0.90, 0.93, 0.95), sun_energy=1.6),
     "Premium export shrimp product forms presented as a clean seafood catalogue: HOSO head on shell on, HLSO headless shell on, PUD peeled undeveined, PTO peeled tail on, stainless trays, bright even studio light, consistent scale, high-end product photography, 16:9"),
    ("ch15-qc", "a06_facility", "build_qc_lab",
     dict(cam_pos=(-3.4, -2.9, 2.0), cam_target=(1.0, 2.0, 1.15), fov=52, sky=(0.88, 0.92, 0.95), sun_energy=1.1),
     "Sterile seafood residue testing lab in India, serious QC inspector, sample vials, lab instrument, HACCP and EIC documentation mood, residue certificate folder, bright clean lighting, evidence-led premium export film, 16:9"),
    ("ch16-freezing", "a06_facility", "build_freezing",
     dict(cam_pos=(-9.4, -5.1, 2.6), cam_target=(4.0, -1.5, 1.6), fov=54, sky=(0.87, 0.93, 0.97), sun_energy=1.2),
     "Beautiful cinematic macro of seafood entering IQF freezing and glazing, swordfish and tuna portions and shrimp products, frost crystals, clean glazing mist, cold vapour, stainless steel, bright cold-chain lighting, premium export commercial, 16:9"),
    ("ch17-cold-storage", "a06_facility", "build_cold_storage",
     dict(cam_pos=(-17.0, 0, 2.6), cam_target=(16, 0, 3.0), fov=58, sky=(0.82, 0.88, 0.93), sun_energy=0.9),
     "Large seafood export cold storage, long aisle of pallet racking receding into the distance, sealed white cartons, temperature display reading minus 20 degrees Celsius, 700 pallet capacity, cold blue-white lighting, premium logistics film, 16:9"),
    ("ch18-documents", "a06_facility", "build_documents",
     dict(az=52, el=44, fov=36, fill=1.15, sky=(0.90, 0.93, 0.95), sun_energy=1.6),
     "Export documentation desk for Indian seafood: health certificate, packing list, certificate of origin, residue certificate, compliance records, HACCP and EIC documents assembled into a clean stack, bright office light, precise and trustworthy, premium export film, 16:9"),
    ("ch19-reefer", "a03_reefer_and_transfer", "build_reefer",
     dict(cam_pos=(11, -9, 4.6), cam_target=(0, 0, 1.4), fov=46, sky=(0.78, 0.88, 0.94), sun_energy=3.0),
     "Packed seafood export cartons loaded into a reefer container at Visakhapatnam, temperature set to minus 20, doors closing, seal bar dropping, afternoon sunlight, precise cold-chain discipline, premium export logistics film, 16:9"),
    ("ch20-container-vessel", "a02_container_vessel", "build",
     dict(cam_pos=(-150, -230, 120), cam_target=(0, 0, 14), fov=38, sky=(0.72, 0.85, 0.93), sun_energy=3.2),
     "Top-down cinematic sky view of reefer containers moving through Visakhapatnam port and loading onto a large container vessel, afternoon sunlight, precise container grid, premium seafood export logistics, 16:9"),
    ("ch21-globe", "a07_world", "build_globe",
     dict(az=62, el=18, fov=36, fill=1.45, sky=(0.09, 0.15, 0.21), sun_energy=2.2),
     "Stylised premium globe with glowing export route arcs leaving India for Rotterdam, Osaka, Dubai, New York and Singapore, clean cinematic navy and warm gold, seafood export logistics, not crypto styling, 16:9"),
]

TURNTABLES = [
    ("large_fishing_vessel", "a01_fishing_vessel", "build", 34),
    ("swordfish_hero", "a04_products", "build_swordfish", 34),
    ("tuna_hero", "a04_products", "build_tuna", 34),
    ("shrimp_product_forms", "a04_products", "build_shrimp_forms", 34),
    ("reefer_container", "a03_reefer_and_transfer", "build_reefer", 36),
    ("globe_routes_from_india", "a07_world", "build_globe", 36),
]


def run():
    os.makedirs(PLATES, exist_ok=True)
    os.makedirs(TURN, exist_ok=True)
    os.makedirs(META, exist_ok=True)
    out = {"plates": [], "turntables": [], "errors": []}

    for aid, modn, fn, camkw, prompt in PLATES_SPEC:
        try:
            mod = importlib.import_module(modn)
            importlib.reload(mod)
            root = getattr(mod, fn)()
            path = os.path.join(PLATES, aid + ".png")
            kw = dict(camkw)
            kw.setdefault("res", (1600, 900))
            preview(path, root, **kw)
            out["plates"].append({"id": aid, "file": path, "prompt": prompt, "negative": NEG_COMMON,
                                  "camera": {k: v for k, v in camkw.items() if k.startswith("cam") or k in ("az", "el", "fov", "fill")}})
        except Exception as e:
            out["errors"].append(f"{aid}: {e}")

    for aid, modn, fn, fov in TURNTABLES:
        try:
            mod = importlib.import_module(modn)
            importlib.reload(mod)
            root = getattr(mod, fn)()
            frames = []
            for i, az in enumerate((30, 120, 210, 300)):
                pth = os.path.join(TURN, f"{aid}_{i:02d}.png")
                preview(pth, root, az=az, el=18, fov=fov, fill=1.12, res=(960, 540))
                frames.append(pth)
            out["turntables"].append({"id": aid, "frames": frames})
        except Exception as e:
            out["errors"].append(f"turntable {aid}: {e}")

    manifest = {
        "collector": "higgsfield-blender-collector",
        "project": "Skylark Exim Cinematic Scroll",
        "source": "Blender 5.2 via Blender MCP",
        "units": "metres, Z up in Blender, Y up in exported GLB",
        "notes": "Each plate is rendered from the exact camera used by the matching website chapter, "
                 "so a Higgsfield image-to-video job started from the plate lands in the same framing.",
        "negative_prompt": NEG_COMMON,
        "plates": out["plates"],
        "turntables": out["turntables"],
        "submission": {
            "image_model": "nano_banana_pro",
            "video_model": "seedance_2_0",
            "aspect_ratio": "16:9",
            "duration_seconds": 5,
            "role": "start_image",
            "flow": [
                "media_upload the plate PNG, then media_confirm",
                "generate_image with the plate as image_references to raise it to a photoreal frame",
                "generate_video with that frame as start_image to produce the chapter loop",
                "save the MP4 to public/assets/media/higgsfield/<chapter id>.mp4",
            ],
        },
    }
    with open(os.path.join(META, "collector_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    out["manifest"] = os.path.join(META, "collector_manifest.json")
    out["plates"] = [p["id"] for p in out["plates"]]
    out["turntables"] = [t["id"] for t in out["turntables"]]
    return out
