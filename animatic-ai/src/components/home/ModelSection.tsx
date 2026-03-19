import { useState } from 'react'
import { Link } from 'react-router-dom'
import Section from '../Section'
 
const FILTERS = ['Все', 'Персонажи', 'Архитектура', 'Природа', 'Оружие']
 
const MODELS = [
  { id: '1', name: 'Рыцарь Тьмы',   author: 'alex3d',    initial: 'А', color: '#1B6EF3', likes: '2.1K', format: 'GLB', emoji: '🤺', gradient: 'linear-gradient(135deg,#0D2045,#1B3A6B)' },
  { id: '2', name: 'Маг Артемис',    author: 'mage_art',  initial: 'М', color: '#7C3AED', likes: '876',  format: 'FBX', emoji: '🧙', gradient: 'linear-gradient(135deg,#1F0D45,#3A1B6B)' },
  { id: '3', name: 'Японский замок', author: 'kiriko',    initial: 'К', color: '#10B981', likes: '654',  format: 'OBJ', emoji: '🏯', gradient: 'linear-gradient(135deg,#0D3A20,#1B6B3A)' },
  { id: '4', name: 'Боевой андроид', author: 'robo_k',    initial: 'R', color: '#F59E0B', likes: '2.1K', format: 'GLB', emoji: '🦾', gradient: 'linear-gradient(135deg,#3A200D,#6B3A1B)' },
  { id: '5', name: 'Дракон Азурит',  author: 'dragonfly', initial: 'D', color: '#06B6D4', likes: '3.4K', format: 'FBX', emoji: '🐉', gradient: 'linear-gradient(135deg,#0D2A3A,#1B4A6B)' },
  { id: '6', name: 'Астронавт v2',   author: 'space_3d',  initial: 'S', color: '#8B5CF6', likes: '987',  format: 'GLB', emoji: '👩‍🚀', gradient: 'linear-gradient(135deg,#2A0D3A,#4A1B6B)' },
  { id: '7', name: 'Древний лес',    author: 'nature3d',  initial: 'N', color: '#D97706', likes: '432',  format: 'OBJ', emoji: '🌲', gradient: 'linear-gradient(135deg,#3A3A0D,#6B6B1B)' },
  { id: '8', name: 'Клинок Хаоса',  author: 'weaponsmith',initial: 'W', color: '#EF4444', likes: '1.7K', format: 'FBX', emoji: '⚔️', gradient: 'linear-gradient(135deg,#3A0D0D,#6B1B1B)' },
]
 
export function ModelsSection() {
  const [active, setActive] = useState('Все')
 
  return (
    <section className="bg-surface py-20 px-10 transition-colors duration-[0.2s]">
      
      <div className="max-w-7xl mx-auto">
 
        {/* Заголовок + кнопка */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Section label="Каталог" title="Популярные модели" />
          <Link to="/models"
                className="px-5 py-2.5 rounded-xl border border-border
                           text-sm font-semibold text-text
                           hover:border-accent transition-all">
            Смотреть все →
          </Link>
        </div>
 
        {/* Фильтры */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold
                         border transition-all
                         ${active === f
                           ? 'bg-accent text-white border-accent'
                           : 'bg-transparent border-border text-textSecondary hover:border-accent'
                         }`}
            >
              {f}
            </button>
          ))}
        </div>
 
        {/* Сетка */}
        <div className="grid grid-cols-4 gap-5">
          {MODELS.map(m => (
            <Link
              key={m.id}
              to={`/models/${m.id}`}
              className="group block bg-bg border border-border
                         transition-colors duration-[0.2s]
                         rounded-2xl overflow-hidden
                         hover:-translate-y-1
                         hover:border-[rgba(27,110,243,0.3)]
                         hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
            >
              {/* Превью */}
              <div className="aspect-square flex items-center justify-center
                              text-[56px] relative overflow-hidden"
                   style={{ background: m.gradient }}>
                <div className="group-hover:scale-105">
                  {m.emoji}
                </div>
                {/* Формат */}
                <div className="absolute top-2.5 right-2.5 bg-black/60
                                border border-white/15 rounded-md px-2 py-0.5
                                text-[10px] font-bold text-white/80 tracking-wide">
                  {m.format}
                </div>
                {/* Оверлей */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45
                                flex items-center justify-center
                                opacity-0 group-hover:opacity-100">
                  <span className="px-4 py-2 rounded-lg bg-white
                                   text-black text-xs font-bold">
                    👁 Смотреть
                  </span>
                </div>
              </div>
 
              {/* Инфо */}
              <div className="p-3.5">
                <div className="font-semibold text-sm mb-1.5 text-text transition-colors duration-[0.2s]">{m.name}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs
                                  text-textSecondary">
                    <div className="w-5 h-5 rounded-full flex items-center
                                    justify-center text-[10px] text-white font-bold"
                         style={{ background: m.color }}>
                      {m.initial}
                    </div>
                    {m.author}
                  </div>
                  <div className="text-xs text-textSecondary">
                    ♥ {m.likes}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ModelsSection