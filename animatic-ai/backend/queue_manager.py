"""
Queue Manager — submit jobs to ARQ queue and check status/position.
"""
import os
import json
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
ARQ_QUEUE_KEY = "arq:queue"

async def get_redis_pool():
    """Get or create Redis connection pool for ARQ."""
    return await create_pool(
        RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    )

async def submit_generation_job(
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
) -> str:
    """
    Submit a generation job to the ARQ queue.
    Returns the job ID (same as gen_id).
    """
    pool = await get_redis_pool()

    await pool.enqueue_job(
        "generate_model_from_image",
        gen_id=gen_id,
        user_id=user_id,
        image_path=image_path,
        style=style,
        model_name=model_name,
        octree_resolution=octree_resolution,
        num_steps=num_steps,
        guidance_scale=guidance_scale,
        enable_pbr=enable_pbr,
        enable_rig=enable_rig,
        poly_count=poly_count,
        _job_id=gen_id,
    )
    
    print(f"[Queue] Submitted job {gen_id}", flush=True)
    return gen_id

async def get_queue_position(job_id: str) -> int | None:
    """
    Get the position of a job in the queue.
    Returns None if job is not in queue (already processing or completed).
    """
    import redis.asyncio as aioredis
    
    redis = aioredis.from_url(f"redis://{REDIS_HOST}:{REDIS_PORT}")
    
    try:
        # Get all jobs in the queue
        queue_jobs = await redis.lrange(ARQ_QUEUE_KEY, 0, -1)
        
        for i, job_bytes in enumerate(queue_jobs):
            try:
                job_data = json.loads(job_bytes)
                if job_data.get("job_id") == job_id:
                    return i + 1
            except:
                pass
        
        return None
    finally:
        await redis.close()

async def get_queue_length() -> int:
    """Get the number of jobs currently in the queue."""
    import redis.asyncio as aioredis
    
    redis = aioredis.from_url(f"redis://{REDIS_HOST}:{REDIS_PORT}")
    
    try:
        return await redis.llen(ARQ_QUEUE_KEY)
    finally:
        await redis.close()
