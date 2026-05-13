import torch
from PIL import Image
import io
from transformers import pipeline
from fastapi import HTTPException
import os

# Using a lightweight ViT-based NSFW detector
MODEL_NAME = "Falconsai/nsfw_image_detection"

class NSFWValidator:
    def __init__(self):
        self.pipe = None
        self.device = 0 if torch.cuda.is_available() else -1

    def load_model(self):
        if self.pipe is None:
            try:
                print(f"Loading NSFW model: {MODEL_NAME} on {'GPU' if self.device == 0 else 'CPU'}...")
                self.pipe = pipeline("image-classification", model=MODEL_NAME, device=self.device)
            except Exception as e:
                print(f"CRITICAL ERROR LOADING NSFW MODEL: {e}")
                # Fallback to CPU if GPU fails
                if self.device == 0:
                    self.device = -1
                    self.pipe = pipeline("image-classification", model=MODEL_NAME, device=self.device)

    def get_nsfw_score(self, image_bytes: bytes) -> float:
        self.load_model()
        if not self.pipe:
            return 0.0
            
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            results = self.pipe(image)
            
            # Results format: [{"label": "nsfw", "score": 0.9}, {"label": "normal", "score": 0.1}]
            for res in results:
                if res["label"].lower() == "nsfw":
                    return res["score"]
            return 0.0
        except Exception as e:
            print(f"NSFW CHECK ERROR: {e}")
            return 0.0

validator = NSFWValidator()

def validate_image(image_bytes: bytes, threshold: float = 0.7):
    """
    Validates image bytes for NSFW content.
    Raises HTTPException 400 if NSFW score > threshold.
    """
    score = validator.get_nsfw_score(image_bytes)
    if score > threshold:
        print(f"NSFW DETECTED: Score {score}")
        raise HTTPException(
            status_code=400,
            detail="Изображение не прошло фильтр безопасности"
        )
    return True
