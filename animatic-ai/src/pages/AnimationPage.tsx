import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchAnimation, type ApiAnimation } from "../services/api";
import Toast from "../components/model/Toast";
import { Clapperboard, Play } from "lucide-react";

function AnimationPage() {
  const { id } = useParams<{ id: string }>();

  const [animation, setAnimation] = useState<ApiAnimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnimation(id)
      .then((data) => {
        setAnimation(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load animation:", err);
        setError("Анимация не найдена");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2800);
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-textSecondary">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error || !animation) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">
            <Clapperboard className="w-16 h-16 mx-auto" />
          </div>
          <div className="font-extrabold text-2xl mb-2">
            Анимация не найдена
          </div>
          <Link
            to="/models?content=animation"
            className="text-accent hover:underline"
          >
            ← Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-[1320px] mx-auto px-8 py-5 flex items-center gap-2 text-sm text-textSecondary">
        <Link
          to="/"
          className="hover:text-accent transition-colors duration-200"
        >
          Главная
        </Link>
        <span className="opacity-40">/</span>
        <Link
          to="/models?content=animation"
          className="hover:text-accent transition-colors duration-200"
        >
          Анимации
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-text">{animation.name}</span>
      </div>

      <div className="max-w-[1320px] mx-auto px-8 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        <div className="flex flex-col gap-5">
          <div className="relative w-full border border-border rounded-2xl overflow-hidden bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.4)] aspect-video">
            {animation.preview_url ? (
              <img
                src={animation.preview_url}
                alt={animation.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface2">
                <Play className="w-16 h-16 text-textSecondary" />
              </div>
            )}
            <div className="absolute top-4 left-4 bg-surface2/80 backdrop-blur border border-border rounded-lg px-3 py-1.5 text-[11px] text-accent2 font-bold tracking-[0.5px] flex items-center gap-2">
              <span className="w-2 h-2 bg-accent2 rounded-full animate-pulse-dot" />
              ANIMATION PREVIEW
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="font-extrabold text-sm text-text mb-3">
              Описание
            </div>
            <p className="text-sm text-textSecondary leading-relaxed">
              {animation.description || "Описание отсутствует"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h1 className="font-extrabold text-2xl text-text mb-1.5 tracking-tight">
              {animation.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface2 text-textSecondary text-xs font-medium mb-4">
              <Play className="w-3.5 h-3.5" /> Анимация
            </div>

            <div className="flex gap-4 py-4 border-t border-b border-border mb-4">
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {animation.likes}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Лайки
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {animation.downloads}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Скачивания
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {animation.duration_seconds ? `${Math.floor(animation.duration_seconds / 60)}:${String(animation.duration_seconds % 60).padStart(2, '0')}` : '--:--'}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Время
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => {
                  setIsLiked(!isLiked);
                  showToast(isLiked ? "Лайк убран" : "Добавлено в лайки");
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isLiked
                    ? "bg-[#F43F5E]/12 border-[#F43F5E]/30 text-[#F43F5E]"
                    : "bg-surface2 border-border text-text hover:border-accent hover:bg-accentGlow"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  fill={isLiked ? "#F43F5E" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                Лайк
              </button>
              <button
                onClick={() => {
                  setIsSaved(!isSaved);
                  showToast(isSaved ? "Убрано из избранного" : "Сохранено");
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isSaved
                    ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                    : "bg-surface2 border-border text-text hover:border-accent hover:bg-accentGlow"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  fill={isSaved ? "#F59E0B" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {isSaved ? "Сохранено" : "Сохранить"}
              </button>
            </div>

            <button
              onClick={() => showToast("Загрузка...")}
              className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:opacity-[0.88] hover:-translate-y-px transition-all duration-200 shadow-[0_0_20px_var(--accent-glow)]"
            >
              Скачать
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
}

export default AnimationPage;
