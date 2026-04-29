import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Layers, Layout, Zap, Filter } from "lucide-react";
import FilterCheckbox from "./FilterCheckbox";

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  contentType: "3d" | "animation";
  onContentTypeChange: (type: "3d" | "animation") => void;
  selectedCats: string[];
  onCatsChange: (cats: string[]) => void;
  selectedFormats: string[];
  onFormatsChange: (formats: string[]) => void;
  onlyAI: boolean;
  onAIChange: (value: boolean) => void;
}

const CATEGORIES = [
  "Персонажи",
  "Архитектура",
  "Природа",
  "Транспорт",
  "Оружие",
  "Животные",
  "Интерьер",
];
const FORMATS: ("GLB" | "FBX" | "OBJ")[] = ["GLB", "FBX", "OBJ"];

const CAT_COUNTS: Record<string, string> = {
  Персонажи: "3.2K",
  Архитектура: "1.8K",
  Природа: "987",
  Транспорт: "654",
  Оружие: "432",
  Животные: "389",
  Интерьер: "276",
};
const FORMAT_COUNTS: Record<string, string> = {
  GLB: "6.1K",
  FBX: "4.2K",
  OBJ: "2.1K",
};

export function FilterSidebar({
  isOpen,
  onClose,
  onToggle,
  contentType,
  onContentTypeChange,
  selectedCats,
  onCatsChange,
  selectedFormats,
  onFormatsChange,
  onlyAI,
  onAIChange,
}: FilterSidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -260,
          opacity: 1
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`
          fixed top-0 left-0 z-50 w-[260px] h-screen
          bg-background-primary/80 backdrop-blur-2xl border-r border-border/50
          flex flex-col shadow-2xl
        `}
      >
        {/* Header/Spacer for Navbar */}
        <div className="h-20 flex-shrink-0 border-b border-border/5" />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6">
          {/* Toggle button (inside for mobile, fixed for desktop) */}
          <div className="flex items-center justify-between lg:hidden mb-6">
            <span className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Filter size={16} className="text-accent" /> Фильтры
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-background-secondary border border-border/50 text-text-secondary hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content type */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Layout size={12} /> Тип контента
            </p>
            <div className="flex p-1 bg-background-secondary/50 rounded-xl border border-border/30">
              <button
                onClick={() => onContentTypeChange("3d")}
                className={`flex-1 py-2 rounded-[9px] text-xs font-semibold transition-all duration-300
                  ${contentType === "3d"
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                3D-модели
              </button>
              <button
                onClick={() => onContentTypeChange("animation")}
                className={`flex-1 py-2 rounded-[9px] text-xs font-semibold transition-all duration-300
                  ${contentType === "animation"
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                Анимации
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Layers size={12} /> Категория
            </p>
            <div className="space-y-1">
              {CATEGORIES.map((c) => (
                <FilterCheckbox
                  key={c}
                  label={c}
                  count={CAT_COUNTS[c] ?? "—"}
                  checked={selectedCats.includes(c)}
                  onChange={() =>
                    onCatsChange(
                      selectedCats.includes(c)
                        ? selectedCats.filter((x) => x !== c)
                        : [...selectedCats, c],
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Zap size={12} /> Формат файла
            </p>
            <div className="space-y-1">
              {FORMATS.map((f) => (
                <FilterCheckbox
                  key={f}
                  label={f}
                  count={FORMAT_COUNTS[f]}
                  checked={selectedFormats.includes(f)}
                  onChange={() =>
                    onFormatsChange(
                      selectedFormats.includes(f)
                        ? selectedFormats.filter((x) => x !== f)
                        : [...selectedFormats, f],
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4">
              Источник
            </p>
            <FilterCheckbox
              label="✦ Сгенерировано ИИ"
              count="8.9K"
              checked={onlyAI}
              onChange={() => onAIChange(!onlyAI)}
              isAIGen
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-border/5 bg-background-secondary/20">
          <button
            onClick={() => {
              onCatsChange([]);
              onFormatsChange([]);
              onAIChange(false);
            }}
            className="w-full py-2.5 rounded-xl bg-transparent border border-border/50
                       text-text-secondary text-xs font-medium flex items-center justify-center gap-2
                       hover:border-accent/50 hover:text-accent transition-all duration-300"
          >
            <X size={14} /> Сбросить фильтры
          </button>
        </div>

        {/* Desktop Toggle Button (Floating on the edge) */}
        <button
          onClick={onToggle}
          className={`hidden lg:flex absolute top-1/2 -right-8 w-8 h-12 bg-background-primary/80 border border-border/50
                     rounded-r-xl items-center justify-center text-text-secondary hover:text-accent
                     shadow-[4px_0_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all duration-300 z-10 -translate-y-1/2 group
                     hover:w-9 hover:-right-9`}
          title={isOpen ? "Скрыть панель" : "Показать панель"}
        >
          {isOpen ? (
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          ) : (
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      </motion.aside>
    </>
  );
}

export default FilterSidebar;
