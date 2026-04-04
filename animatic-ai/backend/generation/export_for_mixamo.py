"""
export_for_mixamo.py — Конвертация GLB → OBJ для Mixamo
"""
import sys
import os
import trimesh

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(PROJECT_ROOT, 'output')

# Загружаем геометрию
geo_path = os.path.join(OUTPUT, 'geometry.glb')
if not os.path.exists(geo_path):
    print(f"ERROR: {geo_path} not found. Run run_full_pipeline.py first.")
    sys.exit(1)

scene = trimesh.load(geo_path)
mesh = list(scene.geometry.values())[0]

# Сохраняем в OBJ
obj_path = os.path.join(OUTPUT, 'model_for_mixamo.obj')
mesh.export(obj_path, file_type='obj')
print(f"[OK] OBJ saved: {obj_path}")
print(f"     Vertices: {len(mesh.vertices)}")
print(f"     Faces: {len(mesh.faces)}")

# Сохраняем в FBX (если есть pymeshlab)
try:
    import pymeshlab
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(obj_path)
    fbx_path = os.path.join(OUTPUT, 'model_for_mixamo.fbx')
    ms.save_current_mesh(fbx_path)
    print(f"[OK] FBX saved: {fbx_path}")
except Exception as e:
    print(f"[INFO] FBX export not available ({e})")
    print(f"       Use the OBJ file instead — Mixamo accepts OBJ")

print(f"\nЗагрузи {obj_path} на https://www.mixamo.com → Upload Character")
