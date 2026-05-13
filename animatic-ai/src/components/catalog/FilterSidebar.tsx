import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Layers, Layout, Zap, Filter, Sparkles, ChevronDown, Briefcase } from "lucide-react";
import FilterCheckbox from "./FilterCheckbox";
import { type CatalogStats } from "../../services/api";

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
  stats: CatalogStats | null;
}

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
  stats,
}: FilterSidebarProps) {
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  const allTags = stats?.tags || [];
  const typeTags = allTags.filter(t => t.tag_type === 'type');
  const industryTags = allTags.filter(t => t.tag_type === 'industry');

  const visibleTypeTags = showAllTypes ? typeTags : typeTags.slice(0, 6);
  const hasMoreTypes = typeTags.length > 6;

  const visibleIndustryTags = showAllIndustries ? industryTags : industryTags.slice(0, 6);
  const hasMoreIndustries = industryTags.length > 6;

  const formats = Object.keys(stats?.formats || {});
  const aiCount = stats?.ai_generated_count || 0;

  const formatCount = (f: string) => {
    const count = stats?.formats[f] || 0;
    return count > 999 ? `${(count / 1000).toFixed(1)}K` : String(count);
  };

  const tagCount = (t: any) => {
    const count = contentType === "3d" ? t.models_count : t.animations_count;
    return count > 999 ? `${(count / 1000).toFixed(1)}K` : String(count);
  };

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
          fixed top-[80px] left-0 z-50 w-[260px] h-[calc(100vh-80px)]
          bg-background-primary/80 backdrop-blur-2xl border-r border-border/50
          flex flex-col shadow-2xl
        `}
      >
        {/* Header/Spacer for Navbar */}
        <div className="flex-shrink-0 border-b border-border/5" />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6">
          {/* Header/Close button (mobile) */}
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

          {/* Industry Tags */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Briefcase size={12} /> Направление
            </p>
            <div className="space-y-1">
              {stats === null ? (
                <div className="text-[10px] text-text-muted italic px-2 py-1 text-center">Загрузка...</div>
              ) : industryTags.length > 0 ? (
                visibleIndustryTags.map((tag) => (
                  <FilterCheckbox
                    key={tag.id}
                    label={tag.name}
                    count={tagCount(tag)}
                    checked={selectedCats.includes(tag.name)}
                    onChange={() =>
                      onCatsChange(
                        selectedCats.includes(tag.name)
                          ? selectedCats.filter((x) => x !== tag.name)
                          : [...selectedCats, tag.name],
                      )
                    }
                  />
                ))
              ) : (
                <div className="text-[10px] text-text-muted italic px-2 py-1">Нет направлений</div>
              )}
              
              {hasMoreIndustries && (
                <button
                  onClick={() => setShowAllIndustries(!showAllIndustries)}
                  className="flex items-center gap-2 w-full px-2 py-2 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
                >
                  {showAllIndustries ? "Скрыть" : `Показать еще (${industryTags.length - 6})`}
                  <ChevronDown size={12} className={`transition-transform duration-300 ${showAllIndustries ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {/* Type Tags (Category) */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Layers size={12} /> Тип модели
            </p>
            <div className="space-y-1">
              {stats === null ? (
                <div className="text-[10px] text-text-muted italic px-2 py-1 text-center">Загрузка...</div>
              ) : typeTags.length > 0 ? (
                visibleTypeTags.map((tag) => (
                  <FilterCheckbox
                    key={tag.id}
                    label={tag.name}
                    count={tagCount(tag)}
                    checked={selectedCats.includes(tag.name)}
                    onChange={() =>
                      onCatsChange(
                        selectedCats.includes(tag.name)
                          ? selectedCats.filter((x) => x !== tag.name)
                          : [...selectedCats, tag.name],
                      )
                    }
                  />
                ))
              ) : (
                <div className="text-[10px] text-text-muted italic px-2 py-1">Нет типов</div>
              )}
              
              {hasMoreTypes && (
                <button
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="flex items-center gap-2 w-full px-2 py-2 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
                >
                  {showAllTypes ? "Скрыть" : `Показать еще (${typeTags.length - 6})`}
                  <ChevronDown size={12} className={`transition-transform duration-300 ${showAllTypes ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {/* Format */}
          {contentType === "3d" && (
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
                <Zap size={12} /> Формат файла
              </p>
              <div className="space-y-1">
                {stats === null ? (
                  <div className="text-[10px] text-text-muted italic px-2 py-1">Загрузка...</div>
                ) : formats.length > 0 ? (
                  formats.map((f) => (
                    <FilterCheckbox
                      key={f}
                      label={f}
                      count={formatCount(f)}
                      checked={selectedFormats.includes(f)}
                      onChange={() =>
                        onFormatsChange(
                          selectedFormats.includes(f)
                            ? selectedFormats.filter((x) => x !== f)
                            : [...selectedFormats, f],
                        )
                      }
                    />
                  ))
                ) : (
                   <div className="text-[10px] text-text-muted italic px-2 py-1">Нет форматов</div>
                )}
              </div>
            </div>
          )}

          {/* Source */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-text-muted mb-4 flex items-center gap-2">
              <Sparkles size={12} /> Источник
            </p> 
            <FilterCheckbox
              label="Сгенерировано ИИ"
              count={aiCount > 999 ? `${(aiCount / 1000).toFixed(1)}K` : String(aiCount)}
              checked={onlyAI}
              onChange={() => onAIChange(!onlyAI)}
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

        {/* Desktop Toggle Button */}
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
