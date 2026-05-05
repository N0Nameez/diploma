"""
ARQ Worker settings for generation queue.
Run with: python -m arq worker.WorkerSettings
"""
import asyncio
import os
import gc
import sys
import traceback
import uuid
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from arq import cron
from arq.connections import RedisSettings

# ── Redis connection ──
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# ── Add generation directory to path ──
GENERATION_DIR = Path(__file__).parent / "generation"
HUNYUAN_DIR = GENERATION_DIR / "models" / "Hunyuan3D-2"
sys.path.insert(0, str(GENERATION_DIR))
sys.path.insert(0, str(HUNYUAN_DIR))
sys.path.insert(0, str(HUNYUAN_DIR / "hy3dgen" / "texgen" / "custom_rasterizer"))

os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
os.environ['HF_HUB_DISABLE_XET'] = '1'

import config

# ── Main generation function ──

async def generate_model_from_image(
    ctx: dict,
    gen_id: str,
    user_id: str,
    image_path: str,
    style: str,
    model_name: str = "",
    octree_resolution: int = 256,
    num_steps: int = 30,
    guidance_scale: float = 5.5,
    enable_pbr: bool = True,
    enable_rig: bool = False,
    poly_count: str = "50k",
):
    """
    Run Hunyuan3D-2 generation in the ARQ worker.
    Updates database status during the process.
    """
    import database
    import torch
    import trimesh
    from PIL import Image
    from rembg import remove, new_session
    from image_preprocess import PreprocessPipeline
    from validation import PhotoValidator

    temp_dir = None
    try:
        # Update status: processing
        database.update_generation_status(gen_id, "processing", 5)
        print(f"[Worker] Starting generation: gen_id={gen_id[:8]}", flush=True)

        # ── Step 1: Validate photo (only if rigging is needed) ──
        database.update_generation_status(gen_id, "processing", 10)
        img = Image.open(image_path).convert("RGBA")
        if enable_rig:
            print(f"[Worker] Validating photo for rigging...", flush=True)
            validator = PhotoValidator()
            validation = validator.validate(img)
            if not validation['valid']:
                error_msg = f"Photo validation failed: {'; '.join(validation['errors'])}"
                print(f"[Worker] {error_msg}", flush=True)
                database.update_generation_status(gen_id, "failed", 0, error=error_msg)
                return None
        else:
            print(f"[Worker] Skipping pose validation (rig disabled)", flush=True)

        # ── Step 2: Remove background ──
        database.update_generation_status(gen_id, "processing", 15)
        print(f"[Worker] Removing background...", flush=True)
        img_no_bg = remove(img, session=new_session('u2net'))

        # ── Step 3: Preprocess ──
        database.update_generation_status(gen_id, "processing", 20)
        print(f"[Worker] Preprocessing image...", flush=True)
        processor = PreprocessPipeline()
        processed_img = processor.process(img_no_bg)

        # Save processed image for generation
        temp_dir = tempfile.mkdtemp()
        processed_path = os.path.join(temp_dir, "processed.png")
        processed_img.save(processed_path)

        # ── Step 4: Load Hunyuan3D and generate geometry ──
        database.update_generation_status(gen_id, "processing", 30)
        print(f"[Worker] Loading Hunyuan3D model...", flush=True)

        from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

        print(f"[Worker] Loading model with from_pretrained...", flush=True)
        pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            "tencent/Hunyuan3D-2",
        )
        print(f"[Worker] from_pretrained returned: {type(pipe)}", flush=True)
        if pipe is None:
            raise RuntimeError("Failed to load Hunyuan3D pipeline — model returned None")

        database.update_generation_status(gen_id, "processing", 40)
        print(f"[Worker] Generating 3D geometry...", flush=True)

        mesh = pipe(
            image=processed_path,
            octree_resolution=octree_resolution,
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            remove_bg=False,
            mc_algo='mc',
        )[0]

        # ── Step 5: Generate PBR textures if enabled ──
        if enable_pbr:
            print(f"[Worker] Generating PBR textures...", flush=True)
            try:
                from hy3dgen.texgen import Hunyuan3DPaintPipeline
                tex_pipe = Hunyuan3DPaintPipeline.from_pretrained("tencent/Hunyuan3D-2")
                # Load the processed image as PIL Image for the texture pipeline
                processed_img = Image.open(processed_path).convert("RGBA")
                mesh = tex_pipe(mesh, image=processed_img)
                # Clean up VRAM
                del tex_pipe
                torch.cuda.empty_cache()
                gc.collect()
                print(f"[Worker] PBR textures applied", flush=True)
            except Exception as e:
                print(f"[Worker] PBR texture generation failed (continuing without): {e}", flush=True)

        database.update_generation_status(gen_id, "processing", 75)

        # ── Step 6: Save GLB ──
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        glb_path = os.path.join(output_dir, "model.glb")
        
        mesh.export(glb_path, file_type='glb')
        print(f"[Worker] GLB saved: {glb_path}", flush=True)

        database.update_generation_status(gen_id, "processing", 80)

        # ── Step 6: Generate preview image ──
        preview_path = os.path.join(output_dir, "preview.png")
        _generate_preview(mesh, preview_path)

        database.update_generation_status(gen_id, "processing", 85)

        # ── Step 7: Upload to Supabase Storage ──
        from supabase import create_client
        supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

        # Upload model (unique path per generation)
        model_key = f"{user_id}/{gen_id}/model.glb"
        with open(glb_path, "rb") as f:
            supabase.storage.from_("models").upload(model_key, f)
        model_url_result = supabase.storage.from_("models").get_public_url(model_key)
        model_url = model_url_result.get("publicUrl", model_url_result) if isinstance(model_url_result, dict) else model_url_result

        # Upload preview
        preview_key = f"{user_id}/{gen_id}/preview.png"
        with open(preview_path, "rb") as f:
            supabase.storage.from_("previews").upload(preview_key, f)
        preview_url_result = supabase.storage.from_("previews").get_public_url(preview_key)
        preview_url = preview_url_result.get("publicUrl", preview_url_result) if isinstance(preview_url_result, dict) else preview_url_result

        database.update_generation_status(gen_id, "processing", 90)

        # ── Step 7: Upload source image ──
        source_image_url = storage.upload_source_image(image_path, gen_id)
        print(f"[Worker] Source image uploaded: {source_image_url[:40]}...", flush=True)

        # ── Step 8: Create model record ──
        model = database.create_model(
            author_id=user_id,
            name=model_name or f"Generated Model {gen_id[:8]}",
            description=f"AI-generated 3D model (style: {style})",
            category="Персонажи",
            format="GLB",
            file_url=model_url,
            preview_url=preview_url,
            source_image_url=source_image_url,
            ai_generated=True,
            status="approved",
            license="view_only",
            vertices_count=len(mesh.vertices) if hasattr(mesh, 'vertices') else None,
            faces_count=len(mesh.faces) if hasattr(mesh, 'faces') else None,
        )
        model_id = model["id"]
        print(f"[Worker] Model created in DB: {model_id[:8]}", flush=True)

        # ── Step 9: Mark as completed ──
        database.update_generation_status(
            gen_id, "completed", 100, result_model_id=model_id
        )
        
        # Cleanup VRAM
        torch.cuda.empty_cache()
        gc.collect()
        
        print(f"[Worker] Generation completed: gen_id={gen_id[:8]}, model_id={model_id[:8]}", flush=True)
        return model_id

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"[Worker] Generation failed: gen_id={gen_id[:8]}\n{error_msg}", flush=True)
        database.update_generation_status(gen_id, "failed", 0, error=error_msg)

        # Refund credits on failure
        try:
            refund_result = database.refund_credits(user_id, amount=3)
            print(f"[Worker] Refunded 3 credits to user {user_id[:8]}: {refund_result}", flush=True)
        except Exception as refund_err:
            print(f"[Worker] Failed to refund credits: {refund_err}", flush=True)

        # Cleanup VRAM on error too
        try:
            torch.cuda.empty_cache()
            gc.collect()
        except:
            pass

        raise

    finally:
        # Cleanup temp directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def _generate_preview(mesh_or_scene, preview_path: str):
    """Generate a preview image of the 3D model."""
    try:
        import numpy as np
        import pyrender
        import trimesh
        from PIL import Image as PILImage

        if hasattr(mesh_or_scene, 'vertices') and len(mesh_or_scene.vertices) > 0:
            scene_mesh = trimesh.Scene(geometry=mesh_or_scene)
        elif hasattr(mesh_or_scene, 'dump'):
            scene_mesh = mesh_or_scene
        else:
            _generate_fallback_preview(preview_path)
            return

        bounds = scene_mesh.bounds
        center = scene_mesh.centroid
        size = bounds[1] - bounds[0]
        max_dim = max(size.max(), 0.1)
        radius = max_dim / 2.0
        fov = np.pi / 4.0
        cam_distance = radius / np.sin(fov / 2) * 1.8

        cam_position = np.array([center[0], center[1] + radius * 0.3, center[2] + cam_distance])

        z_axis = (center - cam_position)
        z_axis = z_axis / np.linalg.norm(z_axis)
        x_axis = np.cross(z_axis, np.array([0, 0, 1]))
        if np.linalg.norm(x_axis) < 0.001:
            x_axis = np.cross(z_axis, np.array([0, 1, 0]))
        x_axis = x_axis / np.linalg.norm(x_axis)
        y_axis = np.cross(z_axis, x_axis)

        cam_matrix = np.eye(4)
        cam_matrix[:3, 0] = x_axis
        cam_matrix[:3, 1] = y_axis
        cam_matrix[:3, 2] = -z_axis
        cam_matrix[:3, 3] = cam_position

        pr_scene = pyrender.Scene(
            ambient_light=np.array([0.4, 0.4, 0.4, 1.0]),
            bg_color=np.array([0.15, 0.15, 0.2, 1.0])
        )

        mesh_data = pyrender.Mesh.from_trimesh(scene_mesh.dump(concatenate=True))
        pr_scene.add(mesh_data, 'mesh')

        camera = pyrender.PerspectiveCamera(yfov=fov)
        camera_node = pyrender.Node(camera=camera, matrix=cam_matrix)
        pr_scene.add_node(camera_node)

        light_positions = [
            np.array([cam_distance * 0.5, cam_distance * 0.5, cam_distance * 0.7]) + center,
            np.array([-cam_distance * 0.5, cam_distance * 0.3, cam_distance * 0.5]) + center,
            np.array([0, -cam_distance * 0.3, cam_distance * 0.5]) + center,
        ]
        intensities = [4.0, 3.0, 2.0]
        for pos, intensity in zip(light_positions, intensities):
            light = pyrender.DirectionalLight(color=np.array([1.0, 1.0, 1.0]), intensity=intensity)
            light_node = pyrender.Node(light=light, matrix=np.eye(4))
            light_node.matrix[:3, 3] = pos
            pr_scene.add_node(light_node)

        r = pyrender.OffscreenRenderer(512, 512)
        color, _ = r.render(pr_scene)
        r.delete()

        img = PILImage.fromarray(color)
        img.save(preview_path)
        print(f"[Worker] Preview saved to {preview_path}", flush=True)
    except Exception as e:
        print(f"[Worker] Preview generation failed: {e}, using fallback", flush=True)
        _generate_fallback_preview(preview_path)


def _generate_fallback_preview(preview_path: str):
    """Generate a simple colored fallback preview."""
    from PIL import Image as PILImage
    import numpy as np
    img = PILImage.new('RGB', (400, 300), color=(30, 40, 70))
    img.save(preview_path)


async def generate_animation_from_video(
    ctx: dict,
    gen_id: str,
    user_id: str,
    video_path: str,
    model_id: str,
):
    """Placeholder for animation generation — not implemented yet."""
    import database
    database.update_generation_status(gen_id, "failed", 0, error="Animation generation not implemented yet")
    raise NotImplementedError("Animation generation not implemented yet")


# ── Worker Settings ──

class WorkerSettings:
    redis_settings = RedisSettings(
        host=REDIS_HOST,
        port=REDIS_PORT,
    )
    functions = [generate_model_from_image, generate_animation_from_video]
    # Max concurrent jobs: 1 (sequential processing for GPU)
    max_jobs = 1
    # Job timeout: 15 minutes
    job_timeout = 900
