import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Pricing section with interactive 3D pricing cards.
 * Each card rotates based on mouse position.
 */

const PLANS = [
  {
    name: 'Starter',
    price: '0',
    description: 'Идеально для знакомства с возможностями ИИ.',
    features: [
      '5 генераций в месяц',
      'Базовое качество моделей',
      'Экспорт в GLB',
      'Доступ к сообществу'
    ],
    cta: 'Начать бесплатно',
    popular: false
  },
  {
    name: 'Pro',
    price: '2 490',
    description: 'Для профессиональных создателей контента.',
    features: [
      'Безлимитные генерации',
      'High-poly модели (4K текстуры)',
      'Анимация из видео (AI Motion)',
      'Экспорт во всех форматах',
      'Приоритетная поддержка'
    ],
    cta: 'Попробовать Pro',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'По запросу',
    description: 'Индивидуальные решения для крупных студий.',
    features: [
      'Собственные AI-модели',
      'API доступ',
      'Персональный менеджер',
      'SLA и безопасность',
      'Кастомные интеграции'
    ],
    cta: 'Связаться с нами',
    popular: false
  }
];

interface PricingCardProps {
  plan: typeof PLANS[0];
  index: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (index: number | null) => void;
  onRegisterClick: () => void;
}

function PricingCard({ plan, index, isHovered, isAnyHovered, onHover, onRegisterClick }: PricingCardProps) {
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

  React.useEffect(() => {
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
          transformStyle: "preserve-3d",
        }}
        className={`relative p-10 rounded-[40px] border transition-colors duration-500 overflow-visible h-full flex flex-col cursor-default
          ${plan.popular 
            ? 'bg-background-surface border-accent/40 shadow-[0_20px_60px_rgba(236,72,153,0.1)]' 
            : 'bg-background-secondary border-border/50'}
          ${isHovered ? 'z-30 border-accent/40' : 'z-10'}
        `}
      >
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-text-primary px-4 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 z-20 shadow-lg shadow-accent/20">
            <Zap className="w-3 h-3 fill-current" />
            Популярный выбор
          </div>
        )}

        <div style={{ transform: "translateZ(60px)", transformStyle: "preserve-3d" }} className="relative z-10 flex flex-col h-full">
          <div className="mb-8">
            <h3 className="font-tight text-[24px] font-medium mb-2 text-text-primary group-hover:text-accent transition-colors">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-[44px] font-tight font-medium text-text-primary">
                {plan.price !== 'По запросу' ? '₽' : ''}{plan.price}
              </span>
              {plan.price !== 'По запросу' && (
                <span className="text-text-muted text-[16px]">/мес</span>
              )}
            </div>
            <p className="text-text-tertiary text-[14px] leading-relaxed font-light">
              {plan.description}
            </p>
          </div>

          <div className="flex-grow space-y-4 mb-10">
            {plan.features.map((feature, fIndex) => (
              <div key={feature} className="flex items-start gap-3 group/feature">
                <div className="mt-1 p-0.5 rounded-full bg-accent/10 text-accent group-hover/feature:bg-accent group-hover/feature:text-white transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-[14px] font-light text-text-secondary group-hover:text-text-primary transition-colors">{feature}</span>
              </div>
            ))}
          </div>

          <div style={{ transform: "translateZ(20px)" }}>
            <Button
              variant={plan.popular ? 'hero-primary' : 'hero-secondary'}
              label={plan.cta}
              className="w-full justify-center py-4"
              onClick={onRegisterClick}
            />
          </div>
        </div>

        {/* 3D Background Glow */}
        <div 
          style={{ transform: "translateZ(20px)" }}
          className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-[40px] pointer-events-none" 
        />
        
        {/* Shine reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-text-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[40px]" />
      </motion.div>
    </div>
  );
}

export function PricingSection({ onRegisterClick }: { onRegisterClick: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleAction = () => {
    if (user) {
      navigate('/pricing');
    } else {
      onRegisterClick();
    }
  };

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

  return (
    <section className="py-[150px] lg:py-[250px] px-6 lg:px-10 relative overflow-hidden bg-background-primary" id="pricing">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[12px] font-normal text-text-muted tracking-[1px] flex items-center gap-3 mb-10 before:content-[''] before:w-8 before:h-px before:bg-accent/30 uppercase"
          >
            Тарифные планы
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-7xl font-medium text-text-primary tracking-tighter leading-[0.9] mb-8"
          >
            Выберите свой <br />
            <span className="text-accent italic font-light">уровень</span> возможностей
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-text-tertiary text-lg max-w-[600px] font-light leading-relaxed"
          >
            Начните бесплатно и масштабируйтесь по мере роста ваших проектов. Никаких скрытых платежей.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10"
        >
          {PLANS.map((plan, index) => (
            <motion.div key={plan.name} variants={itemVariants}>
              <PricingCard 
                plan={plan} 
                index={index}
                isHovered={hoveredIndex === index}
                isAnyHovered={hoveredIndex !== null}
                onHover={setHoveredIndex}
                onRegisterClick={handleAction}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center text-[13px] text-text-muted font-mono uppercase tracking-[1px] flex items-center justify-center gap-4 before:h-px before:flex-grow before:bg-border after:h-px after:flex-grow after:bg-border"
        >
          Безопасные платежи через <span className="text-text-secondary">ЮKassa Sandbox</span>
        </motion.div>
      </div>
    </section>
  );
}

