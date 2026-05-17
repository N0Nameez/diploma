import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { createReport } from "../services/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  entityType: "model" | "user" | "comment";
  entityId: string;
  onSuccess?: () => void;
}

const REASONS = [
  { id: "copyright", label: "Нарушение авторских прав" },
  { id: "inappropriate", label: "Неприемлемый контент" },
  { id: "spam", label: "Спам или реклама" },
  { id: "other", label: "Другое" },
];

export function ReportModal({
  isOpen,
  onClose,
  userId,
  entityType,
  entityId,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState("inappropriate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await createReport(userId, entityType, entityId, reason);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || "Ошибка при отправке жалобы");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  const titleMap = {
    model: "Пожаловаться на модель",
    user: "Пожаловаться на пользователя",
    comment: "Пожаловаться на комментарий",
  };

  return (
    <div
      className={`fixed inset-0 z-[1100] flex items-center justify-center bg-background-primary/60 backdrop-blur-md transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-[440px] max-w-[95vw] bg-background-glass backdrop-blur-3xl border border-border-glass rounded-[32px] p-8 shadow-2xl transition-all duration-300 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-xl hover:bg-white/5 border border-border-glass text-text-secondary hover:text-text-primary flex items-center justify-center transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {titleMap[entityType]}
            </h2>
            <p className="text-xs text-text-muted uppercase font-bold tracking-wider">
              ID: {entityId.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px] px-1">
            Причина жалобы
          </label>
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`w-full px-5 py-3.5 rounded-2xl border text-left text-sm font-medium transition-all duration-200 ${
                  reason === r.id
                    ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]"
                    : "bg-white/5 border-border-glass text-text-secondary hover:border-white/20 hover:text-text-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-4 rounded-2xl bg-white/5 border border-border-glass text-text-primary font-bold text-sm hover:bg-white/10 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-4 rounded-2xl bg-danger text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-danger/20"
          >
            {loading ? "Отправка..." : "Отправить жалобу"}
          </button>
        </div>
      </div>
    </div>
  );
}
