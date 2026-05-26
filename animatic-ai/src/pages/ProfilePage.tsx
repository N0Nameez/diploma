import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/Button";
import ModelCard from "../components/ModelCard";
import Pagination from "../components/catalog/Pagination";
import { toast } from "react-hot-toast";
import { CropModal } from "../components/CropModal";
import { ReportModal } from "../components/ReportModal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import {
  fetchUser,
  fetchUserModels,
  fetchUserAnimations,
  fetchUserFavorites,
  fetchUserFavoriteAnimations,
  fetchUserLikedModels,
  fetchUserLikedAnimations,
  fetchUserActivity,
  updateUserProfile,
  updateModel,
  uploadAvatar,
  uploadCover,
  toggleFollow,
  checkFollowing,
  fetchUserFollowers,
  fetchUserFollowing,
  cancelSubscription,
  toggleAutoRenew,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
  type ApiModel,
  type ApiAnimation,
  type ApiUser,
  type ApiNotification,
} from "../services/api";
import {
  Folder,
  Heart,
  Bookmark,
  Settings,
  User,
  Calendar,
  Zap,
  Edit,
  Lock,
  Users,
  Gem,
  Download,
  ShieldCheck,
  CreditCard,
  Flag,
  Play,
  Bell,
  Trash2,
  Check,
  Sparkles,
  ThumbsUp,
  MessageSquare,
  Reply,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type TabId = "works" | "favorites" | "liked" | "social" | "notifications" | "settings";
type ModelsFilter = "all" | "free_use" | "view_only" | "private";
type WorksTypeFilter = "all" | "models" | "animations";
type SocialTab = "followers" | "following";

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
      "linear-gradient(135deg, #1a0a0a 0%, #3a1a0a 30%, #5a2a0a 60%, #2a0a1a 100%)",
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
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile, signOut, refreshProfile } = useAuth();
  const isOwner = user ? (!id || id === user.id) : false;
  const targetId = id || user?.id;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("works");
  const [modelsFilter, setModelsFilter] = useState<ModelsFilter>("all");
  const [worksTypeFilter, setWorksTypeFilter] = useState<WorksTypeFilter>("all");
  const [socialTab, setSocialTab] = useState<SocialTab>("followers");
  const [modelSort, setModelSort] = useState<string>("Новые сначала");
  const [currentPage, setCurrentPage] = useState(1);
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
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [coverKey, setCoverKey] = useState(Date.now());

  // Real data
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [userModels, setUserModels] = useState<ApiModel[]>([]);
  const [userAnimations, setUserAnimations] = useState<ApiAnimation[]>([]);
  const [userFavorites, setUserFavorites] = useState<ApiModel[]>([]);
  const [userFavoriteAnimations, setUserFavoriteAnimations] = useState<ApiAnimation[]>([]);
  const [userLikedModels, setUserLikedModels] = useState<ApiModel[]>([]);
  const [userLikedAnimations, setUserLikedAnimations] = useState<ApiAnimation[]>([]);
  const [userFollowers, setUserFollowers] = useState<ApiUser[]>([]);
  const [userFollowing, setUserFollowing] = useState<ApiUser[]>([]);
  const [activity, setActivity] = useState<{
    heatmap: { date: string; count: number }[];
    feed: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [changingEmail, setChangingEmail] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Settings form
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Report
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    loading: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    loading: false,
  });

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user || !isOwner) return;
    if (!silent && notifications.length === 0) setLoadingNotifications(true);
    try {
      const res = await fetchNotifications(user.id, 100);
      setNotifications(res.items);
      setUnreadNotificationsCount(res.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user, isOwner, notifications.length]);

  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotifications();
    }
  }, [activeTab, loadNotifications]);

  useEffect(() => {
    if (!user || !isOwner) return;
    const handleSync = () => {
      loadNotifications(true);
    };
    window.addEventListener('notifications-updated', handleSync);
    return () => window.removeEventListener('notifications-updated', handleSync);
  }, [user, isOwner, loadNotifications]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    if (tab === "notifications") {
      setActiveTab("notifications");
    }
  }, []);

  // Cover modal
  const [showCoverModal, setShowCoverModal] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  // Redirect from private tabs if not owner
  useEffect(() => {
    if (!isOwner && (activeTab === "favorites" || activeTab === "notifications" || activeTab === "settings")) {
      setActiveTab("works");
    }
  }, [activeTab, isOwner]);

  // Load profile
  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    fetchUser(targetId)
      .then(async (p) => {
        setProfile(p);

        // Auto-sync only for owner
        if (isOwner && user) {
          const metaName = user.user_metadata?.display_name || user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name;

          let initialName = (p.display_name && p.display_name !== "Аноним")
            ? p.display_name
            : (metaName || p.username || "");

          if ((!p.display_name || p.display_name === "Аноним") && metaName && metaName !== "Аноним") {
            try {
              await updateUserProfile(user.id, { display_name: metaName });
              initialName = metaName;
            } catch (e) {
              console.error("Failed to auto-sync profile name", e);
            }
          }

          const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
          if (!p.avatar_url && metaAvatar) {
            try {
              await updateUserProfile(user.id, { avatar_url: metaAvatar });
            } catch (e) {
              console.error("Failed to auto-sync profile avatar", e);
            }
          }
          setDisplayName(initialName);
          setBio(p.bio || "");
          setFollowersCount(p.followers_count || 0);
        } else {
          setDisplayName(p.display_name || p.username || "");
          setBio(p.bio || "");
          setFollowersCount(p.followers_count || 0);

          if (user && targetId) {
            checkFollowing(targetId, user.id)
              .then(res => setIsFollowing(res.is_following))
              .catch(console.error);
          }
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetId, user?.id, isOwner]);

  // Load user models and animations
  useEffect(() => {
    if (!targetId || activeTab !== "works") return;
    
    // Load models
    fetchUserModels(targetId, 1000)
      .then((res) => {
        const filtered = isOwner 
          ? res.items 
          : res.items.filter(m => m.license !== 'private' && m.status === 'approved');
        setUserModels(filtered);
      })
      .catch(() => setUserModels([]));

    // Load animations
    fetchUserAnimations(targetId, 1000)
      .then((res) => {
        const filtered = isOwner
          ? res.items
          : res.items.filter(a => a.license !== 'private' && a.status === 'approved');
        setUserAnimations(filtered);
      })
      .catch(() => setUserAnimations([]));
  }, [targetId, activeTab, isOwner]);

  // Load favorites (only for owner) and liked immediately
  useEffect(() => {
    if (!targetId) return;
    
    if (isOwner) {
      fetchUserFavorites(targetId, 1000)
        .then((res) => setUserFavorites(res.items))
        .catch(() => setUserFavorites([]));

      fetchUserFavoriteAnimations(targetId, 1000)
        .then((res) => setUserFavoriteAnimations(res.items))
        .catch(() => setUserFavoriteAnimations([]));
    }
    
    fetchUserLikedModels(targetId, 1000)
      .then((res) => setUserLikedModels(res.items))
      .catch(() => setUserLikedModels([]));

    fetchUserLikedAnimations(targetId, 1000)
      .then((res) => setUserLikedAnimations(res.items))
      .catch(() => setUserLikedAnimations([]));
  }, [targetId, isOwner]);

  // Load activity
  useEffect(() => {
    if (!targetId) return;
    fetchUserActivity(targetId, 90)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [targetId]);

  // Load social data (followers and following)
  useEffect(() => {
    if (!targetId || activeTab !== "social") return;
    
    fetchUserFollowers(targetId)
      .then(res => setUserFollowers(res.items))
      .catch(() => setUserFollowers([]));
      
    fetchUserFollowing(targetId)
      .then(res => setUserFollowing(res.items))
      .catch(() => setUserFollowing([]));
  }, [targetId, activeTab]);

  const handleToggleFollow = async () => {
    if (!user || !targetId) return;

    // Optimistic update
    const previousFollowing = isFollowing;
    const previousFollowersCount = followersCount;

    setIsFollowing(!previousFollowing);
    setFollowersCount(previousFollowing ? previousFollowersCount - 1 : previousFollowersCount + 1);

    try {
      const res = await toggleFollow(targetId, user.id);
      setIsFollowing(res.is_subscribed);
      // Backend returns total subscribers count
      if (res.subscribers_count !== undefined) {
        setFollowersCount(res.subscribers_count);
      }
      showToast(res.is_subscribed ? "Вы подписались на автора" : "Вы отписались от автора");
    } catch (err) {
      // Rollback
      setIsFollowing(previousFollowing);
      setFollowersCount(previousFollowersCount);
      console.error("Follow error:", err);
      showToast("Ошибка при подписке");
    }
  };

  const handleEmailChange = async () => {
    if (!user || !emailInput || emailInput === user.email) return;
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailInput });
      if (error) throw error;
      showToast("Письмо с подтверждением отправлено на оба адреса");
    } catch (err: any) {
      console.error("Email change error:", err);
      showToast(err.message || "Ошибка при смене почты");
    } finally {
      setChangingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/profile?tab=settings`,
      });
      if (error) throw error;
      showToast("Ссылка для сброса пароля отправлена на почту");
    } catch (err: any) {
      showToast("Ошибка при отправке ссылки");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, {
        display_name: displayName,
        bio,
      });
      setProfile(updated);
      setDisplayName(updated.display_name || updated.username || "");
      setBio(updated.bio || "");
      showToast("Профиль сохранён");
    } catch (err: any) {
      showToast(err.message || "Ошибка при сохранении", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverPreset = async (presetId: string) => {
    if (!user || !profile) return;
    
    // Optimistic update
    const oldProfile = profile;
    setProfile({ 
      ...profile, 
      cover_preset: presetId, 
      cover_url: null 
    } as ApiUser);
    setShowCoverModal(false);

    try {
      const updated = await updateUserProfile(user.id, {
        cover_preset: presetId,
        cover_url: null as any, // Clear uploaded photo when choosing preset
      });
      setProfile(updated);
      setCoverKey((k) => k + 1); // Force re-render just in case
      showToast("Обложка обновлена");
    } catch (err: any) {
      setProfile(oldProfile);
      showToast(err.message || "Ошибка при обновлении", "error");
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
        
        // Refresh global profile state and local profile
        const fresh = await refreshProfile();
        if (fresh) {
          setProfile(fresh);
          // Sync with Navbar and other components using useAuth
          window.dispatchEvent(new CustomEvent('profile-refresh'));
        }
        
        setAvatarKey(Date.now()); // Update cache-busting key
        showToast("Аватарка обновлена");
      } catch (err: any) {
        showToast(err.message || "Ошибка при загрузке аватарки", "error");
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
        const fresh = await refreshProfile();
        if (fresh) {
          setProfile(fresh);
          // Sync with Navbar and other components using useAuth
          window.dispatchEvent(new CustomEvent('profile-refresh'));
        }
        setCoverKey(Date.now()); // Update cache-busting key
        showToast("Обложка обновлена");
      } catch (err: any) {
        showToast(err.message || "Ошибка при загрузке обложки", "error");
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
  }, [modelsFilter, worksTypeFilter, modelSort]);

  // Sort models and animations
  const getSortedWorks = () => {
    // Combine both lists based on type filter
    let list: (ApiModel | ApiAnimation)[] = [];
    
    if (worksTypeFilter === "all") {
      list = [...userModels, ...userAnimations];
    } else if (worksTypeFilter === "models") {
      list = [...userModels];
    } else if (worksTypeFilter === "animations") {
      list = [...userAnimations];
    }

    // Filter by type/license
    list = list.filter((item) => {
      if (!isOwner && (item.license === 'private' || item.status !== 'approved')) return false;
      if (modelsFilter === "free_use") return (isOwner || item.status === "approved") && item.license === "free_use";
      if (modelsFilter === "view_only") return (isOwner || item.status === "approved") && item.license === "view_only";
      if (modelsFilter === "private") return item.license === "private";
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

  const displayedWorks = getSortedWorks();

  if (!targetId) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-text-primary font-bold mb-2">
            Профиль не найден
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

  if (!profile) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-background-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-text-secondary" />
          </div>
          <div className="text-2xl text-text-primary font-bold mb-2">
            Профиль недоступен
          </div>
          <p className="text-text-secondary mb-6">Возможно, пользователь был заблокирован или удален.</p>
          <Link to="/" className="text-accent hover:underline">
            На главную
          </Link>
        </div>
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
    : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) 
      ? `${user?.user_metadata?.avatar_url || user?.user_metadata?.picture}?v=${avatarKey}`
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
            Создал модель <span className="font-bold text-accent">{item.entity_name}</span>
          </>
        );
      case "model_liked":
        return (
          <>
            Лайкнул модель <span className="font-bold text-accent">{item.entity_name}</span>
          </>
        );
      case "model_downloaded":
        return (
          <>
            Скачал модель <span className="font-bold text-accent">{item.entity_name}</span>
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
  const isBanned = (profile as any)?.status === "blocked" || (profile as any)?.status === "banned";

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="relative h-[300px] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-primary" />
          {isOwner && (
            <button
              onClick={() => setShowCoverModal(true)}
              className="absolute bottom-8 right-8 px-3.5 py-2 rounded-[9px] bg-black/45 backdrop-blur border border-white/15 text-white/80 text-xs font-semibold cursor-pointer hover:bg-black/65 hover:text-white transition-all duration-200 flex items-center gap-1.5"
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
          )}
      </div>

      {/* Cover preset modal */}
      {showCoverModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
          onClick={() => setShowCoverModal(false)}
        >
          <div
            className="bg-background-surface border border-border rounded-2xl p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Выберите обложку
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleCoverPreset(preset.id)}
                  className={`h-20 rounded-xl border-2 transition-all duration-200 ${coverPreset === preset.id ? "border-accent" : "border-transparent hover:border-border-elevated"}`}
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
                className=" w-full py-2.5 rounded-xl bg-background-secondary border border-border text-text-primary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
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
              <button
                onClick={async () => {
                  if (!user || !profile) return;
                  const oldProfile = profile;
                  
                  // Optimistic update
                  setProfile({
                    ...profile,
                    cover_url: null,
                    cover_preset: "default"
                  } as ApiUser);
                  setShowCoverModal(false);

                  try {
                    const updated = await updateUserProfile(user.id, {
                      cover_url: null as any,
                      cover_preset: "default",
                    });
                    setProfile(updated);
                    setCoverKey((k) => k + 1);
                    showToast("Обложка удалена");
                  } catch {
                    setProfile(oldProfile);
                    showToast("Ошибка при удалении");
                  }
                }}
                className="mt-4 w-full py-2.5 rounded-xl bg-background-secondary border border-border text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Удалить обложку
              </button>
            </div>
            <button
              onClick={() => setShowCoverModal(false)}
              className="w-full py-2 rounded-xl bg-background-secondary border border-border text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-10 relative -mt-16 z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={authorName}
                className="w-[100px] h-[100px] rounded-full object-cover border-4 border-background-primary shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              />
            ) : (
              <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-accent to-accent flex items-center justify-center text-[40px] font-extrabold text-white border-4 border-background-primary shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {authorInitial}
              </div>
            )}
            {isOwner && (
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-accent border-2 border-background-primary flex items-center justify-center text-xs text-white cursor-pointer hover:scale-110 transition-transform duration-200"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 pb-1.5 min-w-0 text-center md:text-left">
            <div className="font-extrabold text-[24px] md:text-[28px] tracking-[-0.5px] mb-1 break-all flex flex-col md:flex-row items-center gap-2">
              <span>{authorName}</span>
              {isBanned && (
                <span className="bg-red-500/10 text-red-500 text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-red-500/20 flex-shrink-0">
                  Заблокирован
                </span>
              )}
            </div>
            <div className="text-sm text-text-secondary mb-2">
              @{p?.username} · {joinYear}
              {p?.credits !== undefined && (
                <span className="ml-3 text-accent">
                  <Gem className="w-3.5 h-3.5 inline" /> {p.credits}
                </span>
              )}
            </div>
            {p?.bio && (
              <div className="text-sm text-text-secondary font-light leading-relaxed max-w-[480px]">
                {p.bio}
              </div>
            )}
          </div>
          <div className="flex gap-2 pb-1.5 flex-shrink-0 w-full md:w-auto justify-center md:justify-end">
            {isOwner ? (
              <>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-5 py-2.5 rounded-[10px] bg-background-secondary border border-border-elevated text-text-primary text-sm font-semibold cursor-pointer hover:border-accent hover:bg-accent/10 hover:text-accent transition-all duration-200 flex items-center gap-2"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Редактировать
                </button>

              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleToggleFollow}
                  className={`px-8 py-2.5 rounded-[10px] text-sm font-bold cursor-pointer transition-all duration-300 shadow-lg ${isFollowing
                      ? "bg-background-secondary border border-border-elevated text-text-secondary hover:bg-red-500/10 hover:text-red-500 hover:border-red-500"
                      : "bg-accent text-white hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                >
                  {isFollowing ? "Отписаться" : "Подписаться"}
                </button>
                <button
                  onClick={() => {
                    if (!user) {
                      showToast("Войдите, чтобы отправить жалобу", "error");
                      return;
                    }
                    setReportModalOpen(true);
                  }}
                  className="p-2.5 rounded-[10px] bg-background-secondary border border-border-elevated text-text-secondary hover:text-danger hover:border-danger transition-all duration-200 shadow-lg"
                  title="Пожаловаться на пользователя"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:flex bg-border gap-[1px] border border-border rounded-2xl overflow-hidden mb-7">
          {[
            { num: p?.models_count ?? 0, lbl: "Модели" },
            { num: p?.animations_count ?? 0, lbl: "Анимации" },
            { num: followersCount, lbl: "Подписчики" },
            { num: p?.total_downloads ?? 0, lbl: "Скачивания" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-background-surface flex-1 p-4 hover:bg-background-secondary transition-colors duration-200 cursor-default text-center"
            >
              <div className="font-extrabold text-[22px] tracking-[-0.5px]">
                {stat.num}
              </div>
              <div className="text-[11px] text-text-secondary font-medium uppercase tracking-[0.8px]">
                {stat.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-10 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {isBanned && !isOwner ? (
          <div className="col-span-full mt-8 bg-red-500/5 border border-red-500/10 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Профиль заблокирован</h2>
            <p className="text-text-secondary max-w-md mx-auto">
              Этот пользователь был заблокирован за нарушение правил платформы. Его модели, комментарии и активность скрыты.
            </p>
          </div>
        ) : (
          <>
            {/* Left */}
            <div className="min-w-0 overflow-hidden">
              {/* Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 bg-background-surface border border-border rounded-[20px] p-2 mb-8 shadow-sm flex-nowrap">
            {[
              {
                id: "works" as TabId,
                label: (
                  <>
                    <Folder className="w-4 h-4" /> Работы
                  </>
                ),
              },
              ...(isOwner ? [
                {
                  id: "favorites" as TabId,
                  label: (
                    <>
                      <Bookmark className="w-4 h-4" /> Избранное
                    </>
                  ),
                },
              ] : []),
              {
                id: "liked" as TabId,
                label: (
                  <>
                    <Heart className="w-4 h-4" /> Понравилось
                  </>
                ),
              },
              {
                id: "social" as TabId,
                label: (
                  <>
                    <Users className="w-4 h-4" /> Сообщество
                  </>
                ),
              },
              ...(isOwner ? [
                {
                  id: "notifications" as TabId,
                  label: (
                    <>
                      <div className="relative">
                        <Bell className="w-4 h-4" />
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-background-surface" />
                        )}
                      </div>
                      Уведомления
                    </>
                  ),
                },
              ] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[14px] text-sm font-black transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-accent text-white shadow-xl shadow-accent/25 scale-[1.02]"
                    : "text-text-secondary hover:bg-background-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Works (Models + Animations) */}
          {activeTab === "works" && (
            <div className="space-y-6">
              {/* Filters and Sort Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type Filter */}
                  <div className="flex bg-background-secondary p-1 rounded-xl mr-2">
                    {[
                      { id: "all", label: "Все", count: userModels.length + userAnimations.length },
                      { id: "models", label: "3D Модели", count: userModels.length },
                      { id: "animations", label: "Анимации", count: userAnimations.length },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setWorksTypeFilter(t.id as WorksTypeFilter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                          worksTypeFilter === t.id
                            ? "bg-background-surface text-text-primary shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {t.label}
                        <span className={`text-[10px] opacity-50 ${worksTypeFilter === t.id ? "text-accent" : ""}`}>{t.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* License/Status Filter */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: "all", label: "Все статусы", count: userModels.length + userAnimations.length },
                      { id: "free_use", label: "Free Use", count: userModels.filter(m => (isOwner || m.status === 'approved') && m.license === 'free_use').length + userAnimations.filter(a => (isOwner || a.status === 'approved') && a.license === 'free_use').length },
                      { id: "view_only", label: "Only Watch", count: userModels.filter(m => (isOwner || m.status === 'approved') && m.license === 'view_only').length + userAnimations.filter(a => (isOwner || a.status === 'approved') && a.license === 'view_only').length },
                      ...(isOwner ? [{ id: "private", label: "Приватные", count: userModels.filter(m => m.license === 'private').length + userAnimations.filter(a => a.license === 'private').length }] : []),
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setModelsFilter(f.id as ModelsFilter)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                          modelsFilter === f.id
                            ? "bg-accent/10 text-accent border border-accent/20"
                            : "text-text-secondary hover:text-text-primary border border-transparent"
                        }`}
                      >
                        {f.id === 'private' && <Lock className="w-3 h-3" />}
                        {f.label}
                        <span className="opacity-50 text-[10px]">{f.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Сортировка:</span>
                  <select
                    value={modelSort}
                    onChange={(e) => setModelSort(e.target.value)}
                    className="bg-background-secondary border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  >
                    <option>Новые сначала</option>
                    <option>По лайкам</option>
                    <option>По скачиваниям</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {displayedWorks.map((item) => (
                  <div key={item.id} className="relative group">
                    <ModelCard 
                      model={item} 
                      type={'duration_seconds' in item ? 'animation' : '3d'} 
                    />
                    {item.license === "private" && (
                      <div className="absolute top-10 left-3 px-2 py-0.5 rounded-md bg-yellow-500/12 text-yellow-500 border border-yellow-500/25 text-[10px] font-bold z-10 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Приватная
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {displayedWorks.length === 0 && (
                <div className="text-center py-20 bg-background-surface/50 border-2 border-dashed border-border rounded-3xl">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background-secondary mx-auto mb-4 border border-border">
                    <Sparkles className="w-8 h-8 text-text-muted opacity-40" />
                  </div>
                  <p className="text-text-secondary font-medium">Здесь пока пусто</p>
                </div>
              )}
            </div>
          )}

          {/* Favorites */}
          {activeTab === "favorites" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="font-extrabold text-lg flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-accent" /> Избранное
                </div>
                
                {/* Type Filter */}
                <div className="flex bg-background-secondary p-1 rounded-xl">
                  {[
                    { id: "all", label: "Все", count: userFavorites.length + userFavoriteAnimations.length },
                    { id: "models", label: "3D Модели", count: userFavorites.length },
                    { id: "animations", label: "Анимации", count: userFavoriteAnimations.length },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setWorksTypeFilter(t.id as WorksTypeFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        worksTypeFilter === t.id
                          ? "bg-background-surface text-text-primary shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {t.label}
                      <span className={`text-[10px] opacity-50 ${worksTypeFilter === t.id ? "text-accent" : ""}`}>{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ...(worksTypeFilter === "all" || worksTypeFilter === "models" ? userFavorites : []),
                  ...(worksTypeFilter === "all" || worksTypeFilter === "animations" ? userFavoriteAnimations : [])
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item) => (
                  <ModelCard 
                    key={item.id} 
                    model={item} 
                    type={'duration_seconds' in item ? 'animation' : '3d'}
                  />
                ))}
              </div>
              {userFavorites.length === 0 && userFavoriteAnimations.length === 0 && (
                <div className="text-center py-20 bg-background-surface/50 border-2 border-dashed border-border rounded-3xl">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background-secondary mx-auto mb-4 border border-border">
                    <Bookmark className="w-8 h-8 text-text-muted opacity-40" />
                  </div>
                  <p className="text-text-secondary font-medium">Вы еще ничего не добавили в избранное</p>
                </div>
              )}
            </div>
          )}

          {/* Liked */}
          {activeTab === "liked" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="font-extrabold text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent" /> Понравившиеся
                </div>

                {/* Type Filter */}
                <div className="flex bg-background-secondary p-1 rounded-xl">
                  {[
                    { id: "all", label: "Все", count: userLikedModels.length + userLikedAnimations.length },
                    { id: "models", label: "3D Модели", count: userLikedModels.length },
                    { id: "animations", label: "Анимации", count: userLikedAnimations.length },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setWorksTypeFilter(t.id as WorksTypeFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        worksTypeFilter === t.id
                          ? "bg-background-surface text-text-primary shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {t.label}
                      <span className={`text-[10px] opacity-50 ${worksTypeFilter === t.id ? "text-accent" : ""}`}>{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ...(worksTypeFilter === "all" || worksTypeFilter === "models" ? userLikedModels : []),
                  ...(worksTypeFilter === "all" || worksTypeFilter === "animations" ? userLikedAnimations : [])
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item) => (
                  <ModelCard 
                    key={item.id} 
                    model={item} 
                    type={'duration_seconds' in item ? 'animation' : '3d'}
                  />
                ))}
              </div>
              {userLikedModels.length === 0 && userLikedAnimations.length === 0 && (
                <div className="text-center py-20 bg-background-surface/50 border-2 border-dashed border-border rounded-3xl">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background-secondary mx-auto mb-4 border border-border">
                    <Heart className="w-8 h-8 text-text-muted opacity-40" />
                  </div>
                  <p className="text-text-secondary font-medium">Вы еще не ставили лайки</p>
                </div>
              )}
            </div>
          )}

          {/* Social */}
          {activeTab === "social" && (
            <div className="space-y-6">
              {/* Social Sub-tabs */}
              <div className="flex gap-6 border-b border-border pb-4">
                <button
                  onClick={() => setSocialTab("followers")}
                  className={`text-sm font-bold transition-all relative pb-4 ${
                    socialTab === "followers" ? "text-accent" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Подписчики <span className="ml-1 opacity-50">{followersCount}</span>
                  {socialTab === "followers" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent" />}
                </button>
                <button
                  onClick={() => setSocialTab("following")}
                  className={`text-sm font-bold transition-all relative pb-4 ${
                    socialTab === "following" ? "text-accent" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Подписки <span className="ml-1 opacity-50">{p?.following_count ?? 0}</span>
                  {socialTab === "following" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent" />}
                </button>
              </div>

              {socialTab === "followers" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userFollowers.length > 0 ? (
                    userFollowers.map((f) => (
                      <Link
                        key={f.id}
                        to={`/profile/${f.id}`}
                        className="flex items-center gap-4 p-4 bg-background-surface border border-border rounded-2xl hover:border-accent transition-all duration-200 group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-background-secondary border border-border group-hover:border-accent/30 transition-colors">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-secondary">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-text-primary truncate">
                            {f.display_name || f.username}
                          </div>
                          <div className="text-xs text-text-secondary truncate">
                            @{f.username}
                          </div>
                        </div>
                        <div className="text-xs text-text-secondary font-medium">
                          {f.followers_count} подп.
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 text-text-secondary">
                      У этого автора пока нет подписчиков
                    </div>
                  )}
                </div>
              )}

              {socialTab === "following" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userFollowing.length > 0 ? (
                    userFollowing.map((f) => (
                      <Link
                        key={f.id}
                        to={`/profile/${f.id}`}
                        className="flex items-center gap-4 p-4 bg-background-surface border border-border rounded-2xl hover:border-accent transition-all duration-200 group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-background-secondary border border-border group-hover:border-accent/30 transition-colors">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-secondary">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-text-primary truncate">
                            {f.display_name || f.username}
                          </div>
                          <div className="text-xs text-text-secondary truncate">
                            @{f.username}
                          </div>
                        </div>
                        <div className="text-xs text-text-secondary font-medium">
                          {f.followers_count} подп.
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 text-text-secondary">
                      {isOwner ? "Вы еще ни на кого не подписаны" : "Этот автор ни на кого не подписан"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && isOwner && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 flex items-center justify-center text-accent">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Уведомления</h2>
                    <p className="text-sm text-text-secondary">
                      {unreadNotificationsCount > 0 
                        ? `У вас ${unreadNotificationsCount} новых уведомлений` 
                        : "Нет новых уведомлений"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      await markAllNotificationsRead(user.id);
                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                      setUnreadNotificationsCount(0);
                      window.dispatchEvent(new CustomEvent('notifications-updated'));
                      showToast("Все уведомления прочитаны");
                    }}
                    className="px-4 py-2 rounded-xl bg-background-secondary border border-border text-sm font-bold hover:border-accent transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Прочитать все
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setConfirmModal({
                        isOpen: true,
                        title: "Очистить уведомления",
                        message: "Вы уверены, что хотите удалить все прочитанные уведомления? Это действие нельзя отменить.",
                        loading: false,
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, loading: true }));
                          try {
                            await clearReadNotifications(user.id);
                            setNotifications(prev => prev.filter(n => !n.is_read));
                            window.dispatchEvent(new CustomEvent('notifications-updated'));
                            showToast("Прочитанные уведомления удалены");
                          } catch (err) {
                            showToast("Ошибка при удалении", "error");
                          } finally {
                            setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
                          }
                        }
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-background-secondary border border-border text-sm font-bold hover:text-red-500 hover:border-red-500/30 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Очистить
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="py-20 text-center text-text-secondary">Загрузка...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-20 text-center bg-background-surface border border-dashed border-border rounded-3xl">
                    <Bell className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                    <p className="text-text-secondary">У вас пока нет уведомлений</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 group ${
                        !n.is_read 
                          ? "bg-accent/5 border-accent/20 shadow-sm" 
                          : "bg-background-surface border-border hover:border-accent/30"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-background-secondary flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors group-hover:bg-background-surface">
                        {n.type === 'like' && <Heart className="w-5 h-5 text-accent fill-accent/10" />}
                        {n.type === 'favorite' && <Bookmark className="w-5 h-5 text-warning fill-warning/10" />}
                        {n.type === 'follower' && <User className="w-5 h-5 text-blue-400" />}
                        {n.type === 'comment' && <MessageSquare className="w-5 h-5 text-accent2" />}
                        {n.type === 'reply' && <Reply className="w-5 h-5 text-accent2" />}
                        {n.type === 'generation_complete' && <CheckCircle2 className="w-5 h-5 text-success" />}
                        {n.type === 'generation_error' && <XCircle className="w-5 h-5 text-danger" />}
                        {n.type === 'generation_started' && <Zap className="w-5 h-5 text-warning" />}
                        {n.type === 'subscription_expiring' && <AlertTriangle className="w-5 h-5 text-warning" />}
                        {!['like', 'favorite', 'follower', 'comment', 'reply', 'generation_complete', 'generation_error', 'generation_started', 'subscription_expiring'].includes(n.type) && <Bell className="w-5 h-5 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <h4 className={`font-bold text-sm ${!n.is_read ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-text-muted whitespace-nowrap">
                            {new Date(n.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3">
                          <Link
                            to={n.link_url || '#'}
                            onClick={async () => {
                              if (!n.is_read && user) {
                                await markNotificationRead(n.id, user.id);
                                window.dispatchEvent(new CustomEvent('notifications-updated'));
                              }
                            }}
                            className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                          >
                            Перейти
                          </Link>
                          {!n.is_read && (
                            <button
                              onClick={async () => {
                                if (!user) return;
                                await markNotificationRead(n.id, user.id);
                                setNotifications(prev => prev.map(noti => noti.id === n.id ? { ...noti, is_read: true } : noti));
                                setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
                                window.dispatchEvent(new CustomEvent('notifications-updated'));
                              }}
                              className="text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors"
                            >
                              Отметить как прочитанное
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!user) return;
                          await deleteNotification(n.id, user.id);
                          setNotifications(prev => prev.filter(noti => noti.id !== n.id));
                          if (!n.is_read) setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
                          window.dispatchEvent(new CustomEvent('notifications-updated'));
                          showToast("Удалено");
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <div className="max-w-xl">
              <div className="bg-background-surface border border-border rounded-[18px] p-6">
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
                    className="px-3.5 py-2.5 bg-background-secondary border border-border rounded-[10px] text-text text-sm outline-none focus:border-accent transition-all duration-200"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
                    Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3.5 py-2.5 bg-background-secondary border border-border rounded-[10px] text-text text-sm outline-none focus:border-accent transition-all duration-200"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <Button
                      label={changingEmail ? "..." : "Сменить"}
                      variant="primary"
                      onClick={handleEmailChange}
                      disabled={changingEmail || emailInput === user?.email}
                      className="px-6"
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">
                    Потребуется подтверждение с обоих адресов почты
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
                    О себе
                  </label>
                  <textarea
                    className="px-3.5 py-2.5 bg-background-secondary border border-border rounded-[10px] text-text text-sm outline-none focus:border-accent transition-all duration-200 resize-y min-h-[72px] leading-relaxed"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={500}
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
                      setEmailInput(user?.email || "");
                    }}
                  />
                </div>

                <div className="mt-8 pt-8 border-t border-border">
                  <div className="font-extrabold text-base mb-5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[9px] bg-accent/12 flex items-center justify-center text-base">
                      <Bell className="w-4 h-4" />
                    </span>
                    Уведомления
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'comments', label: 'Новые комментарии' },
                      { key: 'replies', label: 'Ответы на комментарии' },
                      { key: 'likes', label: 'Лайки на ваши работы' },
                      { key: 'favorites', label: 'Добавления в избранное' },
                      { key: 'followers', label: 'Новые подписчики' },
                      { key: 'generation_started', label: 'Начало генерации' },
                      { key: 'generation_finished', label: 'Завершение генерации' },
                      { key: 'subscription', label: 'Окончание подписки' },
                      { key: 'email', label: 'Email рассылки' },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">{setting.label}</span>
                        <button
                          onClick={async () => {
                            if (!user || !profile) return;
                            const currentSettings = profile.notification_settings || {};
                            const newSettings = {
                              ...currentSettings,
                              [setting.key]: !currentSettings[setting.key as keyof typeof currentSettings]
                            };
                            
                            // Optimistic update
                            setProfile({ ...profile, notification_settings: newSettings } as ApiUser);
                            
                            try {
                              await updateUserProfile(user.id, { notification_settings: newSettings });
                              showToast("Настройки обновлены");
                            } catch (err) {
                              setProfile(profile);
                              showToast("Ошибка при обновлении");
                            }
                          }}
                          className={`w-9 h-5 rounded-full p-1 transition-colors duration-200 flex items-center ${
                            profile.notification_settings?.[setting.key as keyof typeof profile.notification_settings] !== false 
                              ? 'bg-accent justify-end' 
                              : 'bg-background-secondary border border-border justify-start'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border">
                  <div className="font-extrabold text-base mb-5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[9px] bg-accent/12 flex items-center justify-center text-base">
                      <Lock className="w-4 h-4" />
                    </span>
                    Безопасность
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background-secondary rounded-2xl border border-border">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Смена пароля</span>
                      <span className="text-xs text-text-secondary">Отправить ссылку для сброса на почту</span>
                    </div>
                    <Button
                      label={resettingPassword ? "Отправка..." : "Сбросить пароль"}
                      variant="ghost"
                      onClick={handlePasswordReset}
                      disabled={resettingPassword}
                      className="border border-border hover:bg-background-surface"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {isOwner && p && (
            <div className="bg-background-surface border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-12 h-12 rotate-12" />
              </div>
              <div className="font-extrabold text-sm text-text-primary mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Моя подписка
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                    Текущий план
                  </div>
                  <div className="text-lg font-black text-text-primary uppercase flex items-center gap-2">
                    {p.subscription_status === 'pro' ? 'Pro Plan' :
                      p.subscription_status === 'studio' ? 'Studio' : 'Free'}
                    {(p.subscription_status === 'pro' || p.subscription_status === 'studio') && (
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                    Баланс
                  </div>
                  <div className="text-lg font-black text-accent">
                    {p.credits} <span className="text-xs font-bold text-text-secondary">CR</span>
                  </div>
                </div>
              </div>

              {p.subscription_status && p.subscription_status !== 'free' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-background-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${p.subscription_days_left !== undefined && p.subscription_days_left !== null && p.subscription_days_left < 3 ? 'bg-danger' : 'bg-accent'}`}
                        style={{ width: `${Math.min(100, (((p.subscription_days_left ?? 0)) / 30) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[11px] text-text-secondary leading-tight">
                        До {new Date(p.subscription_end_date || '').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </div>
                      <div className={`text-[11px] font-bold ${p.subscription_days_left !== undefined && p.subscription_days_left !== null && p.subscription_days_left < 3 ? 'text-danger' : 'text-text-muted'}`}>
                        {p.subscription_days_left ?? 0} дн. осталось
                      </div>
                    </div>
                  </div>

                  {/* Management Controls */}
                  <div className="pt-2 border-t border-border/50 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-text-secondary">Автопродление</div>
                      <button
                        onClick={async () => {
                          if (!user) return;
                          try {
                            const newAutoRenew = !p.subscription_auto_renew;
                            await toggleAutoRenew(user.id, newAutoRenew);
                            setProfile({ ...p, subscription_auto_renew: newAutoRenew });
                            showToast(newAutoRenew ? "Автопродление включено" : "Автопродление выключено");
                          } catch (err) {
                            showToast("Ошибка при изменении автопродления");
                          }
                        }}
                        className={`w-9 h-5 rounded-full p-1 transition-colors duration-200 flex items-center ${p.subscription_auto_renew ? 'bg-accent justify-end' : 'bg-background-secondary border border-border justify-start'}`}
                      >
                        <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        label="Продлить"
                        variant="primary"
                        className="flex-1 h-8 text-[10px]"
                        onClick={() => navigate('/pricing')}
                      />
                      <button
                        onClick={async () => {
                          if (!user) return;
                          setConfirmModal({
                            isOpen: true,
                            title: "Отмена подписки",
                            message: "Вы уверены, что хотите отменить подписку? Она останется активной до конца оплаченного периода, но не будет продлена автоматически.",
                            loading: false,
                            onConfirm: async () => {
                              setConfirmModal(prev => ({ ...prev, loading: true }));
                              try {
                                await cancelSubscription(user.id);
                                const fresh = await fetchUser(user.id);
                                setProfile(fresh);
                                showToast("Подписка отменена");
                              } catch (err) {
                                showToast("Ошибка при отмене подписки", "error");
                              } finally {
                                setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
                              }
                            }
                          });
                        }}
                        className="flex-1 h-8 rounded-[9px] bg-background-secondary border border-border text-[10px] font-bold text-text-muted hover:text-red-500 hover:border-red-500/30 transition-all"
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-background-secondary/50 rounded-xl text-[11px] text-text-secondary border border-dashed border-border">
                  Перейдите на PRO для доступа к расширенным функциям и приоритетной генерации
                  <Button
                    label="Улучшить план"
                    variant="primary"
                    className="w-full mt-2 h-8 text-[10px]"
                    onClick={() => navigate('/pricing')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Heatmap */}
          <div className="bg-background-surface border border-border rounded-2xl p-5">
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
                        ? "var(--bg-secondary)"
                        : level === 1
                          ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                          : level === 2
                            ? "color-mix(in srgb, var(--accent) 40%, transparent)"
                            : level === 3
                              ? "color-mix(in srgb, var(--accent) 65%, transparent)"
                              : "var(--accent)",
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
            <div className="bg-background-surface border border-border rounded-2xl p-5">
              <div className="font-extrabold text-sm text-text mb-3 flex items-center gap-2">
                < Zap className="w-4 h-4" /> Последнее
              </div>
              <div className="flex flex-col gap-1">
                {activity.feed.slice(0, 5).map((item, i) => {
                  const icon = activityTypeIcon(item.type);
                  const isModelAction = ["model_created", "model_liked", "model_downloaded"].includes(item.type);

                  const Content = () => (
                    <>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-background-secondary group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                        {icon.icon}
                      </div>
                      <div className="flex-1 min-w-0 text-[11px] text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                        {activityTypeText(item)}
                      </div>
                      <div className="text-[10px] text-text-muted flex-shrink-0">
                        {formatDateAgo(item.created_at)}
                      </div>
                    </>
                  );

                  return isModelAction ? (
                    <Link
                      key={i}
                      to={`/models/${item.entity_id}`}
                      className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-background-secondary transition-all duration-200 group"
                    >
                      <Content />
                    </Link>
                  ) : (
                    <div
                      key={i}
                      className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-background-secondary transition-all duration-200 group"
                    >
                      <Content />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

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
          aspect={5 / 1}
          title="Обложка"
        />
      )}

      {reportModalOpen && targetId && user && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          userId={user.id}
          entityType="user"
          entityId={targetId}
          onSuccess={() => toast.success("Жалоба на пользователя отправлена")}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        loading={confirmModal.loading}
      />
    </div>
  );
}
