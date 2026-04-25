import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "../components/Button";
import { Viewer3D } from "../components/Viewer3D";
import DownloadModal from "../components/model/DownloadModal";
import AuthModal from "../components/Modal";
import Toast from "../components/model/Toast";
import {
  fetchModel,
  downloadModel,
  convertModel,
  getComments,
  addComment,
  toggleInteraction,
  getInteractions,
} from "../services/api";
import type { ApiModel } from "../services/api";
import { Download, Heart, Bookmark, Gamepad2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function ModelPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, signIn, signUp } = useAuth();
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
    "login" | "register" | null
  >(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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
        }
        // Load comments
        getComments(id).then((res) => setComments(res.items));
      })
      .catch(() => setDisplayModel(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  /* Show toast notifications */
  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2800);
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
          <div className="text-2xl text-text font-bold mb-2">
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
  console.log("ModelPage raw model data:", {
    display_name: raw.display_name,
    username: raw.username,
    models_count: raw.models_count,
    followers_count: raw.followers_count,
    author_id: raw.author_id,
  });
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
    tags: [displayModel.category || "Персонажи", displayModel.format || "GLB"],
    category: displayModel.category || "Персонажи",
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
      console.error("Download failed:", err);
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
    try {
      const res = await toggleInteraction(id!, user.id, "like");
      setIsLiked(res.is_active);
      // Refresh model to get updated likes count
      fetchModel(id!).then(setDisplayModel);
      showToast(res.is_active ? "Добавлено в лайки" : "Лайк убран");
    } catch (err) {
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

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(isFollowing ? "Подписка отменена" : "Подписка оформлена");
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
    } catch (err) {
      showToast("Ошибка при отправке");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1320px] mx-auto px-8 py-5 flex items-center gap-2 text-sm text-textSecondary">
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
        <span className="text-text">{dm.name}</span>
      </div>

      {/* Main Content */}
      <div className="max-w-[1320px] mx-auto px-8 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* 3D Viewer */}
          <Viewer3D
            variant="full"
            modelUrl={dm.fileUrl || undefined}
            showToolbar={true}
            showBadge={true}
            autoRotate={true}
          />

          {/* Animations Preview - only show if there are real animations */}
          {linkedAnimations.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-sm text-text">Анимации</div>
                <div className="text-xs text-textSecondary">
                  {linkedAnimations.length} анимации
                </div>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                {linkedAnimations.map((anim, idx) => (
                  <div
                    key={anim.id}
                    className={`flex-shrink-0 w-24 h-18 rounded-xl bg-surface2 border border-border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${
                      idx === 0
                        ? "border-accent bg-surface3"
                        : "hover:border-accent hover:bg-surface3"
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
                  <div className="flex-shrink-0 w-24 h-18 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent hover:bg-surface2 transition-all duration-200">
                    <span className="text-lg text-textSecondary">+</span>
                    <span className="text-[10px] text-textSecondary">
                      Добавить
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex gap-0 border-b border-border mb-5">
              <button
                onClick={() => setActiveTab("comments")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === "comments"
                    ? "text-accent border-accent"
                    : "text-textSecondary border-transparent hover:text-text"
                }`}
              >
                Комментарии{" "}
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-surface3 text-[11px]">
                  {comments.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("description")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === "description"
                    ? "text-accent border-accent"
                    : "text-textSecondary border-transparent hover:text-text"
                }`}
              >
                Описание
              </button>
              <button
                onClick={() => setActiveTab("tech")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === "tech"
                    ? "text-accent border-accent"
                    : "text-textSecondary border-transparent hover:text-text"
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
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Написать комментарий..."
                      rows={2}
                      className="flex-1 px-4 py-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent transition-all duration-200 resize-none placeholder:text-textSecondary"
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
                  <div className="text-sm text-textSecondary py-4 text-center">
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
                  <div className="text-sm text-textSecondary py-8 text-center">
                    Пока нет комментариев. Будьте первым!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-3 p-3 rounded-xl bg-surface2 border border-border"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-[11px] text-accent font-bold flex-shrink-0">
                        {(c.display_name ||
                          c.username ||
                          "А")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-text">
                            {c.display_name || c.username || "Аноним"}
                          </span>
                          <span className="text-xs text-textSecondary">
                            {new Date(c.created_at).toLocaleDateString(
                              "ru-RU",
                              { day: "numeric", month: "short" },
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-textSecondary leading-relaxed">
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
                  { label: "Анимаций", value: `${dm.animationsCount} шт.` },
                  { label: "Лицензия", value: dm.license },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-surface2 border border-border rounded-xl p-3.5"
                  >
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm font-medium text-text">
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
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h1 className="font-extrabold text-2xl text-text mb-1.5 tracking-tight">
              {dm.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface2 text-textSecondary text-xs font-medium mb-4">
              <Gamepad2 className="w-3.5 h-3.5" /> Разработка игр
            </div>

            {/* Stats */}
            <div className="flex gap-4 py-4 border-t border-b border-border mb-4">
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {dm.likes}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Лайки
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
                  {dm.downloads}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Скачивания
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-extrabold text-lg text-text">
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
                className="w-full py-3.5 mb-2"
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
                  className="w-full mb-2"
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
              <div className="w-full py-3 rounded-xl bg-surface2 border border-border flex items-center justify-center gap-2 mb-2">
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
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isLiked
                    ? "bg-danger/12 border-danger/30 text-danger"
                    : "bg-surface2 border-border text-text hover:border-accent hover:bg-accentGlow"
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
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isSaved
                    ? "bg-warning/10 border-warning/30 text-warning"
                    : "bg-surface2 border-border text-text hover:border-accent hover:bg-accentGlow"
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
              className="w-full"
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
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="font-extrabold text-sm text-text mb-4">
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
                    color: "rgba(16,185,129,0.15)",
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
                        <div className="text-sm font-semibold text-text">
                          {fmt.name}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {fmt.size} · {fmt.desc}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadFormat(fmt.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface2 border border-border text-textSecondary text-xs font-semibold hover:border-accent hover:text-accent hover:bg-accentGlow transition-all duration-200 flex items-center gap-1"
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
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-lg font-bold text-white">
                {dm.authorInitial}
              </div>
              <div className="flex-1">
                <div className="font-bold text-text text-sm">{dm.author}</div>
                <div className="text-xs text-textSecondary">
                  @{dm.authorUsername} ·{" "}
                  {dm.aiGenerated ? "ИИ-генерация" : "Авторская работа"}
                </div>
              </div>
              <button
                onClick={handleFollow}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isFollowing
                    ? "bg-surface2 border border-border text-textSecondary"
                    : "bg-accent text-white"
                }`}
              >
                {isFollowing ? "Вы подписаны" : "Подписаться"}
              </button>
            </div>
            <div className="flex gap-5 pt-4 border-t border-border">
              <div>
                <div className="font-extrabold text-base text-text">
                  {dm.authorModelsCount}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Модели
                </div>
              </div>
              <div>
                <div className="font-extrabold text-base text-text">
                  {dm.authorFollowers >= 1000
                    ? `${(dm.authorFollowers / 1000).toFixed(1)}K`
                    : dm.authorFollowers}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">
                  Подписчики
                </div>
              </div>
              <div>
                <div className="font-extrabold text-base text-text">
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
          onSwitch={(type) => setAuthModalOpen(type === "reset-password" ? "login" : type)}
          onSignIn={signIn}
          onSignUp={signUp}
        />
      )}

      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        modelName={dm.name}
        modelId={id ?? ""}
        onDownload={handleDownloadFormat}
      />

      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
}

export default ModelPage;
