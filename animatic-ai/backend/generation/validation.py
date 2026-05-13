"""
validation.py — Валидация входного фото для Hunyuan3D-2

Проверки:
  1. T-pose или A-pose (руки подняты/расставлены)
  2. Полный рост (все части тела видны)
  3. Лицо видно
  4. Разрешение и качество
"""

import os
import cv2
import numpy as np
from PIL import Image
from pathlib import Path


class PhotoValidator:
    """
    Валидатор фото для генерации 3D-моделей.

    Требования к фото:
      - Человек в полный рост
      - T-pose или A-pose (руки расставлены)
      - Лицо хорошо видно
      - Минимальное разрешение 512x512
      - Не слишком тёмное/размытое
    """

    def __init__(self):
        import mediapipe as mp
        self._mp = mp

        BaseOptions = mp.tasks.BaseOptions
        PoseLandmarker = mp.tasks.vision.PoseLandmarker
        PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode
        ImageFormat = mp.ImageFormat

        model_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'pose_landmarker_heavy.task'
        )

        options_kwargs = dict(
            running_mode=VisionRunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.3,
            min_pose_presence_confidence=0.3,
            min_tracking_confidence=0.3,
        )
        if os.path.exists(model_path):
            options_kwargs['base_options'] = BaseOptions(model_asset_path=model_path)

        options = PoseLandmarkerOptions(**options_kwargs)
        self._landmarker = PoseLandmarker.create_from_options(options)

    def validate(self, image: Image.Image) -> dict:
        """
        Валидация фото.

        Returns:
            dict с полями:
              - valid: bool — проходит ли фото
              - errors: list[str] — список ошибок
              - warnings: list[str] — список предупреждений
              - pose_info: dict — информация о позе
        """
        errors = []
        warnings = []

        # Проверка 1: Разрешение
        w, h = image.size
        if w < 512 or h < 512:
            errors.append(f"Разрешение слишком маленькое: {w}x{h}. Минимум: 512x512")
        elif w < 800 or h < 800:
            warnings.append(f"Разрешение небольшое: {w}x{h}. Рекомендуется 800x800+")

        # Проверка 2: Детекция позы
        img_rgb = np.array(image.convert('RGB'))
        mp_image = self._mp.Image(
            image_format=self._mp.ImageFormat.SRGB,
            data=img_rgb
        )
        result = self._landmarker.detect(mp_image)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            errors.append("Не удалось обнаружить человека на фото")
            return {
                'valid': False,
                'errors': errors,
                'warnings': warnings,
                'pose_info': None,
            }

        lm = result.pose_landmarks[0]
        pose_info = self._analyze_pose(lm, w, h)

        # Проверка 3: T-pose / A-pose
        if not pose_info['is_tpose'] and not pose_info['is_apose']:
            errors.append(
                "Человек не в T-pose или A-pose. "
                "Руки должны быть расставлены в стороны (под углом 30-90° от тела). "
                f"Текущий угол рук: {pose_info['arm_angle']:.0f}°"
            )

        # Проверка 4: Полный рост
        if not pose_info['full_body_visible']:
            missing = pose_info['missing_parts']
            if missing:
                errors.append(f"Не все части тела видны: {', '.join(missing)}")

        # Проверка 5: Лицо видно
        if not pose_info['face_visible']:
            errors.append("Лицо не видно. Убедитесь что голова не обрезана и повёрнута к камере")

        # Проверка 6: Качество (яркость)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        mean_brightness = gray.mean()
        if mean_brightness < 40:
            errors.append(f"Фото слишком тёмное (яркость: {mean_brightness:.0f}/255)")
        elif mean_brightness < 80:
            warnings.append(f"Фото немного тёмное (яркость: {mean_brightness:.0f}/255)")
        elif mean_brightness > 230:
            warnings.append(f"Фото слишком светлое (яркость: {mean_brightness:.0f}/255)")

        # Проверка 7: Резкость (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 50:
            warnings.append(f"Фото может быть размытым (резкость: {laplacian_var:.0f})")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'pose_info': pose_info,
        }

    def _analyze_pose(self, landmarks, img_w: int, img_h: int) -> dict:
        """Анализ позы по landmark-ам MediaPipe."""
        # Индексы ключевых точек
        nose = landmarks[0]
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_elbow = landmarks[13]
        right_elbow = landmarks[14]
        left_wrist = landmarks[15]
        right_wrist = landmarks[16]
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        left_knee = landmarks[25]
        right_knee = landmarks[26]
        left_ankle = landmarks[27]
        right_ankle = landmarks[28]

        margin = 0.03

        # Проверяем какие части тела видны (не обрезаны)
        missing_parts = []
        if nose.y < margin:
            missing_parts.append('голова')
        if left_wrist.x < margin or left_wrist.x > (1 - margin):
            missing_parts.append('левая рука')
        if right_wrist.x < margin or right_wrist.x > (1 - margin):
            missing_parts.append('правая рука')
        if left_ankle.y > (1 - margin):
            missing_parts.append('левая нога')
        if right_ankle.y > (1 - margin):
            missing_parts.append('правая нога')

        full_body_visible = len(missing_parts) == 0
        face_visible = nose.y >= margin

        # Угол рук относительно тела (T-pose / A-pose)
        # Вычисляем угол между линией плечо-запястье и вертикалью
        left_arm_angle = self._angle_from_vertical(
            left_shoulder.x, left_shoulder.y,
            left_wrist.x, left_wrist.y
        )
        right_arm_angle = self._angle_from_vertical(
            right_shoulder.x, right_shoulder.y,
            right_wrist.x, right_wrist.y
        )
        avg_arm_angle = (left_arm_angle + right_arm_angle) / 2

        # T-pose: руки горизонтально (~70-90°)
        # A-pose: руки под углом ~30-60°
        is_tpose = 60 <= avg_arm_angle <= 100
        is_apose = 25 <= avg_arm_angle <= 70

        # Проверка: ноги расставлены
        leg_spread = abs(left_ankle.x - right_ankle.x)
        legs_together = leg_spread < 0.10

        return {
            'is_tpose': is_tpose,
            'is_apose': is_apose,
            'arm_angle': avg_arm_angle,
            'full_body_visible': full_body_visible,
            'face_visible': face_visible,
            'missing_parts': missing_parts,
            'legs_together': legs_together,
            'leg_spread': leg_spread,
        }

    def _angle_from_vertical(self, x1, y1, x2, y2) -> float:
        """Угол между линией (x1,y1)-(x2,y2) и вертикалью в градусах."""
        dx = x2 - x1
        dy = y2 - y1
        if dy == 0:
            return 90.0
        import math
        angle = math.degrees(math.atan2(abs(dx), abs(dy)))
        return angle

    def __del__(self):
        if hasattr(self, '_landmarker'):
            self._landmarker.close()


class ContentClassifier:
    """
    Классификатор контента на базе CLIP для автоматического определения типа 3D-модели.
    """
    
    def __init__(self, model_id="openai/clip-vit-base-patch32"):
        from transformers import CLIPProcessor, CLIPModel
        import torch
        
        self._torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        print(f"[Classifier] Loading CLIP model {model_id} on {self.device}...", flush=True)
        self.model = CLIPModel.from_pretrained(model_id).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_id)
        
        # Маппинг для базы данных (Russian names as returned in model page)
        self.labels = {
            "characters": "Персонажи",
            "architecture": "Архитектура",
            "transport": "Транспорт",
            "weapons": "Оружие",
            "animals": "Животные",
            "furniture": "Мебель",
            "plants": "Растения",
            "other": "Прочее"
        }
        
        # Промпты для CLIP (на английском работают значительно точнее)
        self.prompts = [
            "a 3d character, person, human, or humanoid creature",
            "architecture, building, house, or structure",
            "transport, vehicle, car, aircraft, or ship",
            "a weapon, sword, firearm, or tactical gear",
            "an animal, wild creature, or pet",
            "furniture, home decor, chair, or table",
            "a plant, flower, tree, or nature object",
            "a small prop, household item, or toy"
        ]
        self.slugs = list(self.labels.keys())

    def classify(self, image: Image.Image) -> str:
        """
        Анализирует изображение и возвращает наиболее подходящую категорию.
        """
        import torch
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        inputs = self.processor(
            text=self.prompts, 
            images=image, 
            return_tensors="pt", 
            padding=True
        ).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
            
        best_idx = probs.argmax().item()
        best_slug = self.slugs[best_idx]
        confidence = probs[0][best_idx].item()
        
        print(f"[Classifier] Predicted: {best_slug} ({self.labels[best_slug]}) with confidence {confidence:.2f}", flush=True)
        
        # If confidence is too low, fallback to 'other'
        if confidence < 0.15:
            return "Прочее"
            
        return self.labels.get(best_slug, "Прочее")
