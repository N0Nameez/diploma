import FilterCheckbox from './FilterCheckbox'

interface FilterSidebarProps {
  isOpen: boolean
  onClose: () => void
  contentType: '3d' | 'animation'
  onContentTypeChange: (type: '3d' | 'animation') => void
  selectedCats: string[]
  onCatsChange: (cats: string[]) => void
  selectedFormats: string[]
  onFormatsChange: (formats: string[]) => void
  onlyAI: boolean
  onAIChange: (value: boolean) => void
}

const CATEGORIES = ['Персонажи','Архитектура','Природа','Транспорт','Оружие','Животные','Интерьер']
const FORMATS: ('GLB'|'FBX'|'OBJ')[] = ['GLB','FBX','OBJ']

const CAT_COUNTS: Record<string,string> = { Персонажи:'3.2K', Архитектура:'1.8K', Природа:'987', Транспорт:'654', Оружие:'432', Животные:'389', Интерьер:'276' }
const FORMAT_COUNTS: Record<string,string> = { GLB:'6.1K', FBX:'4.2K', OBJ:'2.1K' }

function FilterSidebar({
  isOpen,
  onClose,
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-[260px] flex-shrink-0 bg-surface border-r border-border
        px-5 py-7 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto 
        transition-colors duration-200
        fixed lg:static top-16 left-0 z-40
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-2 right-2 w-8 h-8 rounded-lg
                     bg-surface2 border border-border
                     text-textSecondary hover:text-text
                     flex items-center justify-center transition-all text-lg"
        >
          ×
        </button>

        {/* Content type */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-textSecondary mb-3">
            Тип контента
          </p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onContentTypeChange('3d')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                ${contentType === '3d' 
                  ? 'bg-accent text-white border-accent' 
                  : 'bg-transparent border-border text-textSecondary hover:border-accent'}`}
            >
              3D-модели
            </button>
            <button
              onClick={() => onContentTypeChange('animation')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                ${contentType === 'animation' 
                  ? 'bg-accent text-white border-accent' 
                  : 'bg-transparent border-border text-textSecondary hover:border-accent'}`}
            >
              Анимации
            </button>
          </div>
        </div>
        <div className="h-px bg-border mb-4" />

        {/* Category */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-textSecondary mb-3">
            Категория
          </p>
          {CATEGORIES.map(c => (
            <FilterCheckbox 
              key={c} 
              label={c} 
              count={CAT_COUNTS[c] ?? '—'}
              checked={selectedCats.includes(c)}
              onChange={() => onCatsChange(
                selectedCats.includes(c) 
                  ? selectedCats.filter(x => x !== c)
                  : [...selectedCats, c]
              )} 
            />
          ))}
        </div>
        <div className="h-px bg-border mb-4" />

        {/* Format */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-textSecondary mb-3">
            Формат файла
          </p>
          {FORMATS.map(f => (
            <FilterCheckbox 
              key={f} 
              label={f} 
              count={FORMAT_COUNTS[f]}
              checked={selectedFormats.includes(f)}
              onChange={() => onFormatsChange(
                selectedFormats.includes(f) 
                  ? selectedFormats.filter(x => x !== f)
                  : [...selectedFormats, f]
              )} 
            />
          ))}
        </div>
        <div className="h-px bg-border mb-4" />

        {/* Source */}
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-textSecondary mb-3">
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
            onCatsChange([])
            onFormatsChange([])
            onAIChange(false)
          }}
          className="w-full py-2.5 rounded-[10px] bg-transparent border border-border
                     text-textSecondary text-sm cursor-pointer
                     hover:border-accent hover:text-accent transition-all"
        >
          ✕ Сбросить фильтры
        </button>
      </aside>
    </>
  )
}

export default FilterSidebar