import { useState } from 'react'
import { Link } from 'react-router-dom'
import Section from '../Section'
import ModelCard from '../ModelCard'

export const FILTERS = ['Все', 'Персонажи', 'Архитектура', 'Природа', 'Оружие']

export const MODELS = [
  { id: '1', name: 'Рыцарь Тьмы', author: 'alex3d', authorInitial: 'А', authorColor: '#1B6EF3', likes: '2.1K', downloads: '156', format: 'GLB', emoji: '🤺', gradient: 'linear-gradient(135deg,#0D2045,#1B3A6B)', aiGenerated: true },
  { id: '2', name: 'Маг Артемис', author: 'mage_art', authorInitial: 'М', authorColor: '#7C3AED', likes: '876', downloads: '92', format: 'FBX', emoji: '🧙', gradient: 'linear-gradient(135deg,#1F0D45,#3A1B6B)', aiGenerated: true },
  { id: '3', name: 'Японский замок', author: 'kiriko', authorInitial: 'К', authorColor: '#10B981', likes: '654', downloads: '78', format: 'OBJ', emoji: '🏯', gradient: 'linear-gradient(135deg,#0D3A20,#1B6B3A)', aiGenerated: false },
  { id: '4', name: 'Боевой андроид', author: 'robo_k', authorInitial: 'R', authorColor: '#F59E0B', likes: '2.1K', downloads: '234', format: 'GLB', emoji: '🦾', gradient: 'linear-gradient(135deg,#3A200D,#6B3A1B)', aiGenerated: false },
  { id: '5', name: 'Дракон Азурит', author: 'dragonfly', authorInitial: 'D', authorColor: '#06B6D4', likes: '3.4K', downloads: '456', format: 'FBX', emoji: '🐉', gradient: 'linear-gradient(135deg,#0D2A3A,#1B4A6B)', aiGenerated: false },
  { id: '6', name: 'Астронавт v2', author: 'space_3d', authorInitial: 'S', authorColor: '#8B5CF6', likes: '987', downloads: '123', format: 'GLB', emoji: '👩‍🚀', gradient: 'linear-gradient(135deg,#2A0D3A,#4A1B6B)', aiGenerated: true },
  { id: '7', name: 'Древний лес', author: 'nature3d', authorInitial: 'N', authorColor: '#D97706', likes: '432', downloads: '67', format: 'OBJ', emoji: '🌲', gradient: 'linear-gradient(135deg,#3A3A0D,#6B6B1B)', aiGenerated: false },
  { id: '8', name: 'Клинок Хаоса', author: 'weaponsmith', authorInitial: 'W', authorColor: '#EF4444', likes: '1.7K', downloads: '189', format: 'FBX', emoji: '⚔️', gradient: 'linear-gradient(135deg,#3A0D0D,#6B1B1B)', aiGenerated: true },
]
export function ModelsSection() {
  const [active, setActive] = useState('Все')

  return (
    <section className="bg-surface py-20 px-10 transition-colors duration-[0.2s]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Section label="Каталог" title="Популярные модели" />
          <Link
            to="/models?content=3d"
            className="px-5 py-2.5 rounded-xl border border-border
                       text-sm font-semibold text-text
                       hover:border-accent transition-all"
          >
            Смотреть все →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold
                         border transition-all
                         ${
                           active === f
                             ? 'bg-accent text-white border-accent'
                             : 'bg-transparent border-border text-textSecondary hover:border-accent'
                         }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-5">
          {MODELS.map(model => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default ModelsSection