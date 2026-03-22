import { useState, useEffect } from 'react'
import Section  from '../components/Section'
import Button from '../components/Button'
import FilterSidebar from '../components/catalog/FilterSidebar'
import ModelCard from '../components/ModelCard'
import ModelListItem from '../components/catalog/ModelListItem'
import EmptyState from '../components/catalog/EmptyState'

interface CatalogPageProps {
  initialContentType?: '3d' | 'animation'
}

const MODELS = [
  { id:'1', name:'Рыцарь Тьмы', author:'alex3d', authorInitial:'А', authorColor:'#1B6EF3', likes:'1.2K', downloads:'340', format:'GLB', emoji:'🤺', gradient:'linear-gradient(145deg,#0D2045,#1B3A6B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'2', name:'Маг Артемис', author:'mage_art', authorInitial:'М', authorColor:'#7C3AED', likes:'876', downloads:'210', format:'FBX', emoji:'🧙', gradient:'linear-gradient(145deg,#1F0D45,#3A1B6B)', aiGenerated:false, category:'Персонажи', type:'3d' as const },
  { id:'3', name:'Боевой андроид', author:'robo_k', authorInitial:'R', authorColor:'#F59E0B', likes:'2.1K', downloads:'892', format:'GLB', emoji:'🦾', gradient:'linear-gradient(145deg,#3A200D,#6B3A1B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'4', name:'Дракон Азурит', author:'dragonfly', authorInitial:'D', authorColor:'#06B6D4', likes:'3.4K', downloads:'1.1K', format:'FBX', emoji:'🐉', gradient:'linear-gradient(145deg,#0D2A3A,#1B4A6B)', aiGenerated:false, category:'Персонажи', type:'3d' as const },
  { id:'5', name:'Астронавт v2', author:'space_3d', authorInitial:'S', authorColor:'#8B5CF6', likes:'987', downloads:'445', format:'GLB', emoji:'👩‍🚀', gradient:'linear-gradient(145deg,#2A0D3A,#4A1B6B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'6', name:'Японский замок', author:'kiriko', authorInitial:'К', authorColor:'#10B981', likes:'654', downloads:'198', format:'OBJ', emoji:'🏯', gradient:'linear-gradient(145deg,#0D3A20,#1B6B3A)', aiGenerated:false, category:'Архитектура', type:'3d' as const },
  { id:'7', name:'Клинок Хаоса', author:'weaponsmith', authorInitial:'W', authorColor:'#EF4444', likes:'1.7K', downloads:'567', format:'FBX', emoji:'⚔️', gradient:'linear-gradient(145deg,#3A0D0D,#6B1B1B)', aiGenerated:true, category:'Оружие', type:'3d' as const },
  { id:'8', name:'Эльф-лучник', author:'elf_lord', authorInitial:'E', authorColor:'#14B8A6', likes:'543', downloads:'123', format:'GLB', emoji:'🧝', gradient:'linear-gradient(145deg,#0D3A3A,#1B6B6B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'9', name:'Древний лес', author:'nature3d', authorInitial:'N', authorColor:'#D97706', likes:'432', downloads:'87', format:'OBJ', emoji:'🌲', gradient:'linear-gradient(145deg,#2A3A0D,#4A6B1B)', aiGenerated:false, category:'Природа', type:'3d' as const },
  { id:'10', name:'Киберхерой', author:'cyber_v', authorInitial:'C', authorColor:'#EC4899', likes:'1.1K', downloads:'321', format:'FBX', emoji:'🦸', gradient:'linear-gradient(145deg,#3A0D2A,#6B1B4A)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'11', name:'Античный храм', author:'arch3d', authorInitial:'A', authorColor:'#6366F1', likes:'789', downloads:'234', format:'GLB', emoji:'🏛️', gradient:'linear-gradient(145deg,#0D1A3A,#1B2A6B)', aiGenerated:false, category:'Архитектура', type:'3d' as const },
  { id:'12', name:'Протодроид', author:'proto_x', authorInitial:'P', authorColor:'#F97316', likes:'923', downloads:'412', format:'FBX', emoji:'🤖', gradient:'linear-gradient(145deg,#3A3A0D,#6B6B1B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
  { id:'13', name:'Викинг-ярл', author:'nordic_art', authorInitial:'V', authorColor:'#A855F7', likes:'1.5K', downloads:'678', format:'GLB', emoji:'🪓', gradient:'linear-gradient(145deg,#2A0D3A,#4A1B6B)', aiGenerated:false, category:'Персонажи', type:'3d' as const },
  { id:'14', name:'Неоновый байк', author:'cyber_rider', authorInitial:'N', authorColor:'#06B6D4', likes:'2.3K', downloads:'891', format:'FBX', emoji:'🏍️', gradient:'linear-gradient(145deg,#0D2A3A,#1B4A6B)', aiGenerated:true, category:'Транспорт', type:'3d' as const },
  { id:'15', name:'Стимпанк-мех', author:'gear_master', authorInitial:'G', authorColor:'#D97706', likes:'1.8K', downloads:'543', format:'OBJ', emoji:'⚙️', gradient:'linear-gradient(145deg,#3A2A0D,#6B4A1B)', aiGenerated:false, category:'Персонажи', type:'3d' as const },
  { id:'16', name:'Ледяной голем', author:'frost_3d', authorInitial:'F', authorColor:'#22D3EE', likes:'1.3K', downloads:'456', format:'GLB', emoji:'🧊', gradient:'linear-gradient(145deg,#0D3A3A,#1B6B6B)', aiGenerated:true, category:'Персонажи', type:'3d' as const },
]

const ANIMATIONS = [
  { id:'a1', name:'Бег персонажа', author:'anim_pro', authorInitial:'A', authorColor:'#F59E0B', likes:'890', downloads:'234', format:'FBX', emoji:'🏃', gradient:'linear-gradient(145deg,#3A200D,#6B3A1B)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a2', name:'Атака мечом', author:'sword_anim', authorInitial:'S', authorColor:'#EF4444', likes:'1.2K', downloads:'567', format:'FBX', emoji:'⚔️', gradient:'linear-gradient(145deg,#3A0D0D,#6B1B1B)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
  { id:'a3', name:'Магический каст', author:'spell_fx', authorInitial:'M', authorColor:'#8B5CF6', likes:'756', downloads:'189', format:'GLB', emoji:'✨', gradient:'linear-gradient(145deg,#2A0D3A,#4A1B6B)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a4', name:'Полёт дракона', author:'dragon_motion', authorInitial:'D', authorColor:'#06B6D4', likes:'2.1K', downloads:'892', format:'FBX', emoji:'🐉', gradient:'linear-gradient(145deg,#0D2A3A,#1B4A6B)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
  { id:'a5', name:'Эмоции NPC', author:'face_rig', authorInitial:'F', authorColor:'#EC4899', likes:'543', downloads:'123', format:'GLB', emoji:'😊', gradient:'linear-gradient(145deg,#3A0D2A,#6B1B4A)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a6', name:'Боевая стойка', author:'combat_anim', authorInitial:'C', authorColor:'#10B981', likes:'987', downloads:'345', format:'FBX', emoji:'🥊', gradient:'linear-gradient(145deg,#0D3A20,#1B6B3A)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
  { id:'a7', name:'Танец эльфа', author:'elf_motion', authorInitial:'E', authorColor:'#14B8A6', likes:'432', downloads:'98', format:'GLB', emoji:'💃', gradient:'linear-gradient(145deg,#0D3A3A,#1B6B6B)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a8', name:'Смерть босса', author:'boss_fx', authorInitial:'B', authorColor:'#DC2626', likes:'1.7K', downloads:'678', format:'FBX', emoji:'💀', gradient:'linear-gradient(145deg,#3A0D0D,#6B1B1B)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
  { id:'a9', name:'Ходьба цикл', author:'walk_cycle', authorInitial:'W', authorColor:'#6366F1', likes:'654', downloads:'234', format:'GLB', emoji:'🚶', gradient:'linear-gradient(145deg,#0D1A3A,#1B2A6B)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a10', name:'Прыжок героя', author:'jump_anim', authorInitial:'J', authorColor:'#F97316', likes:'876', downloads:'321', format:'FBX', emoji:'🦘', gradient:'linear-gradient(145deg,#3A200D,#6B3A1B)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
  { id:'a11', name:'Стрельба из лука', author:'archer_pro', authorInitial:'A', authorColor:'#84CC16', likes:'1.1K', downloads:'456', format:'GLB', emoji:'🏹', gradient:'linear-gradient(145deg,#2A3A0D,#4A6B1B)', aiGenerated:false, category:'Персонажи', type:'animation' as const },
  { id:'a12', name:'Телепортация', author:'magic_fx', authorInitial:'T', authorColor:'#A855F7', likes:'1.9K', downloads:'789', format:'FBX', emoji:'🌀', gradient:'linear-gradient(145deg,#2A0D3A,#4A1B6B)', aiGenerated:true, category:'Персонажи', type:'animation' as const },
]

const CATEGORIES = ['Персонажи','Архитектура','Природа','Транспорт','Оружие','Животные','Интерьер']
const FORMATS: ('GLB'|'FBX'|'OBJ')[] = ['GLB','FBX','OBJ']
const SORT_OPTIONS = ['По популярности','Сначала новые','Высокий рейтинг','Больше загрузок']

const CAT_COUNTS: Record<string,string> = { Персонажи:'3.2K', Архитектура:'1.8K', Природа:'987', Транспорт:'654', Оружие:'432', Животные:'389', Интерьер:'276' }
const FORMAT_COUNTS: Record<string,string> = { GLB:'6.1K', FBX:'4.2K', OBJ:'2.1K' }

function CatalogPage({ initialContentType = '3d' }: CatalogPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [contentType, setContentType] = useState<'3d' | 'animation'>(initialContentType)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  const [sort, setSort] = useState('По популярности')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [onlyAI, setOnlyAI] = useState(false)

  useEffect(() => {
    setContentType(initialContentType)
  }, [initialContentType])

  const data = contentType === '3d' ? MODELS : ANIMATIONS

  const filtered = data.filter(m => {
    if (selectedCats.length && !selectedCats.includes(m.category!)) return false
    if (selectedFormats.length && !selectedFormats.includes(m.format)) return false
    if (onlyAI && !m.aiGenerated) return false
    return true
  })

  return (
    <div className="flex pt-16 min-h-screen">
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        contentType={contentType}
        onContentTypeChange={setContentType}
        selectedCats={selectedCats}
        onCatsChange={setSelectedCats}
        selectedFormats={selectedFormats}
        onFormatsChange={setSelectedFormats}
        onlyAI={onlyAI}
        onAIChange={setOnlyAI}
      />

      {/* Main */}
      <main className="flex-1 px-8 py-7 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <Section 
            label='Каталог' 
            title={contentType === '3d' ? '3D-модели' : 'Анимации'} 
            sub={`Найдено ${filtered.length} ${contentType === '3d' ? 'моделей' : 'анимаций'}`}
          />

          <Button
            variant="filter-toggle"
            label={isSidebarOpen ? 'Скрыть фильтры' : 'Фильтры'}
            icon={
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 4h18M3 12h12M3 20h6"/>
              </svg>
            }
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
          />

          {/* View controls */}
          <div className="flex items-center gap-2.5">
            <select 
              value={sort} 
              onChange={e => setSort(e.target.value)}
              className="px-3.5 py-2 bg-surface2 border border-border rounded-[10px]
                         text-text text-sm outline-none cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <div className="flex bg-surface2 border border-border rounded-[10px] overflow-hidden">
              <button 
                onClick={() => setViewMode('grid')}
                className={`w-9 h-9 flex items-center justify-center transition-all
                  ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-textSecondary hover:text-text'}`}
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                </svg>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`w-9 h-9 flex items-center justify-center transition-all
                  ${viewMode === 'list' ? 'bg-accent text-white' : 'text-textSecondary hover:text-text'}`}
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid gap-[18px]" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
              {filtered.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(m => <ModelListItem key={m.id} model={m} />)}
            </div>
          )
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  )
}

export default CatalogPage