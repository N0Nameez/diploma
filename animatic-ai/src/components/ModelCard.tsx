import { Link } from "react-router-dom";
import type { ApiModel, ApiAnimation } from "../services/api";
import { Box, Eye, Heart, Download, Play } from "lucide-react";

interface ModelCardProps {
  model: ApiModel | ApiAnimation;
  type?: "3d" | "animation";
}

function ModelCard({ model, type = "3d" }: ModelCardProps) {
  const m = model as any;
  const authorName = m.display_name || m.username || "Автор";
  const authorInitial = authorName[0]?.toUpperCase() || "А";
  const isAi = type === "animation" ? m.source === "ai_generated" : m.ai_generated;

  return (
    <Link
      to={type === "animation" ? `/animations/${model.id}` : `/models/${model.id}`}
      className="group block bg-background-primary border border-border
                 rounded-2xl overflow-hidden cursor-pointer
                 transition-all duration-200
                 hover:-translate-y-1 hover:border-accent/30
                 hover:shadow-lg"
    >
      {/* Preview */}
      <div className="aspect-square relative overflow-hidden bg-accent/5">
        {model.preview_url ? (
          <img
            src={model.preview_url}
            alt={model.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <div className="text-center">
              {type === "animation" ? (
                <Play className="w-10 h-10 text-accent/40 mx-auto mb-1" />
              ) : (
                <Box className="w-10 h-10 text-accent/40 mx-auto mb-1" />
              )}
              <div className="text-[9px] text-text-secondary font-medium px-1">
                {type === "animation" ? "Анимация" : (model as ApiModel).category || "3D"}
              </div>
            </div>
          </div>
        )}

        {/* Format/Duration Badge */}
        <div className="absolute top-2.5 right-2.5 bg-black/60 border border-white/15 rounded-md px-2 py-0.5 text-[10px] font-bold text-white/80 tracking-wide">
          {type === "animation"
            ? (model as ApiAnimation).duration_seconds
              ? `${(model as ApiAnimation).duration_seconds}с`
              : "ANIM"
            : (model as ApiModel).format || "GLB"}
        </div>

        {/* AI Badge */}
        {isAi && (
          <div className="absolute top-2.5 left-2.5 bg-accent border border-border py-[2px] px-[8px] text-[10px] font-bold text-white flex items-center gap-1 rounded-[6px]">
            ИИ
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <span className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Смотреть
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="font-semibold text-sm mb-1.5 text-text-primary truncate">
          {model.name}
        </div>
        <div className="flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                authorInitial
              )}
            </div>
            <span className="truncate">{authorName}</span>
          </div>
          {/* Likes & Downloads */}
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {model.likes}
            </span>
            <span className="flex items-center gap-0.5">
              <Download className="w-3 h-3" /> {model.downloads}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ModelCard;

