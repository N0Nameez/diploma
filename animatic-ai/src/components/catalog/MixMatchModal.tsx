import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Box, Loader2, Gamepad2 } from "lucide-react";
import { fetchModels, fetchAnimations, type ApiModel, type ApiAnimation } from "../../services/api";

interface MixMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, id: string, name: string) => void;
  mode: "models" | "animations";
  title?: string;
}

/**
 * Premium Mix & Match try-on modal for selecting animations or character models.
 */
export function MixMatchModal({
  isOpen,
  onClose,
  onSelect,
  mode,
  title,
}: MixMatchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset states
    setSearchQuery("");
    setError(null);
    setLoading(true);

    const loadData = async () => {
      try {
        if (mode === "animations") {
          const res = await fetchAnimations({ limit: 100 });
          // Ensure we only show animations with file_url
          const validAnimations = res.items.filter((item) => item.file_url);
          setItems(validAnimations);
        } else {
          // Fetch models in "Персонажи" category that have rigging/files
          const res = await fetchModels({
            categories: ["Персонажи"],
            limit: 100,
          });
          const validModels = res.items.filter((item) => item.file_url);
          setItems(validModels);
        }
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить ассеты");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, mode]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Local filtering based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  }, [items, searchQuery]);

  if (!isOpen) return null;

  const modalTitle = title || (mode === "animations" ? "Примерить анимацию" : "Выбрать модель для примерки");
  const placeholderText = mode === "animations" ? "Поиск анимаций..." : "Поиск персонажей...";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Dialog box */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-[520px] max-w-[95vw] h-[640px] max-h-[85vh] bg-background-surface border border-border/80 rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl backdrop-blur-xl z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-xl md:text-2xl text-text-primary tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-accent animate-pulse" />
              {modalTitle}
            </h2>
            <p className="text-xs text-text-secondary mt-1 font-light">
              {mode === "animations"
                ? "Выберите анимацию для воспроизведения на текущей модели"
                : "Выберите 3D-персонажа с ригом для воспроизведения анимации"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-background-secondary hover:bg-background-primary border border-border/50 text-text-secondary hover:text-text-primary flex items-center justify-center transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-5 flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            placeholder={placeholderText}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background-secondary border border-border/50 rounded-2xl text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-accent focus:bg-background-surface shadow-inner"
          />
        </div>

        {/* Content list */}
        <div className="flex-grow overflow-y-auto pr-1 -mr-2 space-y-2.5">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-text-secondary">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-xs font-medium">Загрузка библиотеки...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-danger">
              <span className="text-sm font-semibold mb-1">Произошла ошибка</span>
              <span className="text-xs opacity-80">{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-secondary">
              <span className="text-sm font-semibold mb-1">Ничего не найдено</span>
              <span className="text-xs opacity-75">Попробуйте ввести другой поисковый запрос</span>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.03 },
                },
              }}
              className="space-y-2"
            >
              {filteredItems.map((item) => {
                const isAnimation = mode === "animations";
                const isAi = isAnimation
                  ? item.source === "ai_generated"
                  : item.ai_generated;

                return (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      if (item.file_url) {
                        onSelect(item.file_url, item.id, item.name);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-4 p-3.5 rounded-2xl bg-background-secondary hover:bg-background-secondary/80 border border-border/40 hover:border-accent/40 cursor-pointer transition-all group"
                  >
                    {/* Preview / Icon */}
                    <div className="relative w-12 h-12 rounded-xl bg-background-surface/80 border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:bg-accent/5">
                      {item.preview_url ? (
                        <img
                          src={item.preview_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : isAnimation ? (
                        <Play className="w-5 h-5 text-accent/60 group-hover:text-accent transition-colors" />
                      ) : (
                        <Box className="w-5 h-5 text-accent/60 group-hover:text-accent transition-colors" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-text-primary truncate group-hover:text-accent transition-colors">
                          {item.name}
                        </span>
                        {isAi && (
                          <span className="text-[8px] font-extrabold text-white bg-accent px-1 py-0.5 rounded-[4px] uppercase tracking-wide">
                            ИИ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate font-light">
                        {item.description || "Описание отсутствует"}
                      </p>
                    </div>

                    {/* Format/Duration badge */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary bg-background-primary border border-border/40 px-2.5 py-1 rounded-lg">
                        {isAnimation
                          ? item.duration_seconds
                            ? `${item.duration_seconds}с`
                            : "ANIM"
                          : item.format || "GLB"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default MixMatchModal;
