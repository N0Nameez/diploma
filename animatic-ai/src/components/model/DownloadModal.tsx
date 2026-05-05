import { useState, useEffect } from "react";
import { Download } from "lucide-react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  modelId: string;
  onDownload: (format: string) => Promise<void>;
}

const FORMATS = [
  {
    id: "glb",
    name: "GLB",
    desc: "Веб и UE5",
    icon: "GLB",
    color: "rgba(27,110,243,0.15)",
    textColor: "#1B6EF3",
  },
  {
    id: "obj",
    name: "OBJ",
    desc: "Blender, ZBrush",
    icon: "OBJ",
    color: "rgba(16,185,129,0.15)",
    textColor: "#10B981",
  },
  {
    id: "stl",
    name: "STL",
    desc: "3D-печать",
    icon: "STL",
    color: "rgba(245,158,11,0.15)",
    textColor: "#F59E0B",
  },
];

export function DownloadModal({
  isOpen,
  onClose,
  modelName,
  modelId,
  onDownload,
}: DownloadModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  async function handleFormatClick(fmt: (typeof FORMATS)[number]) {
    setDownloading(fmt.id);
    try {
      await onDownload(fmt.id);
      handleClose();
    } catch (err) {
    } finally {
      setDownloading(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center ${
        isClosing ? "animate-fade-out" : "animate-fade"
      }`}
    >
      <div
        className={`relative w-[480px] max-w-[95vw] bg-background-surface border border-border rounded-3xl p-9 ${
          isClosing ? "animate-fade-out" : "animate-fade"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-background-secondary border border-border text-textSecondary hover:text-text flex items-center justify-center transition-all duration-200 text-lg"
        >
          ×
        </button>

        {/* Header */}
        <div className="font-extrabold text-2xl text-text mb-1">
          {modelName}
        </div>
        <div className="text-sm text-textSecondary font-light mb-6">
          Выберите формат для скачивания
        </div>

        {/* Format Options */}
        <div className="flex flex-col gap-3">
          {FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              onClick={() => handleFormatClick(fmt)}
              className={`flex items-center gap-4 p-4 rounded-xl bg-background-secondary border border-border cursor-pointer hover:border-accent hover:bg-accentGlow/30 transition-all duration-200 ${
                downloading === fmt.id ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-extrabold tracking-[0.5px]"
                style={{ background: fmt.color, color: fmt.textColor }}
              >
                {fmt.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-text text-sm">
                  {fmt.name} — {fmt.desc}
                </div>
                <div className="text-xs text-text-secondary">
                  {downloading === fmt.id
                    ? "Конвертация..."
                    : fmt.id === "glb"
                      ? "Оригинал"
                      : "Конвертация из GLB"}
                </div>
              </div>
              <Download className="w-5 h-5 text-textSecondary" />
            </div>
          ))}
        </div>

        {/* Notice */}
        <div className="mt-6 p-4 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-3">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-xs text-textSecondary leading-relaxed">
            Модель распространяется по лицензии <strong>CC BY 4.0</strong>. При
            использовании укажите автора.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadModal;
