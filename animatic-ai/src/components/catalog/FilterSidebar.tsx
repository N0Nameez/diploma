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

function FilterSidebar({
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-background-primary/60 backdrop-blur-md z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        w-[260px] flex-shrink-0 bg-background-primary/80 backdrop-blur-2xl border-r border-border
        px-5 py-7 h-[calc(100vh-64px)] overflow-y-auto 
        transition-color duration-200
        fixed lg:fixed top-16 left-0 z-50
        transform transition-transform duration-200
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-2 right-2 w-8 h-8 rounded-lg
                     bg-background-secondary border border-border-glass
                     text-text-secondary hover:text-text-primary
                     flex items-center justify-center transition-all duration-200 text-lg"
        >
          ×
        </button>

        {/* Toggle button (desktop) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute top-2 right-2 w-8 h-8 rounded-lg
                     bg-background-secondary border border-border
                     text-text-secondary hover:text-text-primary
                     flex items-center justify-center transition-all duration-200"
          title={isOpen ? "Скрыть панель" : "Показать панель"}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {isOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
          </svg>
        </button>

        {/* Content type */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-secondary mb-3">
            Тип контента
          </p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onContentTypeChange("3d")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200
                ${
                  contentType === "3d"
                    ? "bg-accent text-white border-accent"
                    : "bg-transparent border-border text-text-secondary hover:border-accent"
                }`}
            >
              3D-модели
            </button>
            <button
              onClick={() => onContentTypeChange("animation")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200
                ${
                  contentType === "animation"
                    ? "bg-accent text-white border-accent"
                    : "bg-transparent border-border text-text-secondary hover:border-accent"
                }`}
            >
              Анимации
            </button>
          </div>
        </div>
        <div className="h-px bg-border mb-4" />

        {/* Category */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-secondary mb-3">
            Категория
          </p>
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
        <div className="h-px bg-border mb-4" />

        {/* Format */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-secondary mb-3">
            Формат файла
          </p>
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
        <div className="h-px bg-border mb-4" />

        {/* Source */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-secondary mb-3">
            Источник
          </p>
          <FilterCheckbox
            label="✦ Сгенерировано ИИ"
            count="8.9K"
            checked={onlyAI}
            onChange={() => onAIChange(!onlyAI)}
          />
        </div>

        {/* Clear filters */}
        <button
          onClick={() => {
            onCatsChange([]);
            onFormatsChange([]);
            onAIChange(false);
          }}
          className="w-full py-2.5 rounded-[10px] bg-transparent border border-border
                     text-text-secondary text-sm cursor-pointer
                     hover:border-accent hover:text-accent transition-all duration-200"
        >
          ✕ Сбросить фильтры
        </button>
      </aside>
    </>
  );
}

export default FilterSidebar;
