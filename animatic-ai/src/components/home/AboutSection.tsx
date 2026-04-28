import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { SideRobot } from './SideRobot';

/**
 * AboutSection component that introduces the project with side-scrolling robot visuals.
 */
export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress: sectionProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const { scrollYProgress: textProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "start 0.2"]
  });

  const smoothProgress = useSpring(textProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const paragraph = "AnimaticAI — это инновационная платформа, объединяющая возможности генеративного ИИ и профессиональные инструменты для работы с 3D. Мы создаем экосистему, где любой дизайнер, разработчик или художник может воплотить свои идеи в объем за считанные минуты.";
  const words = paragraph.split(" ");

  return (
    <section 
      ref={sectionRef}
      className="relative py-32 lg:py-60 overflow-hidden bg-background-primary" 
      id="about"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Side Models */}
      <SideRobot 
        side="left" 
        modelPath="/models/blot_draco.glb" 
        progress={sectionProgress}
      />
      <SideRobot 
        side="right" 
        modelPath="/models/heart_draco.glb" 
        progress={sectionProgress}
      />

      <div className="container mx-auto px-10 relative z-10">
        <div className="max-w-[800px] mx-auto text-center" ref={containerRef}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[12px] font-normal text-accent tracking-[2px] uppercase mb-8"
          >
            About us
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-tight text-[clamp(40px,6vw,80px)] font-medium leading-[1.1] tracking-[-2px] mb-12 text-text-primary"
          >
            Будущее 3D-графики<br />
            <span className="text-accent">в ваших руках</span>
          </motion.h2>
          
          <div className="text-lg lg:text-3xl font-light text-text-tertiary leading-relaxed mb-16 flex flex-wrap justify-center">
            {words.map((word, i) => {
              const start = i / words.length;
              const end = start + (1 / words.length);
              return (
                <Word key={i} progress={smoothProgress} range={[start, end]}>
                  {word}
                </Word>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left pt-12 border-t border-border">
            {[
              { label: 'Скорость', value: '10x', desc: 'Ускорение рабочего процесса' },
              { label: 'Инновации', value: 'ИИ', desc: 'Собственные ИИ-алгоритмы' },
              { label: 'Доступность', value: 'Везде', desc: 'Работает в облаке 24/7' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">{stat.label}</div>
                <div className="font-tight text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-[#EC4899] to-[#7C3AED] mb-1">{stat.value}</div>
                <div className="text-sm text-text-tertiary font-light">{stat.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface WordProps {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}

function Word({ children, progress, range }: WordProps) {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-1 lg:mx-1.5 inline-block">
      <motion.span style={{ opacity }} className="text-text-primary">
        {children}
      </motion.span>
    </span>
  );
}
