"""Supabase Storage operations — upload and retrieve GLB files."""

import os
from pathlib import Path
from supabase import create_client
import config


def get_client():
    """Create Supabase client with service role key."""
    return create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)


def upload_file(bucket: str, file_path: str, destination_path: str) -> str | None:
    """
    Upload a file to Supabase Storage.

    Returns the public URL or None on failure.
    """
    client = get_client()

    with open(file_path, "rb") as f:
        file_content = f.read()

    return _upload_bytes(bucket, file_content, destination_path, _guess_content_type(file_path))


def upload_bytes(bucket: str, data: bytes, destination_path: str, content_type: str = "application/octet-stream") -> str | None:
    """Upload raw bytes to Supabase Storage."""
    return _upload_bytes(bucket, data, destination_path, content_type)


def _upload_bytes(bucket: str, data: bytes, destination_path: str, content_type: str) -> str | None:
    """Internal: upload bytes to storage."""
    client = get_client()

    try:
        client.storage.from_(bucket).upload(
            destination_path,
            data,
            file_options={"content-type": content_type},
        )
        public_url = client.storage.from_(bucket).get_public_url(destination_path)
        return public_url
    except Exception as e:
        print(f"Upload error: {e}")
        return None


def upload_model(file_path: str, generation_id: str) -> str | None:
    """Upload a GLB model file to the models bucket."""
    ext = Path(file_path).suffix  # .glb, .obj, .fbx
    destination = f"{generation_id}/model{ext}"
    return upload_file(config.BUCKET_MODELS, file_path, destination)


def upload_preview(file_path: str, generation_id: str) -> str | None:
    """Upload a preview image to the previews bucket."""
    destination = f"{generation_id}/preview.png"
    return upload_file(config.BUCKET_PREVIEWS, file_path, destination)


def upload_source_image(file_path: str, generation_id: str) -> str | None:
    """Upload the source input image to the previews bucket."""
    destination = f"{generation_id}/source.png"
    return upload_file(config.BUCKET_PREVIEWS, file_path, destination)


def _guess_content_type(file_path: str) -> str:
    """Guess MIME type from file extension."""
    ext = Path(file_path).suffix.lower()
    types = {
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".obj": "model/obj",
        ".fbx": "application/octet-stream",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    return types.get(ext, "application/octet-stream")
