import { useState, useRef } from "react";
import { Viewer3D } from "../Viewer3D";
import { Camera, Video, Dot } from "lucide-react";

interface UploadPanelProps {
  mode: "model" | "animation";
  file: File | null;
  fileUrl: string | null;
  uploading: boolean;
  generating: boolean; /* true когда модель генерируется */
  progress: number; /* 0-100 прогресс генерации */
  status: string | null; /* queued | processing | completed | failed */
  modelFileUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}

const MODEL_FORMATS = ["JPG", "PNG", "WEBP"];
const ANIMATION_FORMATS = ["MP4", "MOV", "WEBM"];
const MAX_SIZE_MODEL = 20; // MB
const MAX_SIZE_ANIMATION = 200; // MB

export function UploadPanel({
  mode,
  file,
  fileUrl,
  uploading,
  generating,
  progress,
  status,
  modelFileUrl,
  onUpload,
  onRemove,
}: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isModel = mode === "model";
  const formats = isModel ? MODEL_FORMATS : ANIMATION_FORMATS;
  const maxSize = isModel ? MAX_SIZE_MODEL : MAX_SIZE_ANIMATION;

  /* Toggle between photo and 3D viewer */
  const [viewMode, setViewMode] = useState<"photo" | "3d">("photo");

  /* 🧹 Refactored: 2026-04-21 — removed dead code */
  const isCompleted = status === "completed" && modelFileUrl;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (uploadedFile: File) => {
    const sizeMB = uploadedFile.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      alert(`Файл слишком большой. Максимум ${maxSize} МБ`);
      return;
    }

    const ext = uploadedFile.name.split(".").pop()?.toUpperCase();
    if (ext && !formats.includes(ext)) {
      alert(`Неподдерживаемый формат. Доступны: ${formats.join(", ")}`);
      return;
    }

    onUpload(uploadedFile);
  };

  const handleRemove = () => {
    setViewMode("photo");
    onRemove();
  };

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 transition-colors duration-200">
      <div className="flex items-center gap-[10px] mb-4">
        <span className="font-extrabold text-[15px] text-text">
          {isModel ? (
            <Camera className="w-[18px] h-[18px] inline mr-1.5" />
          ) : (
            <Video className="w-[18px] h-[18px] inline mr-1.5" />
          )}
          {isModel ? "Загрузи фото" : "Загрузи видео"}
        </span>
        <span className="px-[10px] py-[3px] rounded-[100px] bg-red-500/10 text-red-500 text-[10px] font-bold tracking-[0.8px] uppercase">
          Обязательно
        </span>
      </div>

      {!file ? (
        /* Drop zone */
        <div
          className={`border-2 border-dashed rounded-[14px] p-10 text-center cursor-pointer
                      transition-all duration-200 ${
                        dragActive
                          ? "border-accent bg-accent/10 scale-[1.01]"
                          : "border-drop-border bg-drop-bg hover:border-accent hover:bg-accent/10"
                      }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div
            className="w-[56px] h-[56px] rounded-[16px] bg-surface2 border border-border
                          flex items-center justify-center mx-auto mb-4
                          transition-transform duration-200 hover:-translate-y-1"
          >
            {isModel ? (
              <Camera className="w-[28px] h-[28px] text-text-secondary" />
            ) : (
              <Video className="w-[28px] h-[28px] text-text-secondary" />
            )}
          </div>
          <div className="font-semibold text-[15px] mb-1.5">
            {isModel ? "Перетащи фото сюда" : "Перетащи видео сюда"}
          </div>
          <div className="text-[13px] text-textSecondary font-light mb-3.5">
            {isModel
              ? "Чёткий портрет, хорошее освещение, нейтральный фон"
              : "Видео с чёткими движениями, 5–30 сек"}
          </div>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {formats.map((fmt, i) => (
              <>
                {i > 0 && <Dot className="w-3 h-3 text-text-muted" />}
                <span
                  key={fmt}
                  className="px-[10px] py-[3px] rounded-[6px] bg-surface2
                                           text-[11px] font-semibold text-text-secondary border border-border"
                >
                  {fmt}
                </span>
              </>
            ))}
            <Dot className="w-3 h-3 text-text-muted" />
            <span className="text-[11px] font-semibold text-textSecondary">
              до {maxSize} МБ
            </span>
          </div>
          <button
            className="mt-[14px] px-[18px] py-2 rounded-[9px] bg-accent text-white
                           text-[13px] font-semibold hover:opacity-[0.85] hover:-translate-y-px
                           transition-all duration-200"
          >
            Выбрать файл
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={isModel ? "image/*" : "video/*"}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : generating && fileUrl ? (
        /* Генерация — показываем фото + прогресс */
        <div className="relative rounded-[14px] overflow-hidden border border-border bg-black/40">
          <img
            src={fileUrl}
            alt="Source"
            className="w-full aspect-[4/3] object-contain"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="text-[40px] font-extrabold text-accent tabular-nums">
              {progress}%
            </div>
            <div className="text-[13px] text-text-secondary">
              {progress < 15
                ? "Подготовка..."
                : progress < 30
                  ? "Предобработка..."
                  : progress < 55
                    ? "Генерация геометрии..."
                    : progress < 65
                      ? "Упрощение меша..."
                      : progress < 95
                        ? "Создание текстур..."
                        : "Финализация..."}
            </div>
            <div className="w-3/4 h-[6px] bg-surface3 rounded-[3px] overflow-hidden">
              <div
                className="h-full bg-accent rounded-[3px] transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : isCompleted && modelFileUrl ? (
        /* Готово — показываем 3D Viewer с toggle */
        <div className="space-y-3">
          {/* Toggle buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("photo")}
              className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${
                  viewMode === "photo"
                    ? "bg-accent text-white"
                    : "bg-surface2 text-text-secondary hover:text-text border border-border"
                }`}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              Фото
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${
                  viewMode === "3d"
                    ? "bg-accent text-white"
                    : "bg-surface2 text-text-secondary hover:text-text border border-border"
                }`}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z" />
              </svg>
              3D модель
            </button>
          </div>

          {/* Content */}
          {viewMode === "photo" ? (
            <div className="relative rounded-[14px] overflow-hidden border border-border bg-black/40">
              <img
                src={fileUrl!}
                alt="Source"
                className="w-full aspect-[4/3] object-contain"
              />
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-[7px] bg-surface/90 backdrop-blur border border-border
                           text-textSecondary hover:bg-red-500/20 hover:border-red-500/30
                           hover:text-red-500 transition-all duration-200 flex items-center justify-center text-[14px]"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative rounded-[14px] overflow-hidden border border-border bg-black/40">
              <Viewer3D
                variant="full"
                modelUrl={modelFileUrl}
                showBadge={true}
                showToolbar={true}
                autoRotate={false}
                className="aspect-[4/3] rounded-none border-0"
              />
            </div>
          )}
        </div>
      ) : fileUrl ? (
        /* Фото загружено, генерация ещё не началась */
        <div className="relative rounded-[14px] overflow-hidden border border-border bg-black/40">
          <img
            src={fileUrl}
            alt="Source"
            className="w-full aspect-[4/3] object-contain"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-[7px] bg-surface/90 backdrop-blur border border-border
                       text-textSecondary hover:bg-red-500/20 hover:border-red-500/30
                       hover:text-red-500 transition-all duration-200 flex items-center justify-center text-[14px]"
          >
            ×
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
            <div className="text-[12px] text-white font-medium">
              {file.name}
            </div>
            <div className="flex items-center gap-0.5 text-[11px] text-white/60">
              {(file.size / (1024 * 1024)).toFixed(1)} МБ
              <Dot className="w-3 h-3" />
              Готово к генерации
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UploadPanel;
