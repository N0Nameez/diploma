"""
image_preprocess.py — Предобработка фото для Hunyuan3D-2

Пайплайн:
  1. Real-ESRGAN x4 — апскейл
  2. Canvas 2048x2048 — квадратный холст с прозрачностью
  3. BiRefNet — удаление фона
"""

import os
import cv2
import torch
import numpy as np
from PIL import Image
from pathlib import Path

os.environ['HF_HUB_DISABLE_XET'] = '1'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

TARGET_SIZE = 2048
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'


class SuperRes:
    """Апскейл через Real-ESRGAN x4"""

    def __init__(self):
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        self.upsampler = RealESRGANer(
            scale=4,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
            model=model,
            tile=512,
            tile_pad=10,
            pre_pad=0,
            half=True,
            device=DEVICE,
        )
        print("[OK] Real-ESRGAN x4 загружен")

    def upscale(self, image: Image.Image) -> Image.Image:
        # Check if the image has a transparent alpha channel
        has_alpha = False
        if image.mode == 'RGBA':
            alpha = image.split()[-1]
            alpha_np = np.array(alpha)
            if not np.all(alpha_np == 255):
                has_alpha = True

        if has_alpha:
            print("  Alpha channel detected, upscaling RGB and Alpha separately...")
            # Split into RGB and Alpha
            rgb = image.convert('RGB')
            img_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
            upscaled_bgr, _ = self.upsampler.enhance(img_bgr, outscale=1)
            upscaled_rgb = cv2.cvtColor(upscaled_bgr, cv2.COLOR_BGR2RGB)
            upscaled_rgb_pil = Image.fromarray(upscaled_rgb)

            # Upscale Alpha channel by duplicating it into a 3-channel image
            alpha_pil = image.split()[-1]
            alpha_3ch = Image.merge('RGB', (alpha_pil, alpha_pil, alpha_pil))
            alpha_bgr = cv2.cvtColor(np.array(alpha_3ch), cv2.COLOR_RGB2BGR)
            upscaled_alpha_bgr, _ = self.upsampler.enhance(alpha_bgr, outscale=1)
            upscaled_alpha_rgb = cv2.cvtColor(upscaled_alpha_bgr, cv2.COLOR_BGR2RGB)
            upscaled_alpha = Image.fromarray(upscaled_alpha_rgb).split()[0]

            # Recombine into RGBA
            r, g, b = upscaled_rgb_pil.split()
            return Image.merge('RGBA', (r, g, b, upscaled_alpha))
        else:
            img_bgr = cv2.cvtColor(np.array(image.convert('RGB')), cv2.COLOR_RGB2BGR)
            upscaled_bgr, _ = self.upsampler.enhance(img_bgr, outscale=1)
            upscaled_rgb = cv2.cvtColor(upscaled_bgr, cv2.COLOR_BGR2RGB)
            return Image.fromarray(upscaled_rgb)


def prepare_canvas(img: Image.Image, target_size: int = TARGET_SIZE) -> Image.Image:
    """Upscales и pads до квадратного canvas 2048x2048 с прозрачностью."""
    img = img.convert('RGBA')
    w, h = img.size
    aspect = w / h
    if aspect > 1:
        new_w = target_size
        new_h = int(target_size / aspect)
    else:
        new_h = target_size
        new_w = int(target_size * aspect)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    offset_x = (target_size - new_w) // 2
    offset_y = (target_size - new_h) // 2
    canvas.paste(img_resized, (offset_x, offset_y))
    return canvas


class BackgroundRemover:
    """Удаление фона через BiRefNet (работает на CPU)"""

    def __init__(self):
        from rembg import new_session
        self.session = new_session('birefnet-general', providers=['CPUExecutionProvider'])
        print("[OK] BiRefNet загружен (CPU)")

    def remove_bg(self, image: Image.Image) -> Image.Image:
        from rembg import remove
        return remove(image, session=self.session)


class PreprocessPipeline:
    """
    Пайплайн предобработки для Hunyuan3D-2.

    Шаги:
      1. Real-ESRGAN x4 — апскейл
      2. Canvas 2048x2048 — квадратный холст
      3. BiRefNet — удаление фона (пропускается для прозрачных изображений)
    """

    def __init__(self):
        self._super_res = None
        self._bg_remover = None

    def _init_super_res(self):
        if self._super_res is None:
            self._super_res = SuperRes()

    def _init_bg_remover(self):
        if self._bg_remover is None:
            self._bg_remover = BackgroundRemover()

    def process(self, image: Image.Image, output_dir: str = None) -> str:
        if output_dir:
            Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Check if the source image already has real transparency
        has_alpha = False
        if image.mode == 'RGBA':
            alpha = image.split()[-1]
            alpha_np = np.array(alpha)
            if not np.all(alpha_np == 255):
                has_alpha = True

        result = image

        # Шаг 1: Upscale
        print("\n[1/3] Upscaling (Real-ESRGAN x4)")
        self._init_super_res()
        result = self._super_res.upscale(result)
        if output_dir:
            p = os.path.join(output_dir, '01_upscaled.png')
            result.save(p)
            print(f"  saved: {p} ({result.size[0]}x{result.size[1]})")

        # Шаг 2: Квадратный canvas
        print("\n[2/3] Квадратный canvas 2048x2048")
        result = prepare_canvas(result, TARGET_SIZE)
        if output_dir:
            p = os.path.join(output_dir, '02_canvas.png')
            result.save(p)
            print(f"  saved: {p}")

        # Шаг 3: Удаление фона
        if has_alpha:
            print("\n[3/3] Удаление фона (BiRefNet) ПРОПУЩЕНО, так как исходное изображение уже прозрачное")
        else:
            print("\n[3/3] Удаление фона (BiRefNet)")
            self._init_bg_remover()
            result = self._bg_remover.remove_bg(result)
        
        if output_dir:
            p = os.path.join(output_dir, '03_processed.png')
            result.save(p)
            print(f"  saved: {p}")

        if output_dir:
            final_path = os.path.join(output_dir, 'processed.png')
            result.save(final_path)
            print(f"\n[OK] Готово: {final_path}")
            print(f"   Размер: {result.size[0]}x{result.size[1]}")
            return final_path
        return result
