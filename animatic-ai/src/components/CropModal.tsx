import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";

interface CropModalProps {
  image: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => void;
  aspect?: number;
  circular?: boolean;
  title?: string;
}

export function CropModal({
  image,
  open,
  onClose,
  onConfirm,
  aspect = 1,
  circular = false,
  title = "Редактировать фото",
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback(
    (_croppedArea: any, croppedAreaPx: any) => {
      setCroppedAreaPixels(croppedAreaPx);
    },
    [],
  );

  const getCroppedImg = async (): Promise<Blob> => {
    const imageEl = new Image();
    imageEl.src = image;
    await new Promise<void>((resolve) => {
      if (imageEl.complete && imageEl.naturalWidth > 0) resolve();
      else imageEl.onload = () => resolve();
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    if (!croppedAreaPixels) throw new Error("No crop area");

    const { width, height, x, y } = croppedAreaPixels;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(imageEl, x, y, width, height, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png", 0.95);
    });
  };

  const handleConfirm = async () => {
    try {
      const blob = await getCroppedImg();
      onConfirm(blob);
    } catch (err) {
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-background-primary/60 backdrop-blur-md z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-background-glass border border-border-glass rounded-[32px] overflow-hidden max-w-2xl w-full backdrop-blur-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-glass bg-background-surface/5">
          <h3 className="text-base font-medium text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-background-secondary/50 border border-border-glass flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative h-[500px] bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={circular ? "round" : "rect"}
            showGrid={false}
            zoomSpeed={0.3}
          />
        </div>

        {/* Controls */}
        <div className="px-8 py-6 border-t border-border-glass bg-background-surface/5">
          <div className="flex items-center gap-6 mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Масштаб</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-accent h-1.5 rounded-full bg-background-secondary appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-text-secondary w-8 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-2xl bg-accent text-white text-sm font-semibold shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:brightness-110 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Применить
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-background-secondary/50 border border-border-glass text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-background-secondary transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
