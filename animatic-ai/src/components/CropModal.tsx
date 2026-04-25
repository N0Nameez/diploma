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
      console.error("Crop error:", err);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl overflow-hidden max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface2/50">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-textSecondary hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
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
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs text-textSecondary">Масштаб</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="text-xs text-textSecondary w-8 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:brightness-108 transition-all"
            >
              Применить
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-surface2 border border-border text-textSecondary text-sm hover:text-text transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
