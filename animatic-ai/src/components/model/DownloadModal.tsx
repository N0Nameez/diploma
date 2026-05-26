import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

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
      className={`fixed inset-0 z-[1000] bg-background-primary/60 backdrop-blur-md flex items-center justify-center ${
        isClosing ? "animate-fade-out" : "animate-fade"
      }`}
    >
      <div
        className={`relative w-[480px] max-w-[95vw] bg-background-glass backdrop-blur-3xl border border-border-glass rounded-[32px] p-10 shadow-2xl ${
          isClosing ? "animate-fade-out" : "animate-fade"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 border border-border-glass text-text-secondary hover:text-accent hover:border-accent/30 flex items-center justify-center transition-all duration-200 text-xl"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="font-extrabold text-2xl text-text-primary mb-1">
          {modelName}
        </div>
        <div className="text-sm text-text-secondary font-light mb-8">
          Выберите формат для скачивания
        </div>

        {/* Format Options */}
        <div className="flex flex-col gap-3">
          {FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              onClick={() => handleFormatClick(fmt)}
              className={`flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-border-glass cursor-pointer hover:border-accent/40 hover:bg-white/10 transition-all duration-200 ${
                downloading === fmt.id ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-extrabold tracking-[0.5px] border border-white/5 shadow-inner"
                style={{ background: fmt.color, color: fmt.textColor }}
              >
                {fmt.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-text-primary text-sm">
                  {fmt.name} — {fmt.desc}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                  {downloading === fmt.id
                    ? "Конвертация..."
                    : fmt.id === "glb"
                      ? "Оригинальный формат"
                      : "Конвертация из GLB"}
                </div>
              </div>
              <Download className="w-5 h-5 text-text-muted" />
            </div>
          ))}
        </div>

        {/* Notice */}
        <div className="mt-8 p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
             <svg
                width="12"
                height="12"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed">
            Модель распространяется по лицензии <strong className="text-text-primary">CC BY 4.0</strong>. При
            использовании, пожалуйста, укажите автора произведения.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadModal;
