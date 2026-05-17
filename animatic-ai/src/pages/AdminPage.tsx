import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getAdminStats, 
  getAdminReports, 
  resolveReport, 
  warnUser, 
  updateModelStatusAdmin,
  updateCommentStatusAdmin,
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
  getAdminFinance,
  getAdminLogs
} from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell 
} from 'recharts';
import { 
  Users, Box, ShieldAlert, TrendingUp, Filter, 
  CheckCircle, XCircle, AlertTriangle, Trash2, Ban,
  RussianRuble, ScrollText, Cpu, UserPlus, ShieldCheck, Clock, ExternalLink, Calendar,
  Settings2, X, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const REPORT_REASONS_MAP: Record<string, string> = {
  'copyright': 'Нарушение авторских прав',
  'inappropriate': 'Неприемлемый контент',
  'spam': 'Спам или реклама',
  'other': 'Другое'
};

type Tab = 'overview' | 'reports' | 'users' | 'finance' | 'logs';

interface UserManagementModalProps {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
  adminId: string;
}

function UserManagementModal({ user, onClose, onUpdate, adminId }: UserManagementModalProps) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status === 'banned' ? 'banned' : 'active');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (role !== user.role) {
        await updateUserRole(adminId, user.id, role);
      }
      const currentStatus = user.status === 'banned' ? 'banned' : 'active';
      if (status !== currentStatus) {
        await updateUserStatus(adminId, user.id, status === 'banned' ? 'banned' : 'active');
      }
      toast.success("Данные пользователя обновлены");
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Ошибка при обновлении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-background-surface border border-border/60 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-border/40 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
              <Settings2 size={20} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter italic">Управление <span className="text-accent">пользователем</span></h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* User Info Preview */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center font-black text-accent overflow-hidden">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="font-black text-text-primary uppercase tracking-tight italic">@{user.username}</div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{user.id.slice(0, 12)}...</div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Роль доступа</label>
            <div className="grid grid-cols-3 gap-2">
              {(['user', 'moderator', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    role === r 
                      ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                      : 'bg-white/5 border-transparent text-text-muted hover:border-white/10'
                  }`}
                >
                  {r === 'user' ? 'Пользователь' : r === 'moderator' ? 'Модер' : 'Админ'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Статус аккаунта</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('active')}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                  status === 'active' 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/5 border-transparent text-text-muted hover:border-white/10'
                }`}
              >
                <CheckCircle size={14} />
                Активен
              </button>
              <button
                onClick={() => setStatus('banned')}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                  status === 'banned' 
                    ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' 
                    : 'bg-white/5 border-transparent text-text-muted hover:border-white/10'
                }`}
              >
                <Ban size={14} />
                Заблокирован
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white/[0.02] border-t border-border/40 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ModerationModalProps {
  report: any;
  onClose: () => void;
  onUpdate: () => void;
  adminId: string;
}

function ModerationModal({ report, onClose, onUpdate, adminId }: ModerationModalProps) {
  const [loading, setLoading] = useState(false);
  const [shouldHide, setShouldHide] = useState(report.entity_type !== 'user');
  const [shouldWarn, setShouldWarn] = useState(true);
  const [shouldBan, setShouldBan] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS_MAP[report.report_reason] || report.report_reason || '');

  const presets = [
    "Неприемлемый контент",
    "Спам или реклама",
    "Нарушение авторских прав",
    "Оскорбительное поведение"
  ];

  const handleModerate = async () => {
    setLoading(true);
    try {
      // 1. Hide/Delete content if checked
      if (shouldHide) {
        if (report.entity_type === 'model') {
          await updateModelStatusAdmin(adminId, report.entity_id, 'hidden');
        } else if (report.entity_type === 'comment') {
          await updateCommentStatusAdmin(adminId, report.entity_id, 'hidden');
        }
      }
      
      // 2. Warn user if checked
      if (shouldWarn && reason.trim()) {
        await warnUser(adminId, report.target_user_id || report.author_id, reason.trim());
      }

      // 3. Ban user if checked
      if (shouldBan) {
        await updateUserStatus(adminId, report.target_user_id || report.author_id, 'banned');
      }
      
      // 4. Resolve the report itself
      const actionText = [];
      if (shouldHide) actionText.push("Контент скрыт");
      if (shouldWarn) actionText.push(`Предупреждение: ${reason}`);
      if (shouldBan) actionText.push("Аккаунт заблокирован");
      
      const commentStr = actionText.length > 0 ? actionText.join(", ") : "Меры приняты без изменений";
      
      await resolveReport(adminId, report.id, 'resolved', commentStr);
      
      toast.success("Меры модерации успешно применены!");
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Ошибка модерации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-background-surface border border-border/60 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-border/40 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter italic">Модерация <span className="text-red-500">контента</span></h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Target Content Info */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                report.entity_type === 'model' ? 'bg-blue-600/30 text-blue-400 border border-blue-500/20' : 
                report.entity_type === 'comment' ? 'bg-orange-600/30 text-orange-400 border border-orange-500/20' : 
                'bg-purple-600/30 text-purple-400 border border-purple-500/20'
              }`}>
                {report.entity_type === 'model' ? 'Модель' : 
                 report.entity_type === 'comment' ? 'Комментарий' : 'Профиль'}
              </span>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-tight">
                Жалоба от: @{report.reporter_name}
              </span>
            </div>
            {report.target_content && (
              <div className="text-sm font-bold text-text-primary italic border-l-2 border-red-500/50 pl-3 py-1 bg-white/5 rounded-r-xl">
                "{report.target_content}"
              </div>
            )}
            <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">
              Первоначальная жалоба: <span className="text-red-400">{REPORT_REASONS_MAP[report.report_reason] || report.report_reason}</span>
            </div>
          </div>

          {/* Action Checkboxes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Выберите действия</label>
            <div className="space-y-3">
              {/* 1. Hide Content */}
              {report.entity_type !== 'user' && (
                <button
                  type="button"
                  onClick={() => setShouldHide(!shouldHide)}
                  className={`w-full p-4 rounded-[1.5rem] border text-left text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                    shouldHide
                      ? 'bg-danger/10 border-danger/30 text-danger'
                      : 'bg-white/5 border-transparent text-text-muted hover:border-white/10 hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                      shouldHide ? 'bg-danger border-danger text-white' : 'border-white/20 text-transparent'
                    }`}>
                      <Check size={14} className="stroke-[3]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight text-text-primary">Скрыть контент</span>
                      <span className="text-[10px] text-text-muted">Удалить/скрыть данный объект с платформы</span>
                    </div>
                  </div>
                </button>
              )}

              {/* 2. Warn User */}
              <button
                type="button"
                onClick={() => setShouldWarn(!shouldWarn)}
                className={`w-full p-4 rounded-[1.5rem] border text-left text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                  shouldWarn
                    ? 'bg-warning/10 border-warning/30 text-warning'
                    : 'bg-white/5 border-transparent text-text-muted hover:border-white/10 hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                    shouldWarn ? 'bg-warning border-warning text-white' : 'border-white/20 text-transparent'
                  }`}>
                    <Check size={14} className="stroke-[3]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-tight text-text-primary">Вынести предупреждение</span>
                    <span className="text-[10px] text-text-muted">Инкрементировать warnings_count в профиле автора</span>
                  </div>
                </div>
              </button>

              {/* 3. Ban User */}
              <button
                type="button"
                onClick={() => setShouldBan(!shouldBan)}
                className={`w-full p-4 rounded-[1.5rem] border text-left text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                  shouldBan
                    ? 'bg-danger/20 border-danger/40 text-danger'
                    : 'bg-white/5 border-transparent text-text-muted hover:border-white/10 hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                    shouldBan ? 'bg-danger border-danger text-white shadow-lg shadow-danger/30' : 'border-white/20 text-transparent'
                  }`}>
                    <Check size={14} className="stroke-[3]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-tight text-text-primary">Заблокировать аккаунт (Бан)</span>
                    <span className="text-[10px] text-red-400 font-bold">Полностью заблокировать доступ к аккаунту автора</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Warning Reason Input (if shouldWarn) */}
          {shouldWarn && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Причина предупреждения</label>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Введите описание нарушения..."
                rows={3}
                className="w-full bg-white/5 border border-white/5 focus:border-red-500/50 rounded-2xl p-4 text-sm text-text-primary placeholder:text-text-muted/40 outline-none transition-all resize-none"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all border ${
                      reason === preset 
                        ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                        : 'bg-white/5 border-transparent text-text-muted hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white/[0.02] border-t border-border/40 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleModerate}
            disabled={loading || (shouldWarn && !reason.trim())}
            className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Обработка...' : 'Подтвердить'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const isModerator = profile?.role === 'moderator';
  const availableTabs: Tab[] = isModerator 
    ? ['overview', 'reports', 'logs'] 
    : ['overview', 'reports', 'users', 'finance', 'logs'];

  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [perfLogs, setPerfLogs] = useState<any[]>([]);
  const [timeUnit, setTimeUnit] = useState<'ms' | 'sec' | 'min'>('sec');
  const [financeTimeFilter, setFinanceTimeFilter] = useState<'day'|'week'|'month'|'6months'|'year'>('month');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Enforce access control for non-admin/non-moderator profiles
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role !== 'admin' && profile.role !== 'moderator') {
        toast.error("У вас нет доступа к этой странице");
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, profile, navigate]);

  // Kick moderator back to overview if they try to access forbidden tabs
  useEffect(() => {
    if (isModerator && (activeTab === 'users' || activeTab === 'finance')) {
      setActiveTab('overview');
    }
  }, [isModerator, activeTab]);

  const loadData = async () => {
    if (!user) return;
    try {
      if (activeTab === 'overview') {
        const [statsData, reportsData] = await Promise.all([
          getAdminStats(user.id),
          getAdminReports(user.id)
        ]);
        setStats(statsData);
        setReports(reportsData);
      } else if (activeTab === 'reports') {
        setReports(await getAdminReports(user.id));
      } else if (activeTab === 'users' && !isModerator) {
        setUsersList(await getAdminUsers(user.id));
      } else if (activeTab === 'finance' && !isModerator) {
        setFinance(await getAdminFinance(user.id, financeTimeFilter));
      } else if (activeTab === 'logs') {
        setPerfLogs(await getAdminLogs(user.id));
      }
    } catch (err) {
      toast.error("Ошибка обновления данных");
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [user, activeTab, financeTimeFilter]);

  const handleResolve = async (reportId: string, action: 'dismissed' | 'resolved') => {
    if (!user) return;
    setActionLoading(reportId);
    try {
      await resolveReport(user.id, reportId, action, "Обработано модератором");
      toast.success(action === 'resolved' ? "Жалоба принята" : "Жалоба отклонена");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const [selectedReport, setSelectedReport] = useState<any>(null);

  const handleModerateContent = (report: any) => {
    setSelectedReport(report);
  };

  if (loading && !stats && !usersList.length) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-text-secondary text-lg">Загрузка админ панели...</div>
      </div>
    );
  }

  const COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];
  const trendData = stats?.registrations_trend ? Object.entries(stats.registrations_trend).map(([date, count]) => ({
    date: date.split('-').slice(1).join('.'),
    count
  })) : [];
  const modelData = stats?.generations_by_model ? Object.entries(stats.generations_by_model).map(([name, value]) => ({
    name, value
  })) : [];
  
  const subscriptionsData = finance?.subscriptions_trend ? Object.entries(finance.subscriptions_trend).map(([date, total]) => ({
    date: date.split('-').slice(1).join('.'),
    total
  })) : [];
  
  const creditsData = finance?.credits_trend ? Object.entries(finance.credits_trend).map(([date, total]) => ({
    date: date.split('-').slice(1).join('.'),
    total
  })) : [];

  // Performance data processing
  const timeFactor = timeUnit === 'ms' ? 1 : timeUnit === 'sec' ? 1/1000 : 1/60000;
  const unitLabel = timeUnit === 'ms' ? 'мс' : timeUnit === 'sec' ? 'сек' : 'мин';

  const avgPerfData = perfLogs.length > 0 ? (() => {
    const stages: Record<string, { total: number, count: number }> = {};
    perfLogs.forEach(log => {
      const stage = log.stage;
      if (!stages[stage]) stages[stage] = { total: 0, count: 0 };
      stages[stage].total += log.duration_ms;
      stages[stage].count += 1;
    });
    return Object.entries(stages).map(([name, data]) => ({
      name: name === 'geometry' ? 'Геометрия' : 
            name === 'texture' ? 'Текстуры' : 
            name === 'preprocess' ? 'Препроцессинг' : 
            name === 'export' ? 'Экспорт' : name,
      duration: Math.round((data.total / data.count) * timeFactor * 10) / 10
    }));
  })() : [];

  const modelPerfData = perfLogs.length > 0 ? (() => {
    const models: Record<string, { total: number, count: number }> = {};
    perfLogs.forEach(log => {
      const model = log.ai_model || 'Unknown';
      if (!models[model]) models[model] = { total: 0, count: 0 };
      models[model].total += log.duration_ms;
      models[model].count += 1;
    });
    return Object.entries(models).map(([name, data]) => ({
      name,
      duration: Math.round((data.total / data.count) * timeFactor * 10) / 10
    }));
  })() : [];

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(236,72,153,0.2)]">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tighter italic uppercase leading-none">Админ<span className="text-accent">панель</span></h1>
          </div>
        </div>

        <div className="flex flex-wrap bg-background-surface/50 p-1.5 rounded-[1.5rem] border border-border/40 backdrop-blur-xl shadow-2xl overflow-hidden">
          {availableTabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab 
                  ? 'bg-accent text-white shadow-[0_8px_20px_rgba(236,72,153,0.3)]' 
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {tab === 'overview' && 'Обзор'}
              {tab === 'reports' && 'Жалобы'}
              {tab === 'users' && 'Пользователи'}
              {tab === 'finance' && 'Финансы'}
              {tab === 'logs' && 'Логи'}
              {tab === 'reports' && reports.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-background-surface font-black">
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Всего пользователей', value: stats?.total_users, icon: Users, color: 'text-accent', bg: 'bg-accent/5' },
              { label: 'Моделей в БД', value: stats?.total_models, icon: Box, color: 'text-blue-500', bg: 'bg-blue-500/5' },
              { label: 'Активных жалоб', value: reports.length, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/5' },
              { label: 'Темп роста', value: stats?.total_users > 0 ? `+${Object.keys(stats?.registrations_trend || {}).length}` : '0', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
            ].map((s, i) => (
              <div key={i} className="bg-background-surface border border-border/60 p-8 rounded-[2.5rem] flex items-center gap-6 hover:border-accent/40 transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} rounded-bl-[5rem] opacity-20 group-hover:scale-110 transition-transform`} />
                <div className={`p-5 rounded-3xl ${s.bg} ${s.color} z-10`}>
                  <s.icon size={28} />
                </div>
                <div className="z-10">
                  <div className="text-4xl font-black text-text-primary tabular-nums tracking-tighter">{s.value}</div>
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-background-surface border border-border/60 p-10 rounded-[3rem]">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted mb-10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Динамика роста аудитории
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '24px', fontSize: '12px', fontWeight: '900', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#ec4899' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={5} fillOpacity={1} fill="url(#colorArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background-surface border border-border/60 p-10 rounded-[3rem]">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted mb-10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Распределение AI контента
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelData}>
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '24px' }} />
                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={50}>
                      {modelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-background-surface border border-border/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-border/40">
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Объект</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Детали жалобы</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Автор репорта</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-40 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 animate-bounce">
                            <CheckCircle size={48} />
                          </div>
                          <p className="text-xl font-black text-text-secondary uppercase tracking-tight">Чистота и порядок</p>
                        </div>
                      </td>
                    </tr>
                  ) : reports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            report.entity_type === 'model' ? 'bg-blue-600' : 
                            report.entity_type === 'comment' ? 'bg-orange-600' : 'bg-purple-600'
                          }`}>
                            {report.entity_type === 'model' ? 'Модель' : 
                             report.entity_type === 'comment' ? 'Коммент' : 'Профиль'}
                          </span>
                          <Link 
                            to={report.entity_type === 'model' ? `/models/${report.entity_id}` : 
                                report.entity_type === 'comment' ? `/models/${report.target_model_id || report.entity_id}` : 
                                `/profile/${report.entity_id}`}
                            className="p-1.5 rounded-lg bg-white/5 text-text-muted hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20"
                            title="Открыть объект"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="max-w-[400px]">
                          <p className="text-[10px] text-text-muted mb-1 uppercase font-black tracking-widest flex items-center gap-2">
                            Причина: <span className="text-red-500/80">{REPORT_REASONS_MAP[report.report_reason] || report.report_reason}</span>
                          </p>
                          {report.target_content && (
                            <p className="text-sm text-text-primary font-bold leading-relaxed border-l-2 border-accent/30 pl-3 py-1 bg-white/5 rounded-r-lg italic">
                              "{report.target_content}"
                            </p>
                          )}
                          <p className="text-[9px] text-text-muted mt-2 uppercase font-black tracking-tighter opacity-50">
                            {new Date(report.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-accent font-black overflow-hidden border border-white/5">
                            {report.reporter_avatar ? (
                              <img src={report.reporter_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              report.reporter_name?.[0].toUpperCase()
                            )}
                          </div>
                          <Link to={`/profile/${report.user_id}`} className="text-sm font-black text-text-primary hover:text-accent transition-colors">@{report.reporter_name}</Link>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleResolve(report.id, 'dismissed')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest"
                            title="Отклонить жалобу"
                          >
                            <CheckCircle size={14} />
                            <span>Отклонить</span>
                          </button>
                          <button 
                            onClick={() => handleModerateContent(report)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20 text-[10px] font-black uppercase tracking-widest"
                            title="Применить меры"
                          >
                            <ShieldAlert size={14} />
                            <span>Меры</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && !isModerator && (
        <div className="animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-background-surface border border-border/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-border/40">
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Пользователь</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Роль</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Статус</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Предупреждения</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Регистрация</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center font-black text-text-primary uppercase tracking-tighter overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.username?.[0] || 'A'
                            )}
                          </div>
                          <div>
                            <Link to={`/profile/${u.id}`} className="text-sm font-black text-text-primary uppercase tracking-tight italic hover:text-accent transition-colors block">@{u.username}</Link>
                            <p className="text-[10px] text-text-muted font-bold tracking-widest">{u.display_name || u.id.slice(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
                          u.role === 'admin' ? 'bg-red-600 text-white shadow-red-600/20' : 
                          u.role === 'moderator' ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-background-secondary text-text-primary'
                        }`}>
                          {u.role === 'admin' ? 'Админ' : u.role === 'moderator' ? 'Модер' : 'Пользователь'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${u.status === 'banned' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">
                            {u.status === 'banned' ? 'Заблокирован' : 'Активен'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={14} className={u.warnings_count > 0 ? 'text-orange-500' : 'text-text-muted'} />
                          <span className="text-sm font-black text-text-primary">{u.warnings_count} / 3</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Calendar size={12} />
                          <span className="text-[11px] font-bold">{new Date(u.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-text-muted hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20 text-[10px] font-black uppercase tracking-widest"
                          title="Управление пользователем"
                        >
                          <Settings2 size={16} />
                          <span>Управление</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && !isModerator && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          <div className="flex justify-between items-center bg-background-surface border border-border/60 p-4 rounded-3xl">
            <h3 className="font-black text-[12px] uppercase tracking-[0.3em] text-text-muted ml-4 flex items-center gap-3">
              <RussianRuble size={16} className="text-accent" />
              Финансовая аналитика
            </h3>
            <div className="flex bg-background-secondary/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
              {(['day', 'week', 'month', '6months', 'year'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setFinanceTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                    financeTimeFilter === filter ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {filter === 'day' ? 'День' : filter === 'week' ? 'Неделя' : filter === 'month' ? 'Месяц' : filter === '6months' ? '6 мес' : 'Год'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-background-surface border border-border/60 p-10 rounded-[3rem] relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <RussianRuble size={120} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-4">Общая выручка</div>
                <div className="text-7xl font-black text-text-primary tracking-tighter tabular-nums flex items-baseline gap-4 italic">
                  {finance?.total_revenue?.toLocaleString()} 
                  <span className="text-2xl text-accent not-italic">RUB</span>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="text-[9px] uppercase tracking-widest text-text-muted mb-2">Pro подписки</div>
                  <div className="text-2xl font-bold">{finance?.plan_breakdown?.pro || 0}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="text-[9px] uppercase tracking-widest text-text-muted mb-2">Studio подписки</div>
                  <div className="text-2xl font-bold">{finance?.plan_breakdown?.studio || 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-background-surface border border-border/60 p-10 rounded-[3rem]">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted mb-10 flex items-center gap-3">
                <TrendingUp size={16} className="text-emerald-500" />
                Выручка с подписок
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subscriptionsData}>
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '24px' }} />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background-surface border border-border/60 p-10 rounded-[3rem] md:col-span-2">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted mb-10 flex items-center gap-3">
                <Clock size={16} className="text-blue-500" />
                Выручка с покупки кредитов
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creditsData}>
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '24px' }} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          {/* Performance Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-background-surface border border-border/60 p-8 rounded-[3rem]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted flex items-center gap-3">
                  <Clock size={16} className="text-accent" />
                  Производительность пайплайна
                </h3>
                <div className="flex bg-background-secondary/50 p-1 rounded-xl border border-white/5">
                  {(['ms', 'sec', 'min'] as const).map(unit => (
                    <button
                      key={unit}
                      onClick={() => setTimeUnit(unit)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                        timeUnit === unit ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {unit === 'ms' ? 'мс' : unit === 'sec' ? 'сек' : 'мин'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={avgPerfData} layout="vertical">
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                    <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} unit={unitLabel} />
                    <YAxis type="category" dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} width={100} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '20px', fontSize: '11px', fontWeight: '900' }}
                    />
                    <Bar dataKey="duration" name="Среднее время" radius={[0, 10, 10, 0]} barSize={30}>
                      {avgPerfData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background-surface border border-border/60 p-8 rounded-[3rem]">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted mb-8 flex items-center gap-3">
                <Cpu size={16} className="text-blue-500" />
                Скорость по моделям
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelPerfData}>
                    <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} unit={unitLabel} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '20px' }} />
                    <Bar dataKey="duration" name="Время" radius={[10, 10, 0, 0]} barSize={40}>
                      {modelPerfData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-background-surface border border-border/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="p-8 border-b border-border/40 flex justify-between items-center">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted flex items-center gap-3">
                <ScrollText size={16} className="text-accent" />
                Детальный лог операций
              </h3>
              <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-4 py-2 rounded-full">
                Последние 100 записей
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-border/40">
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Модель</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Этап</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Время ({unitLabel})</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Статус</th>
                    <th className="px-10 py-7 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Время лога</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {perfLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-white/[0.01] transition-colors group font-mono text-[11px]">
                      <td className="px-10 py-6">
                        <span className="text-blue-400 font-bold uppercase tracking-tight">{log.ai_model || 'Hunyuan3D'}</span>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-text-primary font-black uppercase">
                          {log.stage === 'geometry' ? 'Геометрия' : 
                           log.stage === 'texture' ? 'Текстуры' : 
                           log.stage === 'preprocess' ? 'Препроцессинг' : 
                           log.stage === 'rigging' ? 'Риггинг' : 
                           log.stage === 'export' ? 'Экспорт' : log.stage}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`font-black ${log.duration_ms > 300000 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {Math.round(log.duration_ms * timeFactor * 100) / 100}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-lg font-black uppercase text-[9px] ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {log.status === 'success' ? 'Успех' : 'Ошибка'}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-text-muted">
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User & Moderation Modals */}
      <AnimatePresence>
        {selectedUser && (
          <UserManagementModal 
            user={selectedUser} 
            adminId={user!.id}
            onClose={() => setSelectedUser(null)}
            onUpdate={loadData}
          />
        )}
        {selectedReport && (
          <ModerationModal 
            report={selectedReport} 
            adminId={user!.id}
            onClose={() => setSelectedReport(null)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
