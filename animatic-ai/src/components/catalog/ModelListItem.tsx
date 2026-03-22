import { Link } from 'react-router-dom'
import type { ModelData } from '../ModelCard'

interface ModelListItemProps {
  model: ModelData
}

export function ModelListItem({ model }: ModelListItemProps) {
  return (
    <Link
      to={`/models/${model.id}`}
      className="flex items-center gap-4 bg-surface border border-border
                 rounded-xl overflow-hidden hover:border-[rgba(27,110,243,0.3)] 
                 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]
                 transition-all duration-200 group"
    >
      {/* Preview */}
      <div 
        className="w-20 h-20 flex-shrink-0 flex items-center justify-center text-4xl select-none"
        style={{ background: model.gradient }}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {model.emoji}
        </span>
      </div>

      {/* Info */}
      <div className="flex items-center gap-5 flex-1 pr-5 min-w-0 flex-wrap py-2">
        {/* Name + AI Badge */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm min-w-[140px] text-text">
            {model.name}
          </span>
          {model.aiGenerated && (  
            <span className="text-[9px] font-bold text-white 
                           bg-accent px-1.5 py-0.5 rounded-[4px]">
              ✦ ИИ
            </span>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
            style={{ background: model.authorColor }}
          >
            {model.authorInitial}
          </div>
          {model.author}
        </div>

        {/* Stats */}
        <div className="flex gap-3 ml-auto">
          <span className="text-xs text-textSecondary">♥ {model.likes}</span>
          <span className="text-xs text-textSecondary">↓ {model.downloads}</span>
        </div>

        {/* Format Badge */}
        <span className="text-[10px] font-bold text-textSecondary 
                         bg-surface2 px-2 py-0.5 rounded">
          {model.format}
        </span>
      </div>
    </Link>
  )
}

export default ModelListItem