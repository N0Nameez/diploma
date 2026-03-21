import { Link } from 'react-router-dom'

export interface ModelCardProps {
  id: string
  name: string
  author: string
  initial: string
  color: string
  likes: string
  format: string
  emoji: string
  gradient: string
}

export function ModelCard({
  id,
  name,
  author,
  initial,
  color,
  likes,
  format,
  emoji,
  gradient,
}: ModelCardProps) {
  return (
    <Link
      to={`/models/${id}`}
      className={`group block bg-bg border border-border
                 transition-all duration-[0.2s]
                 rounded-2xl overflow-hidden
                 hover:-translate-y-1
                 hover:border-[rgba(27,110,243,0.3)]
                 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]`}
    >
      {/* Preview */}
      <div
        className="aspect-square flex items-center justify-center
                   text-[56px] relative overflow-hidden"
        style={{ background: gradient }}
      >
        <div className="group-hover:scale-105 transition-transform duration-200">
          <span>{emoji}</span>
        </div>

        {/* Format Badge */}
        <div
          className="absolute top-2.5 right-2.5 bg-black/60
                     border border-white/15 rounded-md px-2 py-0.5
                     text-[10px] font-bold text-white/80 tracking-wide"
        >
          {format}
        </div>

        {/* Hover Overlay */}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/45
                     flex items-center justify-center
                     opacity-0 group-hover:opacity-100
                     transition-all duration-200"
        >
          <span
            className="px-4 py-2 rounded-lg bg-white
                       text-black text-xs font-bold"
          >
            👁 Смотреть
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div
          className="font-semibold text-sm mb-1.5 text-text
                     transition-colors duration-[0.2s]"
        >
          {name}
        </div>

        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 text-xs
                       text-textSecondary"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center
                         justify-center text-[10px] text-white font-bold"
              style={{ background: color }}
            >
              {initial}
            </div>
            {author}
          </div>

          <div className="text-xs text-textSecondary">♥ {likes}</div>
        </div>
      </div>
    </Link>
  )
}

export default ModelCard