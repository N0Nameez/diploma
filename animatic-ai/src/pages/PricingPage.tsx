import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type Variants } from 'framer-motion';
import { Check, Zap, Gem, CreditCard, Loader2, ShieldCheck, Sparkles, Star, ArrowRight, Crown, X, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/services/api';
import { Button } from '@/components/Button';

const SUBSCRIPTIONS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '0',
    description: 'Идеально для знакомства с возможностями ИИ.',
    features: [
      '15 генераций в месяц',
      'Базовое качество моделей',
      'Экспорт в GLB',
      'Доступ к сообществу'
    ],
    cta: 'Бесплатный старт',
    popular: false,
    disabled: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 490',
    credits: 300,
    description: 'Для профессиональных создателей контента.',
    features: [
      '300 кредитов ежемесячно',
      'High-poly модели (4K текстуры)',
      'Анимация из видео (AI Motion)',
      'Экспорт во всех форматах',
      'Приоритетная поддержка'
    ],
    cta: 'Попробовать Pro',
    popular: true
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '9 990',
    credits: 1500,
    description: 'Индивидуальные решения для крупных студий.',
    features: [
      '1500 кредитов ежемесячно',
      'Собственные AI-модели',
      'API доступ',
      'Персональный менеджер',
      'Кастомные интеграции'
    ],
    cta: 'Связаться с нами',
    popular: false,
    contactOnly: true
  }
];

const CREDIT_PACKS = [
  { id: 'small', credits: 50, price: '99', label: '50 Кредитов', description: 'Идеально для разового проекта', features: ['Без срока действия', 'Доступ ко всем моделям'] },
  { id: 'medium', credits: 200, price: '299', label: '200 Кредитов', description: 'Для активного творчества', popular: true, features: ['Без срока действия', 'Приоритетная генерация'] },
  { id: 'large', credits: 1000, price: '999', label: '1000 Кредитов', description: 'Лучшая цена за кредит', features: ['Без срока действия', 'Безлимитный экспорт'] },
];

interface PricingCardProps {
  plan: any;
  index: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (index: number | null) => void;
  onAction: (plan: any) => void;
  icon?: any;
  isSubscription?: boolean;
  loading?: string | null;
}

function PricingCard({ 
  plan, 
  index, 
  isHovered, 
  isAnyHovered, 
  onHover, 
  onAction, 
  icon: Icon, 
  isSubscription = true, 
  loading 
}: PricingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

  const focusProgress = useMotionValue(0);
  const focusSpring = useSpring(focusProgress, { stiffness: 200, damping: 30 });
  
  const blurProgress = useTransform(focusSpring, [0, 1], [0, 1], { clamp: true });
  const blurValue = useTransform(blurProgress, [0, 1], [isAnyHovered && !isHovered ? 4 : 0, 0]);
  const filterValue = useTransform(blurValue, (v) => `blur(${v}px)`);
  
  const opacityValue = useTransform(focusSpring, [0, 1], [isAnyHovered && !isHovered ? 0.4 : 1, 1]);
  const scaleValue = useTransform(focusSpring, [0, 1], [isAnyHovered && !isHovered ? 0.96 : 1, isHovered ? 1.04 : 1]);

  useEffect(() => {
    focusProgress.set(isHovered || !isAnyHovered ? 1 : 0);
  }, [isHovered, isAnyHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    onHover(null);
  };

  const isPopular = plan.popular;

  return (
    <div className="relative h-full" style={{ perspective: "1200px" }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={handleMouseLeave}
        style={{ 
          rotateX, 
          rotateY, 
          filter: filterValue,
          opacity: opacityValue,
          scale: scaleValue,
          transformStyle: "preserve-3d" 
        }}
        className={`relative p-10 rounded-[40px] border transition-colors duration-500 h-full flex flex-col group cursor-default ${
          isPopular 
            ? 'bg-background-surface border-accent/40 shadow-[0_20px_60px_rgba(236,72,153,0.1)]' 
            : 'bg-background-secondary border-border/50'
        } ${isHovered ? 'z-30 border-accent/40' : 'z-10'}`}
      >
        {isPopular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-20 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Популярный
          </div>
        )}

        <div style={{ transform: "translateZ(60px)", transformStyle: "preserve-3d" }} className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className={`p-3 rounded-2xl ${isPopular ? "bg-accent/10 text-accent" : "bg-background-primary text-text-secondary"}`}>
              {Icon ? <Icon className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </div>
          </div>

          <h3 className="font-tight text-[24px] font-medium mb-1 text-text group-hover:text-accent transition-colors">
            {plan.name || plan.label || `${plan.credits} Кредитов`}
          </h3>
          {!isSubscription && (
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 opacity-80">
              Единоразовый пакет
            </p>
          )}
          
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[44px] font-tight font-medium text-text">
              {plan.price !== 'По запросу' ? '₽' : ''}{plan.price}
            </span>
            {isSubscription && plan.price !== 'По запросу' && <span className="text-text-muted text-[16px]">/мес</span>}
          </div>
          
          <p className="text-text-secondary text-[14px] leading-relaxed font-light mb-8 h-10">
            {plan.description}
          </p>
          
          <div className="flex-grow space-y-4 mb-10">
            {(plan.features || []).map((f: string) => (
              <div key={f} className="flex items-start gap-3 group/feature">
                <div className="mt-1 p-0.5 rounded-full bg-accent/10 text-accent group-hover/feature:bg-accent group-hover/feature:text-white transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-[14px] font-light text-text-secondary group-hover:text-text transition-colors">{f}</span>
              </div>
            ))}
          </div>

          <div style={{ transform: "translateZ(20px)" }}>
            <Button
              variant={isPopular ? 'hero-primary' : 'hero-secondary'}
              label={plan.isCurrent ? 'Текущий план' : (loading === (plan.id || plan.label) ? '' : (plan.cta || (plan.name ? 'Выбрать' : 'Купить')))}
              icon={plan.isCurrent ? <ShieldCheck className="w-4 h-4" /> : (loading === (plan.id || plan.label) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />)}
              className="w-full justify-center py-4"
              onClick={() => onAction(plan)}
              disabled={plan.disabled || plan.isCurrent || loading === (plan.id || plan.label)}
            />
          </div>
        </div>

        {/* 3D Background Glow */}
        <div 
          style={{ transform: "translateZ(20px)" }}
          className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-[40px] pointer-events-none" 
        />

        {/* Shine reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[40px]" />
      </motion.div>
    </div>
  );
}

export function PricingPage({ onAuthClick }: { onAuthClick?: () => void }) {
  const { user, profile, signOut } = useAuth();
  const [tab, setTab] = useState<'subs' | 'credits'>('subs');
  const [loading, setLoading] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    },
  };

  const NAV_LINKS = [
    { label: 'Каталог', href: '/catalog' },
    { label: 'Генерация', href: '/generate' },
    { label: 'Тарифы', href: '/pricing' },
  ];

  const handleAction = async (pkg: any) => {
    if (!user) {
      if (onAuthClick) onAuthClick();
      return;
    }
    
    if (pkg.contactOnly) {
      setShowContact(true);
      return;
    }

    setLoading(pkg.id || pkg.label);
    try {
      const response = await fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          amount: pkg.price.toString().replace(/\s/g, ''),
          credits_amount: pkg.credits || pkg.credits_amount || 0,
          plan_id: pkg.id,
          description: `Оплата: ${pkg.name || pkg.label} (AnimaticAI)`
        })
      });

      const data = await response.json();
      if (data.success && data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      alert('Не удалось связаться с сервером оплаты');
    } finally {
      setLoading(null);
    }
  };

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading('contact');
    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          message: contactMessage,
          plan_id: 'studio'
        })
      });
      if (response.ok) {
        setContactSuccess(true);
        setTimeout(() => {
          setShowContact(false);
          setContactSuccess(false);
          setContactMessage('');
        }, 3000);
      }
    } catch (err) {
      alert('Ошибка при отправке сообщения');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary pt-32 pb-20 px-6 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Тарифные планы
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-7xl font-extrabold text-text tracking-tighter mb-6 leading-[0.9]"
          >
            Выберите свой <br />
            <span className="text-accent italic font-light">уровень</span> возможностей
          </motion.h1>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-16">
          <div className="p-1 bg-background-secondary border border-border rounded-2xl flex gap-1">
            <button
              onClick={() => setTab('subs')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                tab === 'subs' ? 'bg-background-surface text-text shadow-lg border border-border' : 'text-text-muted hover:text-text'
              }`}
            >
              <Zap className="w-4 h-4" />
              Подписки
            </button>
            <button
              onClick={() => setTab('credits')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                tab === 'credits' ? 'bg-background-surface text-text shadow-lg border border-border' : 'text-text-muted hover:text-text'
              }`}
            >
              <Gem className="w-4 h-4" />
              Кредиты
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {tab === 'subs' ? (
              SUBSCRIPTIONS.map((item, index) => {
                const currentStatus = profile?.subscription_status || 'starter';
                const isCurrent = item.id.toLowerCase() === currentStatus.toLowerCase() || (item.id === 'starter' && currentStatus.toLowerCase() === 'free');
                
                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <PricingCard 
                      index={index}
                      isHovered={hoveredIndex === index}
                      isAnyHovered={hoveredIndex !== null}
                      onHover={setHoveredIndex}
                      plan={{ ...item, isCurrent }} 
                      icon={item.id === 'pro' ? Crown : (item.id === 'studio' ? Mail : CreditCard)}
                      onAction={handleAction} 
                      loading={loading} 
                    />
                  </motion.div>
                );
              })
            ) : (
              CREDIT_PACKS.map((item, index) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <PricingCard 
                    index={index + 10} // Offset for unique index
                    isHovered={hoveredIndex === index + 10}
                    isAnyHovered={hoveredIndex !== null}
                    onHover={setHoveredIndex}
                    plan={item} 
                    isSubscription={false}
                    icon={Zap}
                    onAction={handleAction} 
                    loading={loading} 
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Security Info */}
        <div className="mt-24 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 border-t border-border pt-12">
          <div className="flex items-center gap-4 text-text-secondary">
            <ShieldCheck className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <div className="text-sm font-bold text-text">Безопасность</div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest">TLS Encryption & Fraud Protection</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-text-secondary">
            <CreditCard className="w-8 h-8 text-accent" />
            <div className="text-left">
              <div className="text-sm font-bold text-text">ЮKassa</div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest">Все виды карт и СБП</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContact && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowContact(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-[450px] bg-background-surface border border-border rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => setShowContact(false)} className="absolute top-5 right-5 text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl font-black text-text mb-2">Заявка на Studio</h2>
                <p className="text-sm text-text-secondary">Мы свяжемся с вами в течение 24 часов для обсуждения деталей</p>
              </div>

              {contactSuccess ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                  <div className="text-green-500 font-bold mb-2">✅ Сообщение отправлено!</div>
                  <div className="text-xs text-text-muted">Проверьте вашу почту {user?.email} в ближайшее время</div>
                </motion.div>
              ) : (
                <form onSubmit={handleSendContact} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Ваше сообщение</label>
                    <textarea
                      required
                      placeholder="Опишите ваши задачи или задайте вопрос..."
                      className="w-full bg-background-secondary border border-border rounded-xl p-4 text-sm text-text outline-none focus:border-accent min-h-[120px] transition-all"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading === 'contact'}
                    className="w-full py-4 bg-accent text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {loading === 'contact' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отправить запрос'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
