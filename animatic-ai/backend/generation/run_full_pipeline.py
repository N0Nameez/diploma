import sys, os, gc, torch, trimesh

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'models', 'Hunyuan3D-2', 'hy3dgen', 'texgen', 'custom_rasterizer'))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'models', 'Hunyuan3D-2'))
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
os.environ['HF_HUB_DISABLE_XET'] = '1'

from PIL import Image
from pathlib import Path
from rembg import remove, new_session
from image_preprocess import PreprocessPipeline
from validation import PhotoValidator

# ============================================================
# НАСТРОЙКИ
# ============================================================

NAME = 'vlad_T'

INPUT = os.path.join(PROJECT_ROOT, 'src', f'{NAME}.png')
OUTPUT = os.path.join(PROJECT_ROOT, 'output')
Path(OUTPUT).mkdir(exist_ok=True)

# --- Параметры геометрии ---
OCTREE_RESOLUTION = 256
NUM_INFERENCE_STEPS = 30
GUIDANCE_SCALE = 5.5

# ============================================================

print(f"VRAM свободно: {torch.cuda.mem_get_info()[0] / 1024**3:.2f} GB\n")

# --- Шаг 1: Предобработка ---
print("=" * 60)
print("ШАГ 1: Предобработка изображения")
print("=" * 60)

img = Image.open(INPUT).convert("RGBA")

# --- Валидация фото ---
print("\n[0/4] Валидация фото")
validator = PhotoValidator()
validation = validator.validate(img)

if not validation['valid']:
    print("[FAIL] Фото не проходит валидацию:")
    for err in validation['errors']:
        print(f"  Ошибка: {err}")
    for warn in validation['warnings']:
        print(f"  Предупреждение: {warn}")
    sys.exit(1)
else:
    print("[OK] Фото проходит валидацию")
    if validation['warnings']:
        for warn in validation['warnings']:
            print(f"  Предупреждение: {warn}")
    if validation['pose_info']:
        pi = validation['pose_info']
        pose_type = "T-pose" if pi['is_tpose'] else ("A-pose" if pi['is_apose'] else "другая поза")
        print(f"  Поза: {pose_type}, угол рук: {pi['arm_angle']:.0f}")
        print(f"  Полный рост: {pi['full_body_visible']}, лицо: {pi['face_visible']}")

preprocess = PreprocessPipeline()
processed_path = preprocess.process(
    image=img,
    output_dir=OUTPUT,
)

# Создаём albedo из processed (фон уже удалён)
processed_img = Image.open(processed_path).convert("RGBA")
albedo_path = os.path.join(OUTPUT, 'albedo.png')
processed_img.save(albedo_path)
print(f"[OK] albedo.png saved")

# --- Шаг 2: Генерация геометрии ---
print("\n" + "=" * 60)
print("ШАГ 2: Генерация 3D-геометрии")
print("=" * 60)

from hy3dgen.shapegen.pipelines import Hunyuan3DDiTFlowMatchingPipeline

pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained('tencent/Hunyuan3D-2')
result = pipe(
    image=albedo_path,
    octree_resolution=OCTREE_RESOLUTION,
    num_inference_steps=NUM_INFERENCE_STEPS,
    guidance_scale=GUIDANCE_SCALE,
    remove_bg=False,
    mc_algo='mc',
)

mesh = result if not isinstance(result, list) else result[0]
geometry_path = os.path.join(f'{OUTPUT}/geometry', f'{NAME}.glb')
trimesh.Scene(geometry=mesh).export(geometry_path, file_type='glb')
print(f"[OK] geometry.glb saved ({len(mesh.vertices)} vertices)")

# Очистка VRAM
del pipe, result, mesh
torch.cuda.empty_cache()
gc.collect()
import time; time.sleep(2)
print(f"VRAM после очистки: {torch.cuda.mem_get_info()[0] / 1024**3:.2f} GB свободно")

# --- Шаг 3: Генерация текстур ---
print("\n" + "=" * 60)
print("ШАГ 3: Генерация PBR-текстур")
print("=" * 60)

from hy3dgen.texgen.pipelines import Hunyuan3DPaintPipeline
import numpy as np

scene = trimesh.load(geometry_path)
mesh = list(scene.geometry.values())[0]
mesh.vertices = mesh.vertices.astype(np.float32)
print(f"[OK] Mesh loaded: {len(mesh.vertices)} vertices")

pipe_tex = Hunyuan3DPaintPipeline.from_pretrained(
    'tencent/Hunyuan3D-2',
    subfolder='hunyuan3d-paint-v2-0-turbo',
)
print(f"VRAM после загрузки: {torch.cuda.mem_get_info()[0] / 1024**3:.2f} GB свободно")

torch.cuda.empty_cache()
gc.collect()
time.sleep(2)

print("\n[PBR] Starting...")
textured = pipe_tex(mesh, albedo_path)

out_path = os.path.join(f'{OUTPUT}/textures', f'{NAME}.glb')
trimesh.Scene(geometry=textured).export(out_path, file_type='glb')
print(f"\n[DONE] PBR complete! {Path(out_path).stat().st_size / 1e6:.1f} MB")
print(f"[OUT] Result: {out_path}")
