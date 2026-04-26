import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Upload, Settings, Activity } from 'lucide-react';
import { ScanningGrid } from './ScanningGrid';

const STEPS = [
  {
    icon: <Upload className="w-5 h-5" />,
    title: 'Загрузите фото',
    description: 'которое хотите превратить в 3D-модель. Это может быть фото человека, животного, предмета или любого другого объекта.  '
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: 'Настройте',
    description: 'качество генерации. Выберите стиль, детализацию и другие параметры, чтобы получить идеальный результат.'
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: 'Отслеживайте',
    description: 'процесс генерации в реальном времени. Получайте уведомления о готовности и скачивайте результат.'
  }
];

interface ProcessCardProps {
  step: typeof STEPS[0];
  index: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (index: number | null) => void;
}

function ProcessCard({ step, index, isHovered, isAnyHovered, onHover }: ProcessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15]);

  const focusProgress = useMotionValue(0);

  const focusSpring = useSpring(focusProgress, { stiffness: 200, damping: 30 });
  

  const blurProgress = useTransform(focusSpring, [0, 1], [0, 1], { clamp: true });
  const blurValue = useTransform(blurProgress, [0, 1], [isAnyHovered && !isHovered ? 8 : 0, 0]);
  const filterValue = useTransform(blurValue, (v) => `blur(${v}px)`);
  
  const opacityValue = useTransform(focusSpring, [0, 1], [isAnyHovered && !isHovered ? 0.3 : 1, 1]);
  const scaleValue = useTransform(focusSpring, [0, 1], [isAnyHovered && !isHovered ? 0.95 : 1, isHovered ? 1.06 : 1]);

  React.useEffect(() => {
    // 1 is "focused/active", 0 is "blurred/inactive"
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
    <div
      className="relative h-full"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={handleMouseLeave}
        initial={false}
        style={{
          rotateX,
          rotateY,
          filter: filterValue,
          opacity: opacityValue,
          scale: scaleValue,
          transformStyle: "preserve-3d",
        }}
        className={`group relative p-8 rounded-[32px] bg-background-secondary border border-border-default
          cursor-pointer transition-colors duration-500 overflow-visible h-full flex flex-col
          ${isHovered ? 'z-30 border-accent/40 shadow-glass' : 'z-10'}
        `}
      >
        {/* 3D Content Layer - Pushed Deep Forward */}
        <div 
          style={{ 
            transform: "translateZ(100px)", 
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden"
          }} 
          className="relative z-10 pointer-events-none"
        >
          <div className="w-14 h-14 rounded-[16px] bg-background-surface border border-border-default flex items-center justify-center text-text-primary mb-8 transition-all duration-500 group-hover:bg-accent group-hover:text-white group-hover:shadow-[0_0_40px_rgba(236,72,153,0.5)]">
            {step.icon}
          </div>
          <h3 className="font-tight text-[26px] font-medium tracking-[-1px] mb-4 group-hover:text-accent transition-colors duration-500">
            {step.title}
          </h3>
          <p className="text-[16px] font-light text-text-tertiary leading-[1.6]">
            {step.description}
          </p>
        </div>

        {/* 3D Background Glow - Floating Mid-air */}
        <div 
          style={{ transform: "translateZ(40px)" }}
          className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-[32px] pointer-events-none" 
        />
        
        {/* 3D Border Highlight - Pushed Forward */}
        <div 
          style={{ transform: "translateZ(60px)" }}
          className="absolute -inset-[1px] border-2 border-accent/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
        />

        {/* Deep Shadow layer to anchor the card and give volume */}
        <div 
          style={{ transform: "translateZ(-30px)" }}
          className="absolute inset-0 rounded-[32px] bg-black/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
        />
      </motion.div>
    </div>
  );
}

/**
 * Section describing the step-by-step process of using the platform.
 */
export function ProcessSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
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
    <section className="py-[150px] lg:py-[250px] px-6 lg:px-10 relative overflow-hidden" id="process">
      <ScanningGrid />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-mono text-[12px] font-normal text-text-muted tracking-[1px] flex items-center gap-3 mb-16 before:content-[''] before:w-8 before:h-px before:bg-accent/30 uppercase"
        >
          Процесс
        </motion.div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10"
        >
          {STEPS.map((step, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <ProcessCard 
                step={step} 
                index={index}
                isHovered={hoveredIndex === index}
                isAnyHovered={hoveredIndex !== null}
                onHover={setHoveredIndex}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
