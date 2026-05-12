"""
ARQ Worker settings for generation queue.
Run with: python -m arq worker.WorkerSettings
"""
import asyncio
import os
import time
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
    ai_model: str = "Hunyuan3D-1",
    category: str = "Персонажи",
    quality_level: str = "high",
    quality_settings: dict = None,
):
    """
    Run Hunyuan3D-2 generation in the ARQ worker.
    Updates database status during the process.
    """
    import database
    import storage
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
        print(f"[Worker] Starting generation: gen_id={gen_id[:8]}, ai_model={ai_model}, enable_pbr={enable_pbr}, poly_count={poly_count}", flush=True)

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

        # ── Step 2: Remove background & Step 3: Preprocess ──
        start_preprocess = time.time()
        try:
            database.update_generation_status(gen_id, "processing", 15)
            print(f"[Worker] Removing background...", flush=True)
            img_no_bg = remove(img, session=new_session('u2net'))

            database.update_generation_status(gen_id, "processing", 20)
            print(f"[Worker] Preprocessing image...", flush=True)
            processor = PreprocessPipeline()
            processed_img = processor.process(img_no_bg)

            # Save processed image for generation
            temp_dir = tempfile.mkdtemp()
            processed_path = os.path.join(temp_dir, "processed.png")
            processed_img.save(processed_path)
            
            duration = int((time.time() - start_preprocess) * 1000)
            database.add_generation_log(gen_id, 'preprocess', duration)
        except Exception as e:
            duration = int((time.time() - start_preprocess) * 1000)
            database.add_generation_log(gen_id, 'preprocess', duration, status='failed', error=str(e))
            raise

        # Upload processed image for persistent session preview
        source_img_url = None
        try:
            source_img_url = storage.upload_source_image(processed_path, gen_id)
        except Exception as e:
            print(f"[Worker] Failed to upload source preview: {e}", flush=True)

        # ── Step 4: Branch execution based on AI Model (Geometry) ──
        start_geometry = time.time()
        try:
            database.update_generation_status(gen_id, "processing", 30, source_image_url=source_img_url)
            
            # Free memory BEFORE launching heavy models or subprocesses
            torch.cuda.empty_cache()
            gc.collect()
            
            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(output_dir, exist_ok=True)
            glb_path = os.path.join(output_dir, "model.glb")

            import subprocess
            
            if ai_model == "Hunyuan3D-2":
                print(f"[Worker] Loading Hunyuan3D model...", flush=True)
                from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
                pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2")
                
                database.update_generation_status(gen_id, "processing", 40)
                print(f"[Worker] Generating 3D geometry...", flush=True)

                # Use steps from DB config if available
                infer_steps = num_steps
                if quality_settings and quality_level in quality_settings:
                    infer_steps = quality_settings[quality_level].get("steps", num_steps)

                mesh = pipe(
                    image=processed_path,
                    octree_resolution=octree_resolution,
                    num_inference_steps=infer_steps,
                    guidance_scale=guidance_scale,
                    remove_bg=False,
                    mc_algo='mc',
                )[0]

                if enable_pbr:
                    print(f"[Worker] Generating PBR textures...", flush=True)
                    try:
                        from hy3dgen.texgen import Hunyuan3DPaintPipeline
                        tex_pipe = Hunyuan3DPaintPipeline.from_pretrained("tencent/Hunyuan3D-2")
                        processed_img_pil = Image.open(processed_path).convert("RGBA")
                        mesh = tex_pipe(mesh, image=processed_img_pil)
                        del tex_pipe
                    except Exception as e:
                        print(f"[Worker] PBR failed: {e}", flush=True)

                database.update_generation_status(gen_id, "processing", 75)
                mesh.export(glb_path, file_type='glb')
                
                # Explicitly cleanup H3D2 objects
                del pipe
                if 'tex_pipe' in locals(): del tex_pipe
                torch.cuda.empty_cache()

            elif ai_model == "Hunyuan3D-1":
                print(f"[Worker] Launching Hunyuan3D-1 subprocess...", flush=True)
                python_exe = r"c:\Develop\diploma\machine_learning\H3D1\venv\Scripts\python.exe"
                script = r"c:\Develop\diploma\machine_learning\H3D1\run_cli.py"
                
                # Map quality for H3D1 from DB config
                if quality_settings and quality_level in quality_settings:
                    h3d1_cfg = quality_settings[quality_level]
                else:
                    # Fallback to legacy hardcoded if DB config missing
                    h3d1_quality = {
                        "draft":  {"gen_steps": 20, "max_faces": 25000},
                        "high":   {"gen_steps": 35, "max_faces": 50000},
                        "ultra":  {"gen_steps": 50, "max_faces": 90000},
                    }
                    h3d1_cfg = h3d1_quality.get(quality_level, h3d1_quality["high"])
                
                # Override face count from poly_count slider if user explicitly chose it
                poly_map = {"5K": 5000, "25K": 25000, "50K": 50000, "75K": 75000, "100K+": 100000}
                face_count = poly_map.get(poly_count, h3d1_cfg["max_faces"])
                
                cmd = [
                    python_exe, script,
                    "--image", processed_path,
                    "--output_dir", output_dir,
                    "--gen_steps", str(h3d1_cfg["gen_steps"]),
                    "--max_faces_num", str(face_count),
                    "--do_texture_mapping", "True" if enable_pbr else "False",
                ]
                
                # Merge stderr into stdout to prevent deadlock if stderr buffer fills up
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, cwd=r"c:\Develop\diploma\machine_learning\H3D1",
                    bufsize=1, universal_newlines=True # Line-buffered for progress tracking
                )
                # Stream stdout and parse progress markers
                for line in iter(proc.stdout.readline, ''):
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("[PROGRESS:"):
                        try:
                            pct = int(line.split(":")[1].rstrip("]"))
                            database.update_generation_status(gen_id, "processing", pct)
                        except ValueError:
                            pass
                    if line.startswith("[H3D1]"):
                        print(line, flush=True)
                proc.wait()
                if proc.returncode != 0:
                    # Since stderr is merged, we already printed most of the output
                    raise RuntimeError(f"H3D1 failed (exit code {proc.returncode}). Check worker logs above for details.")
                database.update_generation_status(gen_id, "processing", 75)
                
            elif ai_model == "TRELLIS2":
                print(f"[Worker] Launching TRELLIS2 subprocess...", flush=True)
                python_exe = r"c:\Develop\diploma\machine_learning\TRELLIS2\.venv\Scripts\python.exe"
                script = r"c:\Develop\diploma\machine_learning\TRELLIS2\run_cli.py"
                
                # Map quality for TRELLIS2 from DB config
                if quality_settings and quality_level in quality_settings:
                    trellis_cfg = quality_settings[quality_level]
                else:
                    # Fallback to legacy hardcoded if DB config missing
                    trellis_quality = {
                        "draft":  {"steps": 12, "max_tokens": 16384},
                        "high":   {"steps": 20, "max_tokens": 32768},
                        "ultra":  {"steps": 30, "max_tokens": 49152},
                    }
                    trellis_cfg = trellis_quality.get(quality_level, trellis_quality["high"])
                
                cmd = [
                    python_exe, script,
                    "--image", processed_path,
                    "--output_dir", output_dir,
                    "--poly_count", poly_count,
                    "--steps", str(trellis_cfg["steps"]),
                    "--max_tokens", str(trellis_cfg["max_tokens"]),
                    "--enable_pbr", "True" if enable_pbr else "False",
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=r"c:\Develop\diploma\machine_learning\TRELLIS2")
                if result.returncode != 0:
                    stderr_lines = result.stderr.strip().splitlines()
                    tb_start = -1
                    for i, line in enumerate(stderr_lines):
                        if line.startswith("Traceback (most recent call last):"):
                            tb_start = i
                    error_detail = "\n".join(stderr_lines[tb_start:]) if tb_start >= 0 else "\n".join(stderr_lines[-20:])
                    raise RuntimeError(f"TRELLIS2 failed (exit code {result.returncode}):\n{error_detail}")
                    
                database.update_generation_status(gen_id, "processing", 75)
                
            else:
                raise ValueError(f"Unknown ai_model: {ai_model}")
            
            duration = int((time.time() - start_geometry) * 1000)
            database.add_generation_log(gen_id, 'geometry', duration)
        except Exception as e:
            duration = int((time.time() - start_geometry) * 1000)
            database.add_generation_log(gen_id, 'geometry', duration, status='failed', error=str(e))
            raise
            

        # Free memory before next steps
        torch.cuda.empty_cache()
        gc.collect()

        print(f"[Worker] GLB saved: {glb_path}", flush=True)

        database.update_generation_status(gen_id, "processing", 80)

        # ── Step 6: Preview (Render + Cloud Upload) ──
        start_preview = time.time()
        try:
            preview_path = os.path.join(output_dir, "preview.png")
            if ai_model != "Hunyuan3D-2":
                mesh = trimesh.load(glb_path, force='mesh')
            _generate_preview(mesh, preview_path)

            database.update_generation_status(gen_id, "processing", 85)

            # ── Step 7: Upload to Supabase Storage ──
            from supabase import create_client
            supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

            model_key = f"{user_id}/{gen_id}/model.glb"
            with open(glb_path, "rb") as f:
                supabase.storage.from_("models").upload(model_key, f, {"upsert": "true"})
            model_url_result = supabase.storage.from_("models").get_public_url(model_key)
            model_url = model_url_result.get("publicUrl", model_url_result) if isinstance(model_url_result, dict) else model_url_result

            preview_key = f"{user_id}/{gen_id}/preview.png"
            with open(preview_path, "rb") as f:
                supabase.storage.from_("previews").upload(preview_key, f, {"upsert": "true"})
            preview_url_result = supabase.storage.from_("previews").get_public_url(preview_key)
            preview_url = preview_url_result.get("publicUrl", preview_url_result) if isinstance(preview_url_result, dict) else preview_url_result

            database.update_generation_status(gen_id, "processing", 90)
            
            duration = int((time.time() - start_preview) * 1000)
            database.add_generation_log(gen_id, 'preview', duration)
        except Exception as e:
            duration = int((time.time() - start_preview) * 1000)
            database.add_generation_log(gen_id, 'preview', duration, status='failed', error=str(e))
            raise

        # ── Step 8: Export (Create model record) ──
        start_export = time.time()
        try:
            source_image_url = storage.upload_source_image(image_path, gen_id)

            # ── Step 8: Create model record ──
            model = database.create_model(
                author_id=user_id,
                name=model_name or f"Generated Model {gen_id[:8]}",
                description=f"AI-generated 3D model (style: {style})",
                category=category,
                format="GLB",
                file_url=model_url,
                preview_url=preview_url,
                source_image_url=source_image_url,
                ai_generated=True,
                status="approved",
                ai_model=ai_model,
                license="view_only",
                vertices_count=len(mesh.vertices) if hasattr(mesh, 'vertices') else None,
                faces_count=len(mesh.faces) if hasattr(mesh, 'faces') else None,
            )
            model_id = model["id"]
            print(f"[Worker] Model created in DB: {model_id[:8]}", flush=True)
            
            duration = int((time.time() - start_export) * 1000)
            database.add_generation_log(gen_id, 'export', duration)
        except Exception as e:
            duration = int((time.time() - start_export) * 1000)
            database.add_generation_log(gen_id, 'export', duration, status='failed', error=str(e))
            raise

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
