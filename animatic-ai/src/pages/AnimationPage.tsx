import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Viewer3D } from "../components/Viewer3D";
import { Modal as AuthModal } from "../components/Modal";
import { ReportModal } from "../components/ReportModal";
import { MixMatchModal } from "../components/catalog/MixMatchModal";
import { toast } from "react-hot-toast";
import {
  fetchAnimation,
  downloadAnimation,
  fetchAnimationComments,
  addAnimationComment,
  toggleAnimationInteraction,
  getAnimationInteractions,
  toggleFollow,
  checkFollowing,
} from "../services/api";
import type { ApiAnimation } from "../services/api";
import { Download, Heart, Bookmark, Gamepad2, Box, Flag, Play } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface CommentItemProps {
  comment: any;
  allComments: any[];
  depth?: number;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  replyContent: Record<string, string>;
  setReplyContent: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddComment: (parentId: string | null) => void;
  submittingComment: boolean;
  onReport: (type: "comment", id: string) => void;
  currentUser: any;
}

const CommentItem = ({
  comment,
  allComments,
  depth = 0,
  activeReplyId,
  setActiveReplyId,
  replyContent,
  setReplyContent,
  handleAddComment,
  submittingComment,
  onReport,
  currentUser,
}: CommentItemProps) => {
  const replies = allComments.filter(c => c.parent_id === comment.id);
  const isReplying = activeReplyId === comment.id;

  // Limit visual indentation to 3 levels to prevent horizontal stretching
  const indentClass = depth > 0 
    ? (depth <= 3 ? "ml-8 mt-4 border-l-2 border-border/30 pl-4" : "mt-4") 
    : "";

  return (
    <div className={`flex flex-col gap-3 ${indentClass} group`}>
      <div className="flex gap-3">
        <Link
          to={`/profile/${comment.author_id}`}
          className="w-8 h-8 rounded-full overflow-hidden bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0"
        >
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-accent font-bold">
              {(comment.display_name || comment.username || "А")[0]?.toUpperCase()}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${comment.author_id}`}
                className="text-xs font-bold text-text-primary hover:text-accent transition-colors"
              >
                {comment.display_name || comment.username || "Аноним"}
              </Link>
              <span className="text-[9px] font-medium text-text-muted uppercase">
                {new Date(comment.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
            </div>
            {(!currentUser || comment.author_id !== currentUser.id) && (
              <button 
                onClick={() => onReport("comment", comment.id)}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                title="Пожаловаться"
              >
                <Flag size={12} />
              </button>
            )}
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {comment.content}
          </p>
          <div className="flex items-center gap-4 mt-1.5">
            <button
              onClick={() => setActiveReplyId(isReplying ? null : comment.id)}
              className="text-[11px] font-bold text-accent hover:underline"
            >
              {isReplying ? "Отмена" : "Ответить"}
            </button>
          </div>

          {isReplying && (
            <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <textarea
                autoFocus
                value={replyContent[comment.id] || ""}
                onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!submittingComment && replyContent[comment.id]?.trim()) {
                      handleAddComment(comment.id);
                    }
                  }
                }}
                placeholder={`Ответ для ${comment.display_name || comment.username}...`}
                rows={2}
                className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-xl text-text-primary text-xs outline-none focus:border-accent transition-all resize-none"
              />
              <button
                onClick={() => handleAddComment(comment.id)}
                disabled={submittingComment || !replyContent[comment.id]?.trim()}
                className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:brightness-108 transition-all disabled:opacity-50"
              >
                {submittingComment ? "..." : "→"}
              </button>
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="flex flex-col gap-2">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              depth={depth + 1}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleAddComment={handleAddComment}
              submittingComment={submittingComment}
              onReport={onReport}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LICENSE_NAMES: Record<string, string> = {
  free_use: "Свободное использование",
  view_only: "Только просмотр",
  private: "Приватная",
};

/**
 * Page for viewing and managing a specific animation.
 */
export function AnimationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, signIn, signUp, resendEmail, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [animation, setAnimation] = useState<ApiAnimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments" | "description" | "tech">("comments");

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState<
    "login" | "register" | "reset-password" | "update-password" | null
  >(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{ type: "model" | "user" | "comment"; id: string } | null>(null);

  const [selectedModelUrl, setSelectedModelUrl] = useState<string>("/models/mannequin.glb");
  const [selectedModelName, setSelectedModelName] = useState<string>("Стандартный манекен");
  const [mixMatchOpen, setMixMatchOpen] = useState(false);

  const handleOpenReport = (type: "model" | "user" | "comment", entityId: string) => {
    if (!user) {
      setAuthModalOpen("login");
      return;
    }
    setReportData({ type, id: entityId });
    setReportModalOpen(true);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnimation(id)
      .then((data) => {
        setAnimation(data);
        // Load interactions if logged in
        if (user) {
          getAnimationInteractions(id, user.id).then((interactions) => {
            setIsLiked(interactions.is_liked);
            setIsSaved(interactions.is_favorited);
          });
          if (data.author_id) {
            checkFollowing(data.author_id, user.id).then(res => setIsFollowing(res.is_following));
          }
        }
        // Load comments
        fetchAnimationComments(id).then((res) => setComments(res.items));
      })
      .catch(() => setAnimation(null))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-text-secondary text-lg">Загрузка анимации...</div>
        </div>
      </div>
    );
  }

  if (!animation) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-background-secondary mx-auto mb-6 border border-border">
            <Play className="w-10 h-10 text-text-muted opacity-40" />
          </div>
          <div className="font-extrabold text-2xl mb-2 text-text-primary">
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

  const raw = animation as any;
  const authorName = raw.display_name || raw.username || "Автор";
  const authorUsername = raw.username || "unknown";

  const dm = {
    ...animation,
    author: authorName,
    authorUsername,
    authorInitial: authorName[0]?.toUpperCase() || "А",
    fileUrl: animation.file_url,
    previewUrl: animation.preview_url,
    likes: animation.likes ?? 0,
    downloads: animation.downloads ?? 0,
    favorites: (animation as any).favorites ?? 0,
    duration: animation.duration_seconds
      ? `${animation.duration_seconds} сек`
      : "N/A",
    formats: "GLB (gltf)",
    tags: ["Анимация", "ИИ"],
    authorModelsCount: (animation as any).models_count ?? 0,
    authorFollowers: (animation as any).followers_count ?? 0,
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const data = await downloadAnimation(id, user?.id);
      const response = await fetch(data.file_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${data.name}.${data.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast(`Скачивание: ${data.name}.${data.format.toLowerCase()}`);
      
      // Sync downloads stats
      fetchAnimation(id).then(setAnimation);
    } catch (err) {
      showToast("Ошибка при скачивании", "error");
    }
  };

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
    const previousLiked = isLiked;
    const previousLikes = animation?.likes || 0;
    
    setIsLiked(!previousLiked);
    setAnimation({
      ...animation,
      likes: previousLiked ? previousLikes - 1 : previousLikes + 1
    });

    try {
      const res = await toggleAnimationInteraction(id!, user.id, "like");
      setIsLiked(res.is_active);
      fetchAnimation(id!).then(setAnimation);
      showToast(res.is_active ? "Добавлено в лайки" : "Лайк убран");
    } catch (err) {
      setIsLiked(previousLiked);
      fetchAnimation(id!).then(setAnimation);
      showToast("Ошибка при лайке");
    }
  };

  const handleSave = async () => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    try {
      const res = await toggleAnimationInteraction(id!, user.id, "favorite");
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
    if (!animation.author_id) return;
    
    const previousFollowing = isFollowing;
    setIsFollowing(!previousFollowing);

    try {
      const res = await toggleFollow(animation.author_id, user.id);
      setIsFollowing(res.is_subscribed);
      showToast(res.is_subscribed ? "Подписка оформлена" : "Подписка отменена");
    } catch (err) {
      setIsFollowing(previousFollowing);
      showToast("Ошибка при подписке");
    }
  };

  const handleAddComment = async (parentId: string | null = null) => {
    if (!user) {
      setAuthModalOpen("register");
      return;
    }
    
    const content = parentId ? replyContent[parentId] : newComment;
    if (!content?.trim()) return;
    
    setSubmittingComment(true);
    try {
      const comment = await addAnimationComment(id!, user.id, content.trim(), parentId || undefined);
      setComments((prev) => [comment, ...prev]);
      if (parentId) {
        setReplyContent(prev => ({ ...prev, [parentId]: "" }));
        setActiveReplyId(null);
      } else {
        setNewComment("");
      }
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
          to="/models?content=animation"
          className="hover:text-accent transition-colors duration-200"
        >
          Анимации
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-text-primary truncate min-w-0" title={animation.name}>
          {animation.name}
        </span>
      </div>

      {/* Main Content */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-8 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* Viewer Area */}
          <div className="relative h-[60dvh] md:h-[500px] lg:h-[600px] bg-background-surface border border-border rounded-2xl overflow-hidden group">
            <Viewer3D
              variant="full"
              modelUrl={selectedModelUrl}
              animationUrl={animation.file_url || undefined}
              showToolbar={true}
              showBadge={true}
              autoRotate={false}
              className="!h-full !border-none !bg-transparent"
            />
          </div>

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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!submittingComment && newComment.trim()) {
                            handleAddComment();
                          }
                        }
                      }}
                      placeholder="Написать комментарий..."
                      rows={2}
                      className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent transition-all duration-200 resize-none placeholder:text-text-secondary"
                    />
                    <button
                      onClick={() => handleAddComment()}
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
                  <div className="flex flex-col gap-6">
                    {comments
                      .filter(c => !c.parent_id)
                      .map((c) => (
                        <CommentItem
                          key={c.id}
                          comment={c}
                          allComments={comments}
                          activeReplyId={activeReplyId}
                          setActiveReplyId={setActiveReplyId}
                          replyContent={replyContent}
                          setReplyContent={setReplyContent}
                          handleAddComment={handleAddComment}
                          submittingComment={submittingComment}
                          onReport={handleOpenReport}
                          currentUser={user}
                        />
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {activeTab === "description" && (
              <div className="pt-2">
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {dm.description || "Описание отсутствует"}
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
                  { label: "Длительность", value: dm.duration },
                  { label: "Формат", value: dm.formats },
                  { label: "Лицензия", value: LICENSE_NAMES[dm.license] || dm.license || "Только просмотр" },
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
          <div className="bg-background-surface border border-border rounded-2xl p-6">
            <h1 className="font-extrabold text-2xl text-text-primary mb-1.5 tracking-tight break-all">
              {animation.name}
            </h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-secondary text-text-secondary text-xs font-medium">
                <Play className="w-3.5 h-3.5" /> Анимация
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
            {(dm.license !== "view_only" ||
              (user && animation.author_id === user.id)) && (
                <Button
                  label="Скачать анимацию"
                  variant="primary"
                  onClick={handleDownload}
                  className="w-full py-3.5 mb-2 gap-2"
                  icon={<Download className="w-4 h-4" />}
                />
              )}

            <Button
              label={selectedModelUrl === "/models/mannequin.glb" ? "Примерить на модель" : `Модель: ${selectedModelName}`}
              variant="ghost"
              onClick={() => setMixMatchOpen(true)}
              className="w-full py-3.5 mb-2 gap-2 border-accent text-accent hover:bg-accent/10"
              icon={<Gamepad2 className="w-4 h-4" />}
            />

            {/* Edit button for author */}
            {user && animation.author_id === user.id && (
              <Button
                label="Редактировать"
                variant="ghost"
                onClick={() => navigate(`/generation?model_id=${id}&is_animation=true`)}
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
                {dm.likes}
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

            <div className={`grid ${user?.id !== animation.author_id ? "grid-cols-2" : "grid-cols-1"} gap-2 mb-2`}>
              <Button
                label="Поделиться"
                variant="ghost"
                onClick={handleShare}
                className="w-full py-3.5 gap-2"
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
              {user?.id !== animation.author_id && (
                <button
                  onClick={() => handleOpenReport("model", id!)}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-danger/5 hover:border-danger/30 hover:text-danger transition-all duration-200"
                >
                  <Flag size={14} /> Жалоба
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {authModalOpen && (
        <AuthModal
          type={authModalOpen}
          onClose={() => setAuthModalOpen(null)}
          onSwitch={setAuthModalOpen}
          onSignIn={signIn}
          onSignUp={signUp}
          onResendEmail={resendEmail}
          onOAuthSignIn={signInWithOAuth}
        />
      )}

      {reportModalOpen && reportData && user && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setReportData(null);
          }}
          userId={user.id}
          entityType={reportData.type}
          entityId={reportData.id}
          onSuccess={() => toast.success("Жалоба отправлена и будет рассмотрена модераторами")}
        />
      )}

      {mixMatchOpen && (
        <MixMatchModal
          isOpen={mixMatchOpen}
          onClose={() => setMixMatchOpen(false)}
          mode="models"
          onSelect={(url, id, name) => {
            setSelectedModelUrl(url);
            setSelectedModelName(name);
          }}
        />
      )}
    </div>
  );
}
