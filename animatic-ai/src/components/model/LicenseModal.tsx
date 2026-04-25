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
      console.error("Publish failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ backgroundColor: "var(--overlay-half)" }}
    >
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 transition-all duration-200">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-text mb-1">
            Выберите лицензию
          </h3>
          <p className="text-sm text-text-secondary">
            Кто может видеть и скачать вашу модель?
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {LICENSES.map((lic) => {
            const Icon = lic.icon;
            const isSelected = selected === lic.id;
            return (
              <button
                key={lic.id}
                onClick={() => setSelected(lic.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${
                    isSelected
                      ? `${lic.borderColor} bg-accent/5`
                      : "border-border hover:border-border/50"
                  }`}
              >
                <div className={`mt-0.5 ${lic.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${lic.color}`}>
                    {lic.name}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 inline ml-1" />
                    )}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {lic.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={publishing}
            className="flex-1 py-2.5 rounded-lg bg-surface2 border border-border text-text-secondary text-sm font-semibold hover:text-text transition-all duration-200"
          >
            Позже
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:brightness-108 transition-all duration-200"
          >
            {publishing ? "Публикация..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LicenseModal;
