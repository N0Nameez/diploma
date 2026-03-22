import { Link } from 'react-router-dom'

export interface ModelData {
  id: string
  name: string
  author: string
  authorInitial: string
  authorColor: string
  likes: string
  downloads: string
  format: string
  emoji: string
  gradient: string
  aiGenerated: boolean
  category?: string
  type?: '3d' | 'animation'
}

interface ModelCardProps {
  model: ModelData
}

function ModelCard({ model }: ModelCardProps) {
  return (
    <Link
      to={`/models/${model.id}`}
      className="group block bg-bg border border-border
                 rounded-2xl overflow-hidden cursor-pointer
                 transition-all duration-200
                 hover:-translate-y-1 hover:border-[rgba(27,110,243,0.3)]
                 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
    >
      {/* Preview */}
      <div
        className="aspect-square flex items-center justify-center 
                   text-[56px] relative overflow-hidden"
        style={{ background: model.gradient }}
      >
        {/* Emoji */}
        <div className="transition-transform duration-200 group-hover:scale-105">
          {model.emoji}
        </div>

        {/* Format Badge */}
        <div className="absolute top-2.5 right-2.5
                        bg-black/60 border border-white/15
                        rounded-md px-2 py-0.5
                        text-[10px] font-bold text-white/80 tracking-wide">
          {model.format}
        </div>

        {/* AI Badge */}
        {model.aiGenerated && (
          <div className="absolute top-2.5 left-2.5
                          bg-accent border border-border
                          py-[2px] px-[8px] text-[10px]
                          font-bold text-white flex
                          items-center gap-1
                          rounded-[6px]">
            ✦ ИИ
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45
                        flex items-center justify-center
                        opacity-0 group-hover:opacity-100
                        transition-all duration-200">
          <span className="px-4 py-2 rounded-lg bg-white text-black
                           text-xs font-bold">
            👁 Смотреть
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="font-semibold text-sm mb-1.5 text-text">{model.name}</div>
        <div className="flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center gap-1.5 text-xs 
                          text-textSecondary">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center
                         text-[10px] text-white font-bold"
              style={{ background: model.authorColor }}
            >
              {model.authorInitial}
            </div>
            {model.author}
          </div>
          {/* Likes & Downloads */}
          <div className="text-xs text-textSecondary
                          flex items-center gap-2">
            <span>♥ {model.likes}</span>
            <span>↓ {model.downloads}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ModelCard