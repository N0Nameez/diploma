import type { GenerationHistory } from "../../hooks/useGeneration";
import {
  History,
  Box,
  Dot,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface HistoryPanelProps {
  history: GenerationHistory[];
  onClear: () => void;
  onSelectItem: (id: string, status: string) => void;
}

export function HistoryPanel({
  history,
  onClear,
  onSelectItem,
}: HistoryPanelProps) {
  const getStatusBadge = (
    status: GenerationHistory["status"],
    queuePosition?: number | null,
  ) => {
    switch (status) {
      case "completed":
        return { text: "Готово", class: "bg-green-500/10 text-green-500" };
      case "processing":
        return { text: "Обработка", class: "bg-accent/10 text-accent" };
      case "queued":
        return queuePosition
          ? {
              text: `В очереди #${queuePosition}`,
              class: "bg-accent/10 text-accent",
            }
          : { text: "В очереди", class: "bg-accent/10 text-accent" };
      case "failed":
        return { text: "Ошибка", class: "bg-red-500/10 text-red-500" };
      default:
        return { text: status, class: "bg-background-secondary text-text-secondary" };
    }
  };

  const getStatusIcon = (status: GenerationHistory["status"]) => {
    switch (status) {
      case "completed":
        return null; // show thumbnail
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case "queued":
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      default:
        return <Box className="w-4 h-4 text-text-secondary" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "только что";
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "вчера";
    return `${diffDays} дн. назад`;
  };

  const displayHistory = history.slice(0, 5);

  return (
    <div className="bg-background-surface border border-border rounded-[18px] p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 font-extrabold text-[14px] text-text">
          <History className="w-4 h-4 text-text-secondary" />
          История генераций
        </div>
        <button
          onClick={onClear}
          className="text-[12px] text-text-muted hover:text-red-500 transition-colors duration-200 bg-none border-none cursor-pointer font-sans"
        >
          Очистить
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {displayHistory.length === 0 ? (
          <div className="text-center py-6 text-text-secondary text-sm">
            История пуста
          </div>
        ) : (
          displayHistory.map((item) => {
            const badge = getStatusBadge(item.status, item.queuePosition);
            const icon = getStatusIcon(item.status);
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id, item.status)}
                className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-background-secondary transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden relative bg-background-surface">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-background-secondary">
                      {icon || <Box className="w-4 h-4 text-text-secondary" />}
                    </div>
                  )}
                  {/* Status overlay for non-completed */}
                  {item.status !== "completed" && item.thumbnail && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      {icon}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center text-[11px] text-text-muted mt-0.5">
                    {item.type === "model_photo" ? "3D-модель" : "Анимация"}
                    <Dot className="w-3 h-3" />
                    {getTimeAgo(item.createdAt)}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold ${badge.class}`}
                >
                  {badge.text}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default HistoryPanel;
