import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getPlatformStats } from "@/services/api";
import { Canvas } from "@react-three/fiber";
import { SakuraModel } from "@/components/home/SakuraModel";
import CursorGlow from "@/components/CursorGlow";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Counter } from "@/components/Counter";
import { BackgroundParticles } from "@/components/home/BackgroundParticles";
import { Magnetic } from "@/components/Magnetic";
import { Button } from "@/components/Button";
import { ArrowRight } from "lucide-react";

const LEAVES = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  animationDurationFall: `${10 + Math.random() * 15}s`,
  animationDelayFall: `-${Math.random() * 20}s`,
  animationDurationSway: `${3 + Math.random() * 4}s`,
  animationDelaySway: `-${Math.random() * 5}s`,
  size: `${1 + Math.random() * 12}px`,
}));

interface HeroProps {
  onRegisterClick: () => void;
  user: User | null;
  hideCanvas?: boolean;
}

/**
 * Hero section for the landing page with 3D background and animated statistics.
 */
export function Hero({ onRegisterClick, user, hideCanvas = false }: HeroProps) {
  const [stats, setStats] = useState<{ models?: number; animations?: number; authors?: number }>({});

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const data = await getPlatformStats();
        if (!canceled) setStats(data);
      } catch (e) {
      }
    })();
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getPlatformStats();
        setStats(data);
      } catch (e) {
      }
    }, 3600000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    },
  };

  const titleLineVariants: Variants = {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
    },
  };

  return (
    <section className={`min-h-screen relative flex flex-col justify-end overflow-hidden pt-40 pb-16 lg:pt-0 lg:pb-20 ${hideCanvas ? 'bg-transparent' : 'bg-background-primary'}`}>
      {!hideCanvas && (
        <>
          <CursorGlow />
          <BackgroundParticles />

          {/* Grid Overlay */}
          <div className="absolute inset-0 z-0 opacity-50 pointer-events-none bg-[linear-gradient(var(--grid-color)_1px,transparent_1px),linear-gradient(90deg,var(--grid-color)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)]" />

          {/* 3D Background */}
          <div className="absolute inset-0 z-0 blur-[0.5px]">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }} eventSource={document.body} eventPrefix="client">
              <ambientLight intensity={2} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} />
              <directionalLight position={[-10, -10, -5]} intensity={1} color="#EC4899" />
              <SakuraModel />
            </Canvas>
          </div>

          {/* Falling Leaves overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden blur-[3px]">
            {LEAVES.map((leaf) => (
              <div
                key={leaf.id}
                className="absolute -top-10 animate-leaf-fall"
                style={{
                  left: leaf.left,
                  animationDuration: leaf.animationDurationFall,
                  animationDelay: leaf.animationDelayFall,
                }}
              >
                <div
                  className="animate-leaf-sway rounded-full opacity-70"
                  style={{
                    width: leaf.size,
                    height: leaf.size,
                    backgroundColor: '#ffb7c5',
                    boxShadow: '0 0 10px rgba(255, 183, 197, 0.5)',
                    animationDuration: leaf.animationDurationSway,
                    animationDelay: leaf.animationDelaySway,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Hero overlay for contrast */}
          <div className="absolute inset-0 bg-overlay-gradient pointer-events-none z-0" />

          {/* Bottom fog fade */}
          <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background-primary via-background-primary/80 to-transparent pointer-events-none z-0" />
        </>
      )}

      {/* Hero Content */}
      <motion.div
        className="relative z-10 w-full max-w-[1280px] mx-auto px-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-mono text-[12px] font-normal text-text-muted tracking-[1px] flex items-center gap-3 mb-16 before:content-[''] before:w-8 before:h-px before:bg-accent/30 uppercase"
        >
          ИИ-платформа для создания 3D-моделей
        </motion.div>

        <h1 className="font-tight text-[clamp(40px,8vw,88px)] font-medium leading-[1.05] tracking-[-1px] lg:tracking-[-2.5px] mb-12 max-w-[900px]">
          <span className="block overflow-hidden">
            <motion.span variants={titleLineVariants} className="block">Создавайте 3D,</motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span variants={titleLineVariants} className="block">оживляйте их</motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span variants={titleLineVariants} className="block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">при помощи ИИ</span>
            </motion.span>
          </span>
        </h1>

        <motion.div variants={itemVariants} className="mb-16 lg:mb-24">
          <Magnetic strength={0.1}>
            <Button
              label="Попробовать бесплатно"
              onClick={onRegisterClick}
              variant="hero-primary"
              icon={<ArrowRight className="w-5 h-5 ml-2" />}
              className="rounded-full px-8 py-6 text-lg"
            />
          </Magnetic>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 lg:flex gap-4 lg:gap-16 mt-12 lg:mt-0 p-6 lg:p-0 rounded-3xl bg-background-surface/40 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border border-border lg:border-none"
        >
          <div className="flex flex-col gap-1">
            <div className="font-tight text-[28px] lg:text-[32px] font-medium text-text-primary tracking-[-1px]">
              <Counter value={stats.models || 10000} suffix="+" />
            </div>
            <div className="font-mono text-[10px] lg:text-[11px] font-normal text-text-muted tracking-[0.5px]">3D-моделей создано</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-tight text-[28px] lg:text-[32px] font-medium text-text-primary tracking-[-1px]">
              <Counter value={99} suffix=".8%" />
            </div>
            <div className="font-mono text-[10px] lg:text-[11px] font-normal text-text-muted tracking-[0.5px]">точность генерации</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-tight text-[28px] lg:text-[32px] font-medium text-text-primary tracking-[-1px]">
              <Counter value={5} prefix="<" suffix=" мин" />
            </div>
            <div className="font-mono text-[10px] lg:text-[11px] font-normal text-text-muted tracking-[0.5px]">на одну модель</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
