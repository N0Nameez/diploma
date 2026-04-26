import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/Button";
import ModelCard from "../components/ModelCard";
import Pagination from "../components/catalog/Pagination";
import Toast from "../components/model/Toast";
import { CropModal } from "../components/CropModal";
import {
  fetchUser,
  fetchUserModels,
  fetchUserFavorites,
  fetchUserActivity,
  updateUserProfile,
  updateModel,
  uploadAvatar,
  uploadCover,
  type ApiModel,
  type ApiUser,
} from "../services/api";
import {
  Folder,
  Heart,
  Play,
  Settings,
  User,
  Package,
  Clapperboard,
  Calendar,
  Zap,
  Edit,
  Lock,
  BarChart3,
  Users,
  Check,
  Search,
  Gem,
  Download,
} from "lucide-react";

type TabId = "models" | "anims" | "liked" | "settings";

const COVER_PRESETS = [
  {
    id: "default",
    name: "Стандарт",
    gradient:
      "linear-gradient(135deg, #0A1628 0%, #0D2045 30%, #1a0a35 60%, #0a1a2a 100%)",
  },
  {
    id: "ocean",
    name: "Океан",
    gradient:
      "linear-gradient(135deg, #0c1e3e 0%, #1a3a5c 40%, #0d4a6b 70%, #0a2a3a 100%)",
  },
  {
    id: "sunset",
    name: "Закат",
    gradient:
      "linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 30%, #6b2a4a 60%, #2a0a1a 100%)",
  },
  {
    id: "forest",
    name: "Лес",
    gradient:
      "linear-gradient(135deg, #0a1a0a 0%, #1a3a1a 30%, #0d4a2a 60%, #0a2a1a 100%)",
  },
  {
    id: "ember",
    name: "Угли",
    gradient:
      "linear-gradient(135deg, #1a0a0a 0%, #3a1a0a 30%, #5a2a0a 60%, #2a0a0a 100%)",
  },
  {
    id: "midnight",
    name: "Полночь",
    gradient:
      "linear-gradient(135deg, #050510 0%, #0a0a2a 40%, #101040 70%, #080820 100%)",
  },
];

const ITEMS_PER_PAGE = 6;

/**
 * User profile page showing models, favorites, activity and settings.
 */
export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("models");
  const [modelFilter, setModelFilter] = useState<string>("Все");
  const [modelSort, setModelSort] = useState<string>("Новые сначала");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Crop modals
  const [avatarCrop, setAvatarCrop] = useState<{
    image: string;
    file: File;
  } | null>(null);
  const [coverCrop, setCoverCrop] = useState<{
    image: string;
    file: File;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Cache-busting keys — обновляются только при реальной загрузке
  const [avatarKey, setAvatarKey] = useState(0);
  const [coverKey, setCoverKey] = useState(0);

  // Real data
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [userModels, setUserModels] = useState<ApiModel[]>([]);
  const [userFavorites, setUserFavorites] = useState<ApiModel[]>([]);
  const [activity, setActivity] = useState<{
    heatmap: { date: string; count: number }[];
    feed: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Cover modal
  const [showCoverModal, setShowCoverModal] = useState(false);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2800);
  };

  // Load profile
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchUser(user.id)
      .then((p) => {
        setProfile(p);
        setDisplayName(p.display_name || p.username || "");
        setBio(p.bio || "");
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user]);

  // Load user models
  useEffect(() => {
    if (!user || activeTab !== "models") return;
    fetchUserModels(user.id, 50)
      .then((res) => setUserModels(res.items))
      .catch(() => setUserModels([]));
  }, [user, activeTab]);

  // Load favorites immediately (not just on tab switch)
  useEffect(() => {
    if (!user) return;
    fetchUserFavorites(user.id, 50)
      .then((res) => setUserFavorites(res.items))
      .catch(() => setUserFavorites([]));
  }, [user]);

  // Load activity
  useEffect(() => {
    if (!user) return;
    fetchUserActivity(user.id, 90)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, {
        display_name: displayName,
        bio,
      });
      // Reload full profile to get all fresh data
      const freshProfile = await fetchUser(user.id);
      setProfile(freshProfile);
      setDisplayName(freshProfile.display_name || freshProfile.username || "");
      setBio(freshProfile.bio || "");
      showToast("Профиль сохранён");
    } catch {
      showToast("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverPreset = async (presetId: string) => {
    if (!user) return;
    try {
      const updated = await updateUserProfile(user.id, {
        cover_preset: presetId,
      });
      setProfile(updated);
      setShowCoverModal(false);
      showToast("Обложка обновлена");
    } catch {
      showToast("Ошибка при обновлении");
    }
  };

  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarCrop({ image: url, file });
    e.target.value = "";
  };

  const handleAvatarCropConfirm = useCallback(
    async (blob: Blob) => {
      if (!user || !avatarCrop) return;
      setUploadingAvatar(true);
      try {
        const file = new File([blob], "avatar.png", { type: "image/png" });
        await uploadAvatar(user.id, file);
        // Refetch profile to ensure we have the latest data
        const freshProfile = await fetchUser(user.id);
        setProfile(freshProfile);
        setAvatarKey((k) => k + 1); // Update cache-busting key
        showToast("Аватарка обновлена");
      } catch (err) {
        showToast("Ошибка при загрузке аватарки");
      } finally {
        setUploadingAvatar(false);
        setAvatarCrop(null);
      }
    },
    [user, avatarCrop],
  );

  const handleCoverClick = () => coverInputRef.current?.click();

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverCrop({ image: url, file });
    e.target.value = "";
  };

  const handleCoverCropConfirm = useCallback(
    async (blob: Blob) => {
      if (!user) return;
      setUploadingCover(true);
      try {
        const file = new File([blob], "cover.png", { type: "image/png" });
        await uploadCover(user.id, file);
        const freshProfile = await fetchUser(user.id);
        setProfile(freshProfile);
        setCoverKey((k) => k + 1); // Update cache-busting key
        showToast("Обложка обновлена");
      } catch (err) {
        showToast("Ошибка при загрузке обложки");
      } finally {
        setUploadingCover(false);
        setCoverCrop(null);
      }
    },
    [user],
  );

  const handleDeleteModel = async (modelId: string) => {
    // TODO: implement delete
    showToast("Удаление моделей будет доступно скоро");
  };

  // Reset page on filter/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [modelFilter, modelSort]);

  // Sort models
  const getSortedModels = () => {
    const list =
      modelFilter === "Все"
        ? userModels.filter(
            (m) => m.status === "approved" && m.license !== "private",
          )
        : userModels.filter((m) => {
            if (modelFilter === "Черновики")
              return m.status === "draft" || m.license === "private";
            return true;
          });
    switch (modelSort) {
      case "По лайкам":
        return [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case "По скачиваниям":
        return [...list].sort(
          (a, b) => (b.downloads || 0) - (a.downloads || 0),
        );
      default:
        return [...list].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
  };

  // Check if there are drafts/private models
  const hasDrafts = userModels.some(
    (m) => m.status === "draft" || m.license === "private",
  );

  if (!user) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-text font-bold mb-2">
            Войдите в аккаунт
          </div>
          <Link to="/" className="text-accent hover:underline">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-text-secondary text-lg">Загрузка профиля...</div>
      </div>
    );
  }

  const p = profile;
  const authorName = p?.display_name || p?.username || "Пользователь";
  const authorInitial = authorName[0]?.toUpperCase() || "П";
  const joinYear = p?.created_at
    ? new Date(p.created_at).getFullYear()
    : new Date().getFullYear();
  const coverPreset = (p as any)?.cover_preset || "default";
  const coverUrl = (p as any)?.cover_url;
  const coverSrc = coverUrl ? `${coverUrl}?v=${coverKey}` : undefined;
  const coverGradient = !coverUrl
    ? COVER_PRESETS.find((c) => c.id === coverPreset)?.gradient ||
      COVER_PRESETS[0].gradient
    : undefined;
  const avatarSrc = p?.avatar_url
    ? `${p.avatar_url}?v=${avatarKey}`
    : undefined;

  // Activity helpers
  const formatDateAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}м`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}ч`;
    const days = Math.floor(hrs / 24);
    return `${days}д`;
  };

  const activityTypeIcon = (type: string) => {
    switch (type) {
      case "model_created":
        return { icon: <Folder className="w-4 h-4" />, cls: "ai-blue" };
      case "model_liked":
        return { icon: <Heart className="w-4 h-4" />, cls: "ai-pink" };
      case "model_downloaded":
        return { icon: <Download className="w-4 h-4" />, cls: "ai-green" };
      default:
        return { icon: <Zap className="w-4 h-4" />, cls: "ai-blue" };
    }
  };

  const activityTypeText = (item: any) => {
    switch (item.type) {
      case "model_created":
        return (
          <>
            <strong>{item.entity_name}</strong> создана
          </>
        );
      case "model_liked":
        return (
          <>
            <strong>{item.entity_name}</strong> лайкнута
          </>
        );
      case "model_downloaded":
        return (
          <>
            <strong>{item.entity_name}</strong> скачана
          </>
        );
      default:
        return item.entity_name;
    }
  };

  // Heatmap: last 84 cells (12 cols x 7 rows approx)
  const buildHeatmapData = () => {
    const days: number[] = [];
    const today = new Date();
    const map = new Map<string, number>();
    activity?.heatmap.forEach((h) => map.set(h.date, h.count));

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push(map.get(key) || 0);
    }

    const maxCount = Math.max(...days, 1);
    return days.map((c) => {
      const ratio = c / maxCount;
      let level = 0;
      if (ratio > 0) level = 1;
      if (ratio > 0.25) level = 2;
      if (ratio > 0.5) level = 3;
      if (ratio > 0.75) level = 4;
      return level;
    });
  };

  const heatmapData = buildHeatmapData();

  const sortedModels = getSortedModels();

  return (
    <div className="pt-16 min-h-screen">
      {/* Cover */}
      <div className="relative h-[240px] overflow-hidden">
        <div
          className="w-full h-full relative overflow-hidden"
          style={
            coverSrc
              ? {
                  backgroundImage: `url(${coverSrc})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: coverGradient }
          }
        >
          {!coverUrl && (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(27,110,243,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(27,110,243,0.06)_1px,transparent_1px)] [background-size:50px_50px]" />
              <div className="absolute w-[500px] h-[300px] rounded-full bg-accent opacity-[0.07] blur-[80px] -top-20 left-[10%]" />
              <div className="absolute w-[400px] h-[300px] rounded-full bg-accent2 opacity-[0.07] blur-[80px] -top-16 right-[15%]" />
            </>
          )}
          {/* Particles */}
          {[...Array(10)].map((_, i) => {
            const size = Math.random() * 4 + 2;
            const left = Math.random() * 100;
            const duration = Math.random() * 6 + 4;
            const delay = Math.random() * 4;
            return (
              <div
                key={i}
                className="absolute rounded-full bg-accent/40"
                style={{
                  width: size,
                  height: size,
                  left: `${left}%`,
                  bottom: -10,
                  animation: `particleDrift${i} ${duration}s linear ${delay}s infinite`,
                  opacity: Math.random() * 0.6 + 0.2,
                }}
              />
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
        <button
          onClick={() => setShowCoverModal(true)}
          className="absolute top-4 right-4 px-3.5 py-2 rounded-[9px] bg-black/45 backdrop-blur border border-white/15 text-white/80 text-xs font-semibold cursor-pointer hover:bg-black/65 hover:text-white transition-all duration-200 flex items-center gap-1.5"
        >
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Изменить обложку
        </button>
      </div>

      {/* Cover preset modal */}
      {showCoverModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
          onClick={() => setShowCoverModal(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text mb-4">
              Выберите обложку
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleCoverPreset(preset.id)}
                  className={`h-20 rounded-xl border-2 transition-all duration-200 ${coverPreset === preset.id ? "border-accent" : "border-transparent hover:border-border2"}`}
                  style={{ background: preset.gradient }}
                >
                  <span className="text-white text-xs font-semibold drop-shadow">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-border pt-4 mb-4">
              <button
                onClick={() => {
                  setShowCoverModal(false);
                  handleCoverClick();
                }}
                className="w-full py-2.5 rounded-xl bg-surface2 border border-border text-text text-sm hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Загрузить своё фото
              </button>
            </div>
            <button
              onClick={() => setShowCoverModal(false)}
              className="w-full py-2 rounded-xl bg-surface2 border border-border text-textSecondary text-sm hover:text-text transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="max-w-[1320px] mx-auto px-10 relative -mt-16 z-10">
        <div className="flex items-end gap-6 mb-6 flex-wrap">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={authorName}
                className="w-[100px] h-[100px] rounded-full object-cover border-4 border-bg shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              />
            ) : (
              <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-[40px] font-extrabold text-white border-4 border-bg shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {authorInitial}
              </div>
            )}
            <button
              onClick={handleAvatarClick}
              className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-accent border-2 border-bg flex items-center justify-center text-xs text-white cursor-pointer hover:scale-110 transition-transform duration-200"
            >
              <Edit className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 pb-1.5 min-w-0">
            <div className="font-extrabold text-[24px] tracking-[-0.5px] mb-1">
              {authorName}
            </div>
            <div className="text-sm text-textSecondary mb-2">
              @{p?.username} · {joinYear}
              {p?.credits !== undefined && (
                <span className="ml-3 text-accent">
                  <Gem className="w-3.5 h-3.5 inline" /> {p.credits}
                </span>
              )}
            </div>
            {p?.bio && (
              <div className="text-sm text-textSecondary font-light leading-relaxed max-w-[480px]">
                {p.bio}
              </div>
            )}
          </div>
          <div className="flex gap-2 pb-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab("settings")}
              className="px-5 py-2.5 rounded-[10px] bg-surface2 border border-border2 text-text text-sm font-semibold cursor-pointer hover:border-accent hover:bg-tag-bg hover:text-accent transition-all duration-200 flex items-center gap-2"
            >
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
              Редактировать
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-[10px] bg-surface2 border border-border text-textSecondary text-sm font-medium hover:border-red-500/30 hover:text-red-400 transition-all duration-200"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex bg-surface border border-border rounded-2xl overflow-hidden mb-7">
          {[
            { num: p?.models_count ?? 0, lbl: "Модели" },
            { num: p?.animations_count ?? 0, lbl: "Анимации" },
            { num: p?.credits ?? 0, lbl: "Кредиты" },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-1 p-4 border-r border-border last:border-0 hover:bg-surface2 transition-colors duration-200 cursor-default text-center"
            >
              <div className="font-extrabold text-[22px] tracking-[-0.5px]">
                {stat.num}
              </div>
              <div className="text-[11px] text-textSecondary font-medium uppercase tracking-[0.8px]">
                {stat.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1320px] mx-auto px-10 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left */}
        <div className="min-w-0">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-surface border border-border rounded-[14px] p-1 mb-5">
            {[
              {
                id: "models" as TabId,
                label: (
                  <>
                    <Folder className="w-4 h-4" /> Модели
                  </>
                ),
                count: userModels.filter(
                  (m) => m.status === "approved" && m.license !== "private",
                ).length,
              },
              {
                id: "anims" as TabId,
                label: (
                  <>
                    <Play className="w-4 h-4" /> Анимации
                  </>
                ),
                count: 0,
              },
              {
                id: "liked" as TabId,
                label: (
                  <>
                    <Heart className="w-4 h-4" /> Избранное
                  </>
                ),
                count: userFavorites.length,
              },
              {
                id: "settings" as TabId,
                label: (
                  <>
                    <Settings className="w-4 h-4" /> Настройки
                  </>
                ),
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer border-none flex items-center justify-center gap-2 transition-all duration-200 ${activeTab === tab.id ? "bg-accent text-white shadow-[0_3px_12px_var(--accent-glow)]" : "text-textSecondary hover:text-text hover:bg-surface2"}`}
              >
                {tab.label}
                {"count" in tab && tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${activeTab === tab.id ? "bg-white/20" : "bg-surface3 text-text-muted"}`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Models */}
          {activeTab === "models" && (
            <div>
              <div className="flex gap-2 mb-5 flex-wrap items-center">
                {["Все", "Черновики"]
                  .filter((f) => f !== "Черновики" || hasDrafts)
                  .map((f) => (
                    <button
                      key={f}
                      onClick={() => setModelFilter(f)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all duration-200 ${modelFilter === f ? "bg-accent text-white border-accent" : "bg-transparent border-border text-text-secondary hover:bg-accent hover:text-white hover:border-accent"}`}
                    >
                      {f}
                    </button>
                  ))}
                <select
                  value={modelSort}
                  onChange={(e) => setModelSort(e.target.value)}
                  className="ml-auto px-3 py-1.5 rounded-[9px] bg-surface2 border border-border text-text text-xs cursor-pointer outline-none"
                >
                  <option>Новые сначала</option>
                  <option>По лайкам</option>
                  <option>По скачиваниям</option>
                </select>
              </div>
              {sortedModels.length > 0 ? (
                <>
                  <div
                    className="grid gap-[18px]"
                    style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                  >
                    {sortedModels
                      .slice(
                        (currentPage - 1) * ITEMS_PER_PAGE,
                        currentPage * ITEMS_PER_PAGE,
                      )
                      .map((m) => (
                        <div key={m.id} className="relative group">
                          <ModelCard model={m} />
                          {m.license === "private" && (
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-yellow-500/12 text-yellow-500 border border-yellow-500/25 text-[10px] font-bold z-10 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Приватная
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(sortedModels.length / ITEMS_PER_PAGE)}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <div className="text-center py-16 text-textSecondary">
                  <div className="text-4xl mb-3">
                    <Package className="w-10 h-10 mx-auto" />
                  </div>
                  <div className="text-lg font-medium text-text mb-1">
                    Пока нет моделей
                  </div>
                  <Button
                    label="Создать модель"
                    variant="primary"
                    onClick={() => navigate("/generation")}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          )}

          {/* Animations */}
          {activeTab === "anims" && (
            <div className="text-center py-16 text-textSecondary">
              <div className="text-4xl mb-3">
                <Clapperboard className="w-10 h-10 mx-auto" />
              </div>
              <div className="text-lg font-medium text-text mb-1">
                Пока нет анимаций
              </div>
            </div>
          )}

          {/* Liked */}
          {activeTab === "liked" && (
            <div>
              {userFavorites.length > 0 ? (
                <div
                  className="grid gap-[18px]"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                  }}
                >
                  {userFavorites.map((m) => (
                    <ModelCard key={m.id} model={m} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-textSecondary">
                  <div className="text-4xl mb-3">
                    <Heart className="w-10 h-10 mx-auto" />
                  </div>
                  <div className="text-lg font-medium text-text mb-1">
                    Пока нет избранных моделей
                  </div>
                  <Button
                    label="Перейти в каталог"
                    variant="primary"
                    onClick={() => navigate("/models")}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <div className="max-w-xl">
              <div className="bg-surface border border-border rounded-[18px] p-6">
                <div className="font-extrabold text-base mb-5 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-[9px] bg-accent/12 flex items-center justify-center text-base">
                    <User className="w-4 h-4" />
                  </span>
                  Профиль
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
                    Отображаемое имя
                  </label>
                  <input
                    className="px-3.5 py-2.5 bg-surface2 border border-border rounded-[10px] text-text text-sm outline-none focus:border-accent transition-all duration-200"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
                    Email
                  </label>
                  <input
                    className="px-3.5 py-2.5 bg-surface2 border border-border rounded-[10px] text-textSecondary text-sm outline-none cursor-not-allowed opacity-60"
                    value={user.email || ""}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
                    О себе
                  </label>
                  <textarea
                    className="px-3.5 py-2.5 bg-surface2 border border-border rounded-[10px] text-text text-sm outline-none focus:border-accent transition-all duration-200 resize-y min-h-[72px] leading-relaxed"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    label={saving ? "Сохранение..." : "Сохранить"}
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  />
                  <Button
                    label="Отмена"
                    variant="ghost"
                    onClick={() => {
                      setDisplayName(p?.display_name || p?.username || "");
                      setBio(p?.bio || "");
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Heatmap */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="font-extrabold text-sm text-text mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Активность
            </div>
            <div className="grid grid-cols-12 gap-[3px] mb-2">
              {heatmapData.map((level, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[3px] transition-colors cursor-default hm-${level}`}
                  style={{
                    background:
                      level === 0
                        ? "var(--surface3, #1C2640)"
                        : level === 1
                          ? "rgba(27,110,243,0.2)"
                          : level === 2
                            ? "rgba(27,110,243,0.4)"
                            : level === 3
                              ? "rgba(27,110,243,0.65)"
                              : "var(--accent, #1B6EF3)",
                  }}
                  title={`${Math.floor(Math.random() * 5)} действий`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>3 мес. назад</span>
              <span>Сейчас</span>
            </div>
          </div>

          {/* Activity Feed */}
          {activity?.feed && activity.feed.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="font-extrabold text-sm text-text mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Последнее
              </div>
              <div className="flex flex-col gap-1">
                {activity.feed.slice(0, 5).map((item, i) => {
                  const icon = activityTypeIcon(item.type);
                  return (
                    <div
                      key={i}
                      className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-surface2 transition-colors cursor-default"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-surface2`}
                      >
                        {icon.icon}
                      </div>
                      <div className="flex-1 min-w-0 text-xs text-textSecondary leading-relaxed">
                        {activityTypeText(item)}
                      </div>
                      <div className="text-[10px] text-text-muted flex-shrink-0">
                        {formatDateAgo(item.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarSelect}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverSelect}
      />

      {/* Avatar crop modal */}
      {avatarCrop && (
        <CropModal
          image={avatarCrop.image}
          open={!!avatarCrop}
          onClose={() => {
            setAvatarCrop(null);
            URL.revokeObjectURL(avatarCrop.image);
          }}
          onConfirm={handleAvatarCropConfirm}
          aspect={1}
          circular
          title="Аватарка"
        />
      )}

      {/* Cover crop modal */}
      {coverCrop && (
        <CropModal
          image={coverCrop.image}
          open={!!coverCrop}
          onClose={() => {
            setCoverCrop(null);
            URL.revokeObjectURL(coverCrop.image);
          }}
          onConfirm={handleCoverCropConfirm}
          aspect={16 / 9}
          title="Обложка"
        />
      )}
    </div>
  );
}

