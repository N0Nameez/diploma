import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  Heart, 
  Bookmark, 
  User, 
  MessageSquare, 
  Reply, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotification, 
  type ApiNotification 
} from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

export function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent && notifications.length === 0) setLoading(true);
      const res = await fetchNotifications(user.id);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, notifications.length]);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const handleSync = () => loadNotifications(true);
      window.addEventListener('notifications-updated', handleSync);

      // Realtime subscription
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            loadNotifications(true);
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('notifications-updated', handleSync);
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifyChange = () => {
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  };

  const handleMarkRead = async (id: string) => {
    if (!user) return;
    try {
      await markNotificationRead(id, user.id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      notifyChange();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      notifyChange();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    try {
      await deleteNotification(id, user.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const n = notifications.find(noti => noti.id === id);
      if (n && !n.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      notifyChange();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-accent fill-accent/10" />;
      case 'favorite': return <Bookmark className="w-4 h-4 text-warning fill-warning/10" />;
      case 'follower': return <User className="w-4 h-4 text-blue-400" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-accent2" />;
      case 'reply': return <Reply className="w-4 h-4 text-accent2" />;
      case 'generation_complete': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'generation_error': return <XCircle className="w-4 h-4 text-danger" />;
      case 'generation_started': return <Zap className="w-4 h-4 text-warning" />;
      case 'subscription_expiring': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Bell className="w-4 h-4 text-accent" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 border border-border rounded-[10px] flex items-center justify-center transition-all duration-200 text-text-secondary hover:bg-background-surface hover:text-accent hover:border-accent relative"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 z-50"
          >
            <div 
              className="bg-background-glass backdrop-blur-3xl border border-border-glass rounded-[28px] shadow-2xl overflow-hidden isolate"
            >
              <div className="p-5 border-b border-border-glass bg-white/5 flex items-center justify-between">
                <h3 className="font-bold text-lg text-text-primary">Уведомления</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1 font-bold"
                  >
                    <Check className="w-3 h-3" />
                    Прочитать все
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">Загрузка...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <Bell className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
                    <p className="text-text-secondary">У вас пока нет уведомлений</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-glass">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        to={n.link_url || '#'}
                        onClick={() => {
                          handleMarkRead(n.id);
                          setIsOpen(false);
                        }}
                        className={`block p-5 hover:bg-white/5 transition-colors relative group ${!n.is_read ? 'bg-accent/5' : ''}`}
                      >
                        {!n.is_read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
                        )}
                        <div className="flex gap-4">
                          <div className="w-9 h-9 rounded-xl bg-background-surface border border-border-glass flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-white/5">
                            {getTypeIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.is_read ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-text-muted mt-2 font-medium">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ru })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDelete(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-500 transition-all rounded-lg hover:bg-white/5 flex-shrink-0 h-fit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border-glass bg-white/[0.02]">
                <Link
                  to="/profile?tab=notifications"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-sm font-bold text-text-secondary hover:text-accent transition-colors py-1"
                >
                  Показать все
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
