"""FastAPI backend for AnimaticAI — 3D generation, catalog, and user management."""

import os
import sys
import uuid
import shutil
import tempfile
import asyncio
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class UserProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    cover_preset: str | None = None

# ── Add generation directory to path so we can import ML modules ──
GENERATION_DIR = Path(__file__).parent / "generation"
HUNYUAN_DIR = GENERATION_DIR / "models" / "Hunyuan3D-2"
sys.path.insert(0, str(GENERATION_DIR))
sys.path.insert(0, str(HUNYUAN_DIR))

# custom_rasterizer — needs root dir on sys.path so both `import custom_rasterizer`
# (the package) and `import custom_rasterizer_kernel` (the .pyd) are found
sys.path.insert(0, str(HUNYUAN_DIR / "hy3dgen" / "texgen" / "custom_rasterizer"))

import config
import database
import storage

# ── App ──
app = FastAPI(title="AnimaticAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic models ──

class GenerateRequest(BaseModel):
    style: str = "realism"
    quality: str = "high"
    octree_resolution: int = 256
    num_steps: int = 50
    guidance_scale: float = 5.5

class GenerationStatus(BaseModel):
    id: str
    status: str
    progress: int
    result_model_id: str | None = None
    error_message: str | None = None
    created_at: str | None = None
    completed_at: str | None = None
    queue_position: int | None = None
    queue_length: int | None = None


# ── Endpoints ──

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/users/{user_id}/credits")
def get_user_credits(user_id: str):
    """Get user credits (auto-resets if period has passed)."""
    result = database.get_or_reset_credits(user_id)
    return result


@app.post("/api/users/{user_id}/credits/deduct")
def deduct_user_credits(user_id: str, amount: int = 3):
    """Deduct credits from user. Returns error if insufficient."""
    result = database.deduct_credits(user_id, amount)
    if not result["success"]:
        raise HTTPException(status_code=402, detail=result["error"])
    return {"credits": result["credits"]}


@app.post("/api/generate")
async def generate_model(
    image: UploadFile = File(...),
    style: str = Form("realism"),
    user_id: str = Form(...),
    name: str = Form(""),
    octree_resolution: int = Form(256),
    num_steps: int = Form(30),
    guidance_scale: float = Form(5.5),
    enable_pbr: bool = Form(True),
    poly_count: str = Form("50k"),
):
    """
    Start 3D model generation from a photo via ARQ queue.
    Returns immediately with a generation ID — poll /api/generate/{id} for status.
    """
    import queue_manager

    # Check and deduct credits
    credit_result = database.deduct_credits(user_id, amount=3)
    if not credit_result["success"]:
        raise HTTPException(status_code=402, detail=credit_result["error"])

    # Save uploaded image to temp file
    temp_dir = tempfile.mkdtemp()
    image_path = os.path.join(temp_dir, "input.png")

    with open(image_path, "wb") as f:
        content = await image.read()
        f.write(content)

    # Create generation request in DB
    gen = database.create_generation_request(user_id, "model_photo", style)
    if not gen:
        return {"error": "Failed to create generation request"}

    gen_id = gen["id"]

    # Submit to ARQ queue
    try:
        await queue_manager.submit_generation_job(
            gen_id=gen_id,
            user_id=user_id,
            image_path=image_path,
            style=style,
            model_name=name,
            octree_resolution=octree_resolution,
            num_steps=num_steps,
            guidance_scale=guidance_scale,
            enable_pbr=enable_pbr,
            enable_rig=False,
            poly_count=poly_count,
        )
        print(f"[API] Submitted generation job {gen_id} to queue", flush=True)
    except Exception as e:
        print(f"[API] Failed to submit job: {e}", flush=True)
        database.update_generation_status(gen_id, "failed", 0, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue generation: {str(e)}")

    return {"generation_id": gen_id, "status": "queued"}


@app.get("/api/generate/{gen_id}", response_model=GenerationStatus)
def get_generation_status(gen_id: str):
    """Check the status of a generation request."""
    gen = database.get_generation_request(gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    # If queued, check queue position (sync Redis)
    queue_position = None
    queue_length = 0
    if gen.get("status") == "queued":
        try:
            import redis
            import json
            r = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", 6379)), decode_responses=True)
            queue_jobs = r.lrange("arq:queue", 0, -1)
            queue_length = len(queue_jobs)
            for i, job_bytes in enumerate(queue_jobs):
                try:
                    job_data = json.loads(job_bytes)
                    if job_data.get("job_id") == gen_id:
                        queue_position = i + 1
                        break
                except:
                    pass
            r.close()
        except:
            pass

    return GenerationStatus(
        id=gen["id"],
        status=gen["status"],
        progress=gen.get("progress", 0),
        result_model_id=gen.get("result_model_id"),
        error_message=gen.get("error_message"),
        created_at=gen.get("created_at"),
        completed_at=gen.get("completed_at"),
        queue_position=queue_position,
        queue_length=queue_length,
    )


@app.get("/api/models")
def list_models(
    categories: str | None = None,
    formats: str | None = None,
    search: str | None = None,
    sort: str | None = None,
    ai_only: bool = False,
    limit: int = 20,
    offset: int = 0,
):
    """Get catalog of approved models."""
    filters = {}
    if categories:
        filters["categories"] = [c.strip() for c in categories.split(",")]
    if formats:
        filters["formats"] = [f.strip() for f in formats.split(",")]
    if search:
        filters["search"] = search
    if ai_only:
        filters["ai_only"] = True

    models = database.get_models(filters, limit=limit, offset=offset, sort=sort)
    return {"items": models, "total": len(models)}


@app.get("/api/models/{model_id}")
def get_model(model_id: str):
    """Get a single model by ID."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@app.put("/api/models/{model_id}")
def update_model(model_id: str, name: str = None, description: str = None, category: str = None, license: str = None, author_id: str = None):
    """Update model fields. Only author can edit."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if author_id and model["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this model")

    updates = {}
    if name is not None:
        updates["name"] = name
    if description is not None:
        updates["description"] = description
    if category is not None:
        updates["category"] = category
    if license is not None:
        updates["license"] = license

    updated = database.update_model(model_id, model["author_id"], updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Failed to update model")
    return updated


@app.get("/api/models/{model_id}/comments")
def get_model_comments(model_id: str, limit: int = 50, offset: int = 0):
    """Get comments for a model."""
    comments = database.get_comments(model_id, "model", limit, offset)
    return {"items": comments, "total": len(comments)}


@app.post("/api/models/{model_id}/comments")
def add_model_comment(model_id: str, author_id: str = Form(...), content: str = Form(...), parent_id: str = Form(None)):
    """Add a comment to a model."""
    comment = database.add_comment(model_id, "model", author_id, content, parent_id if parent_id != "null" else None)
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to add comment")
    return comment


@app.post("/api/models/{model_id}/interact")
def toggle_model_interaction(model_id: str, user_id: str = Form(...), type: str = Form(...)):
    """Toggle like/favorite on a model."""
    if type not in ("like", "favorite"):
        raise HTTPException(status_code=400, detail="Invalid interaction type")
    is_added = database.toggle_interaction(user_id, model_id, "model", type)
    has_it = database.has_interaction(user_id, model_id, "model", type)
    return {"is_active": has_it, "added": is_added}


@app.get("/api/models/{model_id}/interactions")
def get_model_interactions(model_id: str, user_id: str = None):
    """Check if user has liked/favorited a model."""
    if not user_id:
        return {"is_liked": False, "is_favorited": False}
    return {
        "is_liked": database.has_interaction(user_id, model_id, "model", "like"),
        "is_favorited": database.has_interaction(user_id, model_id, "model", "favorite"),
    }


@app.post("/api/models/{model_id}/download")
def download_model(model_id: str, user_id: str = Form(None)):
    """Increment download counter and return file URL for direct download.
    Each user can only download once (counter increments on first download only)."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.get("file_url"):
        raise HTTPException(status_code=404, detail="Model file not available")

    # Record download (only counts if first time for this user)
    if user_id:
        database.record_download(model_id, user_id)

    return {"file_url": model["file_url"], "name": model["name"], "format": model.get("format", "GLB")}


@app.get("/api/users/{user_id}/models")
def get_user_models(user_id: str, limit: int = 20):
    """Get models by a specific user (includes private models for the user themselves)."""
    models = database.get_models_by_author(user_id, limit=limit)
    return {"items": models, "total": len(models)}


@app.post("/api/models/{model_id}/publish")
def publish_model_endpoint(model_id: str, user_id: str = Form(...), license_type: str = Form("view_only")):
    """Publish a model with chosen license. Only the author can do this."""
    result = database.publish_model(model_id, user_id, license_type)
    if not result:
        raise HTTPException(status_code=403, detail="Not authorized or model not found")
    return result


@app.get("/api/animations")
def list_animations(
    search: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """Get catalog of approved animations."""
    filters = {}
    if search:
        filters["search"] = search
    animations = database.get_animations(filters=filters or None, limit=limit, offset=offset)
    return {"items": animations, "total": len(animations)}


@app.post("/api/models/{model_id}/convert")
async def convert_model(model_id: str, format: str = Form(...)):
    """Convert GLB model to another format (OBJ, STL). Returns download URL."""
    import httpx
    import trimesh
    import io

    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.get("file_url"):
        raise HTTPException(status_code=404, detail="Model file not available")

    fmt = format.lower()
    if fmt not in ("obj", "stl"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use: obj, stl")

    try:
        # Download GLB
        print(f"[Convert] Downloading GLB from {model['file_url']}", flush=True)
        async with httpx.AsyncClient() as client:
            resp = await client.get(model["file_url"])
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to download: {resp.status_code}")
            glb_data = resp.content

        # Load with trimesh
        print(f"[Convert] Loading GLB ({len(glb_data)} bytes)", flush=True)
        scene = trimesh.load(io.BytesIO(glb_data), file_type='glb')

        if isinstance(scene, trimesh.Trimesh):
            mesh = scene
        elif hasattr(scene, 'geometry') and scene.geometry:
            mesh = list(scene.geometry.values())[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to parse GLB")

        print(f"[Convert] Mesh loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces", flush=True)

        # Export to requested format via BytesIO or tempfile
        print(f"[Convert] Exporting to {fmt}", flush=True)
        try:
            buffer = io.BytesIO()
            result = mesh.export(buffer, file_type=fmt)
            buffer.seek(0)
            converted_data = buffer.getvalue()
            if not converted_data:
                raise ValueError("Empty export")
        except Exception as export_err:
            # Fallback: export to temp file
            print(f"[Convert] BytesIO export failed, trying temp file: {export_err}", flush=True)
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=f'.{fmt}', delete=False) as tmp:
                tmp_path = tmp.name
            mesh.export(tmp_path, file_type=fmt)
            with open(tmp_path, 'rb') as f:
                converted_data = f.read()
            import os
            os.unlink(tmp_path)

        if not converted_data:
            raise HTTPException(status_code=500, detail=f"Export to {fmt} produced empty data")

        print(f"[Convert] Exported {len(converted_data)} bytes", flush=True)

        # Upload with timestamp to avoid duplicates
        import time
        ts = int(time.time() * 1000)
        content_type = "model/stl" if fmt == "stl" else "application/octet-stream"
        converted_url = storage.upload_bytes(
            config.BUCKET_MODELS, converted_data, f"{model_id}/model_{ts}.{fmt}", content_type=content_type
        )

        if not converted_url:
            raise HTTPException(status_code=500, detail="Failed to upload converted file")

        print(f"[Convert] Uploaded to {converted_url}", flush=True)
        return {"file_url": converted_url, "format": fmt.upper(), "name": model["name"]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Convert] ERROR: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str):
    """Get user profile."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@app.get("/api/users/{user_id}/generations")
def get_user_generations(user_id: str, limit: int = 20):
    """Get user's generation history."""
    generations = database.get_user_generations(user_id, limit)
    return {"items": generations, "total": len(generations)}


@app.get("/api/users/{user_id}/favorites")
def get_user_favorites(user_id: str, limit: int = 20):
    """Get models favorited by user."""
    favorites = database.get_user_favorites(user_id, limit=limit)
    return {"items": favorites, "total": len(favorites)}


@app.put("/api/users/{user_id}")
def update_user(user_id: str, data: UserProfileUpdate):
    """Update user profile fields."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        return profile

    updated = database.update_user_profile(user_id, updates)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    return updated


@app.get("/api/users/{user_id}/activity")
def get_user_activity(user_id: str, days: int = 90):
    """Get user activity heatmap and recent feed."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return database.get_user_activity(user_id, days=days)

@app.get("/api/stats")
def get_platform_stats():
    """Get platform-wide statistics for dashboard."""
    return database.get_platform_stats()


# ── Background task: run the full ML pipeline ──

def _run_generation(gen_id: str, user_id: str, image_path: str, style: str, temp_dir: str,
                    model_name: str = "", octree_resolution: int = 256, num_steps: int = 30, guidance_scale: float = 5.5,
                    enable_pbr: bool = True, poly_count: str = "50k"):
    """
    Run the full Hunyuan3D-2 pipeline in a background thread.
    Updates generation status in the database as it progresses.
    """
    try:
        print(f"[Gen {gen_id[:8]}] Starting generation", flush=True)
        print(f"[Gen {gen_id[:8]}] Params: res={octree_resolution}, steps={num_steps}, "
              f"guidance={guidance_scale}, pbr={enable_pbr}, poly={poly_count}", flush=True)

        database.update_generation_status(gen_id, "processing", progress=5)

        # ── Step 1: Preprocess image ──
        print(f"[Gen {gen_id[:8]}] Step 1: Preprocessing image...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=10)

        from image_preprocess import PreprocessPipeline
        from PIL import Image

        img = Image.open(image_path).convert("RGBA")
        preprocess = PreprocessPipeline()
        processed_path = preprocess.process(img, output_dir=temp_dir)
        print(f"[Gen {gen_id[:8]}] Preprocessing done", flush=True)

        database.update_generation_status(gen_id, "processing", progress=20)

        # ── Step 2: Generate geometry ──
        print(f"[Gen {gen_id[:8]}] Step 2: Generating geometry (res={octree_resolution}, steps={num_steps})...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=25)

        os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
        os.environ["HF_HUB_DISABLE_XET"] = "1"

        import torch
        import trimesh
        from hy3dgen.shapegen.pipelines import Hunyuan3DDiTFlowMatchingPipeline

        pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2")
        result = pipe(
            image=processed_path,
            octree_resolution=octree_resolution,
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            remove_bg=False,
            mc_algo="mc",
        )
        mesh = result if not isinstance(result, list) else result[0]
        print(f"[Gen {gen_id[:8]}] Geometry done: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces", flush=True)

        database.update_generation_status(gen_id, "processing", progress=45)

        # ── Step 2.5: Simplify mesh if needed (poly_count) ──
        poly_map = {"5k": 5000, "25k": 25000, "50k": 50000, "75k": 75000, "100k+": 100000}
        target_faces = poly_map.get(poly_count.lower(), 50000)

        if len(mesh.faces) > target_faces:
            try:
                mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
                print(f"[Gen {gen_id[:8]}] Mesh simplified to {len(mesh.faces)} faces", flush=True)
            except Exception as e:
                print(f"[Gen {gen_id[:8]}] WARN: Simplify failed: {e}, using original mesh", flush=True)

        database.update_generation_status(gen_id, "processing", progress=55)

        # Save geometry
        geometry_path = os.path.join(temp_dir, "geometry.glb")
        trimesh.Scene(geometry=mesh).export(geometry_path, file_type="glb")
        print(f"[Gen {gen_id[:8]}] Geometry saved: {geometry_path}", flush=True)

        # ── Step 2.5: Generate preview image (screenshot of the actual 3D model) ──
        preview_url = None
        print(f"[Gen {gen_id[:8]}] Step 2.5: Generating preview from 3D mesh...", flush=True)
        try:
            from PIL import Image as PILImage
            import pyrender
            import numpy as np

            scene_mesh = trimesh.Scene(geometry=mesh)

            # Compute bounding box for auto-framing
            bounds = scene_mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
            center = scene_mesh.centroid
            size = bounds[1] - bounds[0]
            max_dim = max(size.max(), 0.1)  # Avoid division by zero

            # Camera distance: enough to fit the model with padding
            cam_distance = max_dim * 2.5
            cam_position = center + np.array([0, size[1] * 0.3, cam_distance])
            cam_target = center

            # Create pyrender scene with gray background
            pr_scene = pyrender.Scene(
                ambient_light=np.array([0.5, 0.5, 0.5, 1.0]),
                bg_color=np.array([0.15, 0.15, 0.2, 1.0])
            )

            # Add mesh
            mesh_data = pyrender.Mesh.from_trimesh(scene_mesh.dump(concatenate=True))
            pr_scene.add(mesh_data, 'mesh')

            # Camera
            camera = pyrender.PerspectiveCamera(yfov=np.pi / 4.0)
            camera_node = pr_scene.add(camera, name='camera', pose=np.array([
                [1, 0, 0, cam_position[0]],
                [0, 1, 0, cam_position[1]],
                [0, 0, 1, cam_position[2]],
                [0, 0, 0, 1]
            ]))

            # Point camera at model center
            camera_node.matrix[:3, 3] = cam_position

            # Multiple lights for even illumination
            lights = [
                {'pos': cam_position + [0, max_dim, max_dim], 'intensity': 3.0},
                {'pos': cam_position + [max_dim, 0, max_dim * 0.5], 'intensity': 2.0},
                {'pos': cam_position + [-max_dim, 0, max_dim * 0.5], 'intensity': 2.0},
                {'pos': cam_position + [0, -max_dim, max_dim * 0.5], 'intensity': 1.5},
            ]
            for l in lights:
                light = pyrender.DirectionalLight(color=np.array([1.0, 1.0, 1.0]), intensity=l['intensity'])
                light_node = pyrender.Node(light=light, matrix=np.eye(4))
                light_node.matrix[:3, 3] = l['pos']
                pr_scene.add_node(light_node)

            # Offscreen renderer
            r = pyrender.OffscreenRenderer(512, 512)
            color, _ = r.render(pr_scene)
            r.delete()

            # Convert to PIL image and save
            img = PILImage.fromarray(color)
            preview_path = os.path.join(temp_dir, "preview.png")
            img.save(preview_path)

            # Upload preview (use timestamp to avoid conflicts on regeneration)
            import time
            ts = int(time.time() * 1000)
            preview_url = storage.upload_file(
                config.BUCKET_PREVIEWS, preview_path, f"{gen_id}/preview_{ts}.png"
            )
            print(f"[Gen {gen_id[:8]}] Preview uploaded: {preview_url}", flush=True)

        except Exception as e:
            print(f"[Gen {gen_id[:8]}] WARN: Preview generation failed: {e}, using fallback", flush=True)
            # Fallback: gradient image
            try:
                from PIL import Image as PILImage
                import numpy as np
                vertex_count = len(mesh.vertices)
                face_count = len(mesh.faces)
                color_seed = (vertex_count * 7 + face_count * 13) % 360
                h = color_seed / 360.0
                s, v = 0.6, 0.7
                i = int(h * 6)
                f = h * 6 - i
                p = v * (1 - s)
                q = v * (1 - f * s)
                t = v * (1 - (1 - f) * s)
                r, g, b = {
                    0: (v, t, p), 1: (q, v, p), 2: (p, v, t),
                    3: (p, q, v), 4: (t, p, v), 5: (v, p, q),
                }[i % 6]
                img = PILImage.new('RGB', (400, 300))
                pixels = img.load()
                for x in range(400):
                    for y in range(300):
                        dx = x / 400.0
                        dy = y / 300.0
                        cr = max(0, min(255, int(255 * (r * (0.7 + 0.3 * dx) + 0.1 * dy))))
                        cg = max(0, min(255, int(255 * (g * (0.7 + 0.3 * dy) + 0.1 * dx))))
                        cb = max(0, min(255, int(255 * (b * (0.7 + 0.3 * (dx + dy) / 2) + 0.1))))
                        pixels[x, y] = (cr, cg, cb)
                preview_path = os.path.join(temp_dir, "preview.png")
                img.save(preview_path)
                preview_url = storage.upload_file(
                    config.BUCKET_PREVIEWS, preview_path, f"{gen_id}/preview.png"
                )
            except Exception as e2:
                print(f"[Gen {gen_id[:8]}] WARN: Fallback preview also failed: {e2}", flush=True)
                preview_url = None

        # ── Step 3: Generate textures (only if PBR enabled) ──
        if enable_pbr:
            print(f"[Gen {gen_id[:8]}] Step 3: Generating PBR textures...", flush=True)
            database.update_generation_status(gen_id, "processing", progress=60)

            from hy3dgen.texgen.pipelines import Hunyuan3DPaintPipeline

            pipe_tex = Hunyuan3DPaintPipeline.from_pretrained(
                "tencent/Hunyuan3D-2",
                subfolder="hunyuan3d-paint-v2-0-turbo",
            )

            torch.cuda.empty_cache()
            import gc
            gc.collect()

            textured = pipe_tex(mesh, processed_path)
            print(f"[Gen {gen_id[:8]}] Textures done", flush=True)

            database.update_generation_status(gen_id, "processing", progress=80)

            # Save textured model
            final_path = os.path.join(temp_dir, "final_pbr.glb")
            trimesh.Scene(geometry=textured).export(final_path, file_type="glb")
            upload_path = final_path
        else:
            print(f"[Gen {gen_id[:8]}] Step 3: PBR disabled, using geometry-only", flush=True)
            database.update_generation_status(gen_id, "processing", progress=80)
            final_path = geometry_path
            upload_path = geometry_path

        # ── Step 4: Upload to Supabase Storage ──
        print(f"[Gen {gen_id[:8]}] Step 4: Uploading to Supabase Storage...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=85)

        model_url = storage.upload_model(upload_path, gen_id)
        if not model_url:
            raise Exception("Failed to upload model to storage")
        print(f"[Gen {gen_id[:8]}] Upload done: {model_url}", flush=True)

        database.update_generation_status(gen_id, "processing", progress=95)

        # Create model record in DB — status=pending until user chooses license
        model = database.create_model(
            author_id=user_id,
            name=model_name.strip() or f"Generated Model {gen_id[:8]}",
            description=f"AI-generated 3D model (style: {style})",
            category="Персонажи",
            format="GLB",
            file_url=model_url,
            preview_url=preview_url,
            ai_generated=True,
            status="pending",
            license="private",
            vertices_count=len(mesh.vertices),
            faces_count=len(mesh.faces),
        )
        print(f"[Gen {gen_id[:8]}] Model created in DB: {model['id']}", flush=True)

        database.update_generation_status(
            gen_id,
            "completed",
            progress=100,
            result_model_id=model["id"],
        )
        print(f"[Gen {gen_id[:8]}] Generation COMPLETE!", flush=True)

    except Exception as e:
        print(f"Generation failed: {e}")
        import traceback
        traceback.print_exc()
        database.update_generation_status(
            gen_id, "failed", error=str(e), progress=0
        )
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
