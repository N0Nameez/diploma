import { Link } from "react-router-dom";
import type { ApiModel, ApiAnimation } from "../../services/api";
import { Box, Heart, Download, Play } from "lucide-react";

interface ModelListItemProps {
  model: ApiModel | ApiAnimation;
  type?: "3d" | "animation";
}

export function ModelListItem({ model, type = "3d" }: ModelListItemProps) {
  // API возвращает username/display_name на верхнем уровне
  const m = model as any;
  const authorName = m.display_name || m.username || "Автор";
  const authorInitial = authorName[0]?.toUpperCase() || "А";
  const isAi = type === "animation" ? m.source === "ai_generated" : m.ai_generated;

  return (
    <Link
      to={type === "animation" ? `/animations/${model.id}` : `/models/${model.id}`}
      className="flex items-center gap-4 bg-background-surface border border-border
                 rounded-xl overflow-hidden hover:border-accent/30
                 hover:shadow-md
                 transition-all duration-200 group"
    >
      {/* Preview */}
      <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden bg-accent/5">
        {model.preview_url ? (
          <img
            src={model.preview_url}
            alt={model.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <div className="text-center">
              {type === "animation" ? (
                <Play className="w-6 h-6 text-accent/40 mx-auto" />
              ) : (
                <Box className="w-6 h-6 text-accent/40 mx-auto" />
              )}
              <div className="text-[7px] text-text-secondary font-medium">
                {type === "animation" ? "Анимация" : (model as ApiModel).category || "3D"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center gap-5 flex-1 pr-5 min-w-0 flex-wrap py-2">
        {/* Name + AI Badge */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm min-w-[140px] text-text truncate">
            {model.name}
          </span>
          {isAi && (
            <span className="text-[9px] font-bold text-white bg-accent px-1.5 py-0.5 rounded">
              ИИ
            </span>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          <div className="w-4 h-4 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-[9px] text-accent font-bold">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              authorInitial
            )}
          </div>
          {authorName}
        </div>

        {/* Stats */}
        <div className="flex gap-3 ml-auto items-center">
          <span className="text-xs text-textSecondary flex items-center gap-1">
            <Heart className="w-3 h-3" /> {model.likes}
          </span>
          <span className="text-xs text-textSecondary flex items-center gap-1">
            <Download className="w-3 h-3" /> {model.downloads}
          </span>
        </div>

        {/* Format/Duration Badge */}
        <span className="text-[10px] font-bold text-textSecondary bg-background-secondary px-2 py-0.5 rounded">
          {type === "animation"
            ? (model as ApiAnimation).duration_seconds
              ? `${(model as ApiAnimation).duration_seconds}с`
              : "ANIM"
            : (model as ApiModel).format || "GLB"}
        </span>
      </div>
    </Link>
  );
}

export default ModelListItem;

