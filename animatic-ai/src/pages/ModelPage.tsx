import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Viewer3D } from "../components/Viewer3D";
import DownloadModal from "../components/model/DownloadModal";
import { Modal as AuthModal } from "../components/Modal";
import { toast } from "react-hot-toast";
import {
  fetchModel,
  downloadModel,
  convertModel,
  getComments,
  addComment,
  toggleInteraction,
  getInteractions,
  toggleFollow,
  checkFollowing,
} from "../services/api";
import type { ApiModel } from "../services/api";
import { Download, Heart, Bookmark, Gamepad2, Box, Layers } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

/**
 * Detail page for a specific 3D model, allowing viewing, downloading, and commenting.
 */
export function ModelPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, signIn, signUp, resendEmail, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const [displayModel, setDisplayModel] = useState<ApiModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "comments" | "description" | "tech"
  >("comments");
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState<
    "login" | "register" | "reset-password" | "update-password" | null
  >(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchModel(id)
      .then((model) => {
        setDisplayModel(model);
        // Load interactions if logged in
        if (user) {
          getInteractions(id, user.id).then((interactions) => {
            setIsLiked(interactions.is_liked);
            setIsSaved(interactions.is_favorited);
          });
          // Check following
          if (model.author_id) {
            checkFollowing(model.author_id, user.id).then(res => setIsFollowing(res.is_following));
          }
        }
        // Load comments
        getComments(id).then((res) => setComments(res.items));
      })
      .catch(() => setDisplayModel(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  /* Show toast notifications */
  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-text-secondary text-lg">Загрузка модели...</div>
      </div>
    );
  }

  if (!displayModel) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="text-2xl text-text-primary font-bold mb-2">
            Модель не найдена
          </div>
          <Link to="/models" className="text-accent hover:underline">
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const linkedAnimations: { id: string; name: string; duration: string }[] = [];

  // Adapt API model fields for the page
  // API возвращает данные на верхнем уровне: username, display_name, avatar_url
  const raw = displayModel as any;
  const authorName = raw.display_name || raw.username || "Автор";
  const authorUsername = raw.username || "unknown";
  const dm = {
    ...displayModel,
    author: authorName,
    authorUsername,
    authorInitial: authorName[0]?.toUpperCase() || "А",
    aiGenerated: displayModel.ai_generated,
    fileUrl: displayModel.file_url,
    previewUrl: displayModel.preview_url,
    likes: displayModel.likes ?? 0,
    downloads: displayModel.downloads ?? 0,
    favorites: (displayModel as any).favorites ?? 0,
    // Tech specs
    vertices: displayModel.vertices_count
      ? displayModel.vertices_count.toLocaleString("ru-RU")
      : "N/A",
    faces: displayModel.faces_count
      ? displayModel.faces_count.toLocaleString("ru-RU")
      : "N/A",
    textures: "PBR",
    rig: displayModel.ai_generated ? "Нет" : "Да",
    engines: "Unity, UE5, Blender",
    animationsCount: 0,
    tags: [displayModel.category || "Персонажи", displayModel.industry || "Кинопроизводство", displayModel.format || "GLB"],
    category: displayModel.category || "Персонажи",
    industry: displayModel.industry || "Кинопроизводство",
    aiModel: (displayModel as any).ai_model || "Hunyuan3D-1",
    // Real author stats
    authorModelsCount: (displayModel as any).models_count ?? 0,
    authorFollowers: (displayModel as any).followers_count ?? 0,
  };

  /* Download specific format */
  const handleDownloadFormat = async (format: string) => {
    if (!id) return;

    try {
      let fileUrl: string;
      let fileName: string;

      if (format === "glb") {
        // Direct download for GLB
        const data = await downloadModel(id, user?.id);
        fileUrl = data.file_url;
        fileName = `${data.name}.glb`;
      } else {
        // Convert and download
        const data = await convertModel(id, format);
        fileUrl = data.file_url;
        fileName = `${data.name}.${format}`;
      }

      // Fetch as blob to force download (avoids browser opening GLB as text)
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast(`Скачивание: ${fileName}`);

      // Refresh model to get updated downloads count
      fetchModel(id!).then(setDisplayModel);
    } catch (err) {
      showToast("Ошибка при скачивании");
    }
  };

  /* Share model */
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Ссылка скопирована!");
    } catch {
      showToast("Не удалось скопировать ссылку");
    }
  };

  const handleLike = async () => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    // Optimistic update
    const previousLiked = isLiked;
    const previousLikes = displayModel?.likes || 0;
    
    setIsLiked(!previousLiked);
    if (displayModel) {
      setDisplayModel({
        ...displayModel,
        likes: previousLiked ? previousLikes - 1 : previousLikes + 1
      });
    }

    try {
      const res = await toggleInteraction(id!, user.id, "like");
      setIsLiked(res.is_active);
      // Final sync with backend
      fetchModel(id!).then(setDisplayModel);
      showToast(res.is_active ? "Добавлено в лайки" : "Лайк убран");
    } catch (err) {
      // Rollback on error
      setIsLiked(previousLiked);
      fetchModel(id!).then(setDisplayModel);
      showToast("Ошибка при лайке");
    }
  };

  const handleSave = async () => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    try {
      const res = await toggleInteraction(id!, user.id, "favorite");
      setIsSaved(res.is_active);
      showToast(res.is_active ? "Сохранено" : "Убрано из избранного");
    } catch (err) {
      showToast("Ошибка при сохранении");
    }
  };

  const handleFollow = async () => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    if (!displayModel?.author_id) return;
    
    // Optimistic update
    const previousFollowing = isFollowing;
    setIsFollowing(!previousFollowing);

    try {
      const res = await toggleFollow(displayModel.author_id, user.id);
      setIsFollowing(res.is_subscribed);
      showToast(res.is_subscribed ? "Подписка оформлена" : "Подписка отменена");
    } catch (err) {
      setIsFollowing(previousFollowing);
      showToast("Ошибка при подписке");
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await addComment(id!, user.id, newComment.trim());
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      showToast("Комментарий добавлен");
    } catch (err: any) {
      showToast(err.message || "Ошибка при отправке", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-8 py-5 flex items-center gap-2 text-sm text-text-secondary min-w-0 overflow-x-auto no-scrollbar">
        <Link
          to="/"
          className="hover:text-accent transition-colors duration-200"
        >
          Главная
        </Link>
        <span className="opacity-40">/</span>
        <Link
          to="/models?content=3d"
          className="hover:text-accent transition-colors duration-200"
        >
          3D-модели
        </Link>
        <span className="opacity-40">/</span>
        <Link
          to={`/models?content=3d&category=${dm.category}`}
          className="hover:text-accent transition-colors duration-200"
        >
          {dm.category}
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-text-primary truncate min-w-0" title={dm.name}>{dm.name}</span>
      </div>

      {/* Main Content */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-8 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* Viewer / Photo Toggle */}
          <div className="flex justify-center mb-1">
            <div className="inline-flex p-1 bg-background-secondary/50 backdrop-blur-md border border-border/30 rounded-2xl shadow-inner">
              <button
                onClick={() => setViewMode("3d")}
                className={`flex items-center gap-2 px-6 py-2 rounded-[11px] text-xs font-bold transition-all duration-300 ${
                  viewMode === "3d"
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Box size={14} /> 3D-модель
              </button>
              <button
                onClick={() => setViewMode("photo")}
                className={`flex items-center gap-2 px-6 py-2 rounded-[11px] text-xs font-bold transition-all duration-300 ${
                  viewMode === "photo"
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-accent-glow"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Фото-оригинал
              </button>
            </div>
          </div>

          {/* Viewer / Photo Area */}
          <div className="relative h-[60dvh] md:h-[500px] lg:h-[600px] bg-background-surface border border-border rounded-2xl overflow-hidden group">
            {viewMode === "3d" ? (
              <Viewer3D
                variant="full"
                modelUrl={dm.fileUrl || undefined}
                showToolbar={true}
                showBadge={true}
                autoRotate={true}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-background-secondary/30">
                {displayModel.source_image_url ? (
                  <img
                    src={displayModel.source_image_url}
                    alt="Original photo"
                    className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-500"
                  />
                ) : (
                  <div className="text-center p-10">
                    <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-4 border border-border">
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        className="text-text-muted"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm text-text-secondary min-w-0">Фото-оригинал недоступен для этой модели</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Animations Preview - only show if there are real animations */}
          {linkedAnimations.length > 0 && (
            <div className="bg-background-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-sm text-text-primary">Анимации</div>
                <div className="text-xs text-text-secondary">
                  {linkedAnimations.length} анимации
                </div>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                {linkedAnimations.map((anim, idx) => (
                  <div
                    key={anim.id}
                    className={`flex-shrink-0 w-24 h-18 rounded-xl bg-background-secondary border border-border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${idx === 0
                      ? "border-accent bg-background-primary"
                      : "hover:border-accent hover:bg-background-primary"
                      }`}
                  >
                    <span className="text-[10px] text-text-secondary font-medium">
                      {anim.name}
                    </span>
                    <span className="text-[9px] text-text-muted">
                      {anim.duration}
                    </span>
                  </div>
                ))}
                {user && (
                  <div className="flex-shrink-0 w-24 h-18 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent hover:bg-background-secondary transition-all duration-200">
                    <span className="text-lg text-text-secondary">+</span>
                    <span className="text-[10px] text-text-secondary">
                      Добавить
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-background-surface border border-border rounded-2xl p-5">
            <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("comments")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "comments"
                  ? "text-accent border-accent"
                  : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
              >
                Комментарии{" "}
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-background-primary text-[11px]">
                  {comments.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("description")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "description"
                  ? "text-accent border-accent"
                  : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
              >
                Описание
              </button>
              <button
                onClick={() => setActiveTab("tech")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "tech"
                  ? "text-accent border-accent"
                  : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
              >
                Технические данные
              </button>
            </div>

            {activeTab === "comments" && (
              <div className="pt-2 space-y-4">
                {/* Add comment */}
                {user ? (
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      maxLength={1000}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Написать комментарий..."
                      rows={2}
                      className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent transition-all duration-200 resize-none placeholder:text-text-secondary"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={submittingComment || !newComment.trim()}
                      className="px-4 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:brightness-108 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? "..." : "→"}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary py-4 text-center">
                    <button
                      onClick={() => setAuthModalOpen("register")}
                      className="text-accent hover:underline"
                    >
                      Войдите
                    </button>{" "}
                    чтобы комментировать
                  </div>
                )}
                {/* Comments list */}
                {comments.length === 0 ? (
                  <div className="text-sm text-text-secondary py-8 text-center font-medium">
                    Пока нет комментариев. Будьте первым!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-4 p-4 rounded-2xl bg-background-secondary/40 border border-border/40 hover:border-border/80 transition-all duration-300"
                    >
                      <Link 
                        to={`/profile/${c.author_id}`}
                        className="w-10 h-10 rounded-full overflow-hidden bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-105"
                      >
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-accent font-bold">
                            {(c.display_name || c.username || "А")[0]?.toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <Link 
                            to={`/profile/${c.author_id}`}
                            className="text-sm font-bold text-text-primary hover:text-accent transition-colors duration-200"
                          >
                            {c.display_name || c.username || "Аноним"}
                          </Link>
                          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                            {new Date(c.created_at).toLocaleDateString(
                              "ru-RU",
                              { day: "numeric", month: "short" },
                            )}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-secondary leading-relaxed font-medium">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "description" && (
              <div className="pt-2">
                <p className="text-sm text-textSecondary leading-relaxed mb-4">
                  {dm.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {dm.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3.5 py-1.5 rounded-full bg-tag-bg border border-accent/18 text-accent text-xs cursor-pointer hover:bg-accent/20 transition-all duration-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "tech" && (
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {[
                  { label: "Вершины", value: dm.vertices },
                  { label: "Полигоны", value: dm.faces },
                  { label: "Текстуры", value: dm.textures },
                  { label: "Риг", value: dm.rig },
                  { label: "Форматы", value: "GLB, FBX, OBJ" },
                  { label: "Движки", value: dm.engines },
                  { label: "ИИ Модель", value: dm.aiGenerated ? dm.aiModel : "N/A" },
                  { label: "Лицензия", value: dm.license },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-background-secondary border border-border rounded-xl p-3.5"
                  >
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm font-medium text-text-primary">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Model Info */}
          <div className="bg-background-surface border border-border rounded-2xl p-6">
            <h1 className="font-extrabold text-2xl text-text-primary mb-1.5 tracking-tight break-all">
              {dm.name}
            </h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-secondary text-text-secondary text-xs font-medium">
                <Gamepad2 className="w-3.5 h-3.5" /> {dm.industry}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                <Layers className="w-3.5 h-3.5" /> {dm.category}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 py-4 border-t border-b border-border mb-4">
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text-primary">
                  {dm.likes}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Лайки
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text-primary">
                  {dm.downloads}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Скачивания
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text-primary">
                  {comments.length}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Комменты
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {dm.favorites}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Избранное
                </div>
              </div>
            </div>

            {/* Download Button */}
            {/* Автор может скачать даже view_only, другие — только если не view_only */}
            {(dm.license !== "view_only" ||
              (user && displayModel.author_id === user.id)) && (
                <Button
                  label="Скачать модель"
                  variant="primary"
                  onClick={() => setDownloadModalOpen(true)}
                  className="w-full py-3.5 mb-2 gap-2"
                  icon={<Download className="w-4 h-4" />}
                />
              )}

            {/* Edit button for author */}
            {user &&
              displayModel.author_id === user.id &&
              dm.license !== "free_use" && (
                <Button
                  label="Редактировать"
                  variant="ghost"
                  onClick={() => navigate(`/generation?model_id=${id}`)}
                  className="w-full py-3.5 mb-2 gap-2 "
                  icon={
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  }
                />
              )}

            {/* View-only badge */}
            {dm.license === "view_only" && (
              <div className="w-full py-3.5 rounded-xl bg-background-secondary border border-border flex items-center justify-center gap-2 mb-2">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  className="text-text-secondary"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="text-sm text-text-secondary font-medium">
                  Только просмотр
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleLike}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${isLiked
                  ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20"
                  : "bg-background-secondary border-border text-text-primary hover:border-accent hover:bg-accent/10"
                  }`}
              >
                <svg
                  width="14"
                  height="14"
                  fill={isLiked ? "var(--danger)" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isLiked ? `${dm.likes}` : `${dm.likes}`}
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${isSaved
                  ? "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
                  : "bg-background-secondary border-border text-text-primary hover:border-accent hover:bg-accent/10"
                  }`}
              >
                <svg
                  width="14"
                  height="14"
                  fill={isSaved ? "var(--warning)" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {isSaved ? "Сохранено" : "Сохранить"}
              </button>
            </div>

            <Button
              label="Поделиться"
              variant="ghost"
              onClick={handleShare}
              className="w-full py-3.5 mb-2 gap-2"
              icon={
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              }
            />
          </div>

          {/* Formats */}
          {(dm.license !== "view_only" ||
            (user && displayModel.author_id === user.id)) && (
              <div className="bg-background-surface border border-border rounded-2xl p-5">
                <div className="font-extrabold text-sm text-text-primary mb-4">
                  Форматы для скачивания
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      id: "glb",
                      name: "GLB",
                      size: "12.4 МБ",
                      desc: "Веб, UE5",
                      color: "rgba(27,110,243,0.15)",
                      text: "#1B6EF3",
                    },
                    {
                      id: "obj",
                      name: "OBJ",
                      size: "9.2 МБ",
                      desc: "Blender, ZBrush",
                      color: "rgba(27,199,103,0.15)",
                      text: "#10B981",
                    },
                    {
                      id: "stl",
                      name: "STL",
                      size: "8.5 МБ",
                      desc: "3D-печать",
                      color: "rgba(245,158,11,0.15)",
                      text: "#F59E0B",
                    },
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold tracking-[0.5px]"
                          style={{ background: fmt.color, color: fmt.text }}
                        >
                          {fmt.name}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">
                            {fmt.name}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {fmt.size} · {fmt.desc}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFormat(fmt.id)}
                        className="px-3 py-1.5 rounded-lg bg-background-secondary border border-border text-text-secondary text-xs font-semibold hover:border-accent hover:text-accent hover:bg-accentGlow transition-all duration-200 flex items-center gap-1"
                      >
                        <svg
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Скачать
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Author */}
          <div className="bg-background-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Link 
                to={`/profile/${displayModel.author_id}`}
                className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-accent to-accent/80 border border-accent/20 flex items-center justify-center transition-transform duration-300 hover:scale-105"
              >
                {raw.avatar_url ? (
                  <img src={raw.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {dm.authorInitial}
                  </span>
                )}
              </Link>
              <div className="flex-1">
                <Link 
                  to={`/profile/${displayModel.author_id}`}
                  className="font-bold text-text-primary text-sm hover:text-accent transition-colors duration-200 block"
                >
                  {dm.author}
                </Link>
                <div className="text-xs text-text-secondary">
                  @{dm.authorUsername} ·{" "}
                  {dm.aiGenerated ? `ИИ-генерация (${dm.aiModel})` : "Авторская работа"}
                </div>
              </div>
              <button
                onClick={handleFollow}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${isFollowing
                  ? "bg-background-secondary border border-border text-text-secondary"
                  : "bg-accent text-white hover:brightness-110"
                  }`}
              >
                {isFollowing ? "Вы подписаны" : "Подписаться"}
              </button>
            </div>
            <div className="flex gap-5 pt-4 border-t border-border">
              <div>
                <div className="font-extrabold text-base text-text-primary">
                  {dm.authorModelsCount}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Модели
                </div>
              </div>
              <div>
                <div className="font-extrabold text-base text-text-primary">
                  {dm.authorFollowers >= 1000
                    ? `${(dm.authorFollowers / 1000).toFixed(1)}K`
                    : dm.authorFollowers}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Подписчики
                </div>
              </div>
              <div>
                <div className="font-extrabold text-base text-text-primary">
                  {dm.likes}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Лайки
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Toasts */}
      {authModalOpen && (
        <AuthModal
          type={authModalOpen}
          onClose={() => setAuthModalOpen(null)}
          onSwitch={(type) => setAuthModalOpen(type)}
          onSignIn={signIn}
          onSignUp={signUp}
          onResendEmail={resendEmail}
          onOAuthSignIn={signInWithOAuth}
        />
      )}

      {id && (
        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          onDownload={handleDownloadFormat}
          modelName={dm.name}
          modelId={id}

        />
      )}
    </div>
  );
}

