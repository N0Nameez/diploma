import { useState } from "react";
import { Lock, Eye, Globe, Check } from "lucide-react";

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (license: string) => void;
  modelId: string | null;
}

const LICENSES = [
  {
    id: "private",
    name: "Приватная",
    description: "Модель видите только вы",
    icon: Lock,
    color: "text-text-secondary",
    borderColor: "border-border",
  },
  {
    id: "view_only",
    name: "Просмотр",
    description: "Все видят модель, но скачать могут только вы",
    icon: Eye,
    color: "text-accent",
    borderColor: "border-accent/30",
  },
  {
    id: "free_use",
    name: "Публичная",
    description: "Все видят, могут скачать и использовать",
    icon: Globe,
    color: "text-success",
    borderColor: "border-success/30",
  },
];

export function LicenseModal({
  isOpen,
  onClose,
  onPublish,
  modelId,
}: LicenseModalProps) {
  const [selected, setSelected] = useState("view_only");
  const [publishing, setPublishing] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish(selected);
    } catch (err) {
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-background-primary/60 backdrop-blur-md animate-fade"
    >
      <div className="bg-background-glass backdrop-blur-3xl border border-border-glass rounded-[32px] p-8 shadow-2xl w-full max-w-md mx-4 transition-all duration-200 animate-fade">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-text-primary mb-2">
            Выберите лицензию
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed px-4">
            Кто может видеть и скачать вашу модель?
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {LICENSES.map((lic) => {
            const Icon = lic.icon;
            const isSelected = selected === lic.id;
            return (
              <button
                key={lic.id}
                onClick={() => setSelected(lic.id)}
                className={`flex items-start gap-4 p-4 rounded-[20px] border-2 text-left transition-all duration-200
                  ${
                    isSelected
                      ? `${lic.borderColor} bg-accent/5`
                      : "border-border-glass hover:border-border-glass hover:bg-white/5"
                  }`}
              >
                <div className={`mt-1 ${lic.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-sm ${lic.color} flex items-center gap-2`}>
                    {lic.name}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="text-xs text-text-secondary mt-1 leading-normal">
                    {lic.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="flex-1 py-3.5 rounded-xl bg-white/5 border border-border-glass text-text-secondary text-sm font-bold hover:text-text-primary hover:bg-white/10 transition-all duration-200"
          >
            Позже
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 py-3.5 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 transition-all duration-200 shadow-lg shadow-accent/20"
          >
            {publishing ? "Публикация..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LicenseModal;
