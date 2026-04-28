import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { RobotModel } from './RobotModel';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { useInView } from 'react-intersection-observer';

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * Section featuring the interactive robot character.
 * Uses ID "character" for scroll-based rotation trigger in RobotModel.
 * On mobile, Canvas quality is reduced and shadows are disabled.
 */
export function CharacterSection() {
  const { ref, inView } = useInView({
    threshold: 0.05,
    triggerOnce: true,       // Keep Canvas alive once mounted
    rootMargin: '400px 0px', // Pre-mount before visible
  });

  return (
    <section ref={ref} className="py-[160px] px-10 max-w-[1280px] mx-auto relative overflow-hidden" id="character">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="font-mono text-[12px] font-normal text-text-muted tracking-[1px] flex items-center gap-3 mb-16 before:content-[''] before:w-8 before:h-px before:bg-accent/30 uppercase"
                  >
                    Персональный ассистент
            </motion.div>
          <h2 className="font-tight text-[clamp(40px,6vw,80px)] font-medium leading-[0.95] tracking-[-3px] mb-8">
            Ваш <span className="text-accent">цифровой</span><br />
            помощник оживает.
          </h2>
          
          <p className="text-[18px] font-light text-text-tertiary leading-[1.6] max-w-[480px] mb-10">
            Встречайте вашего персонального ассистента. Он не просто выполняет задачи — он адаптируется к вашему стилю работы, учится на ваших предпочтениях и становится умнее с каждым днем.
          </p>
          
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="font-tight text-[32px] font-medium mb-1">24/7</div>
              <div className="font-mono text-[11px] text-text-dimmed uppercase tracking-wider">Всегда на связи</div>
            </div>
            <div>
              <div className="font-tight text-[32px] font-medium mb-1">0.1с</div>
              <div className="font-mono text-[11px] text-text-dimmed uppercase tracking-wider">Скорость отклика</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square lg:aspect-auto lg:h-[600px] bg-gradient-to-b from-background-surface to-transparent rounded-[40px] border border-border-default overflow-hidden group shadow-xl shadow-accent/20"
        >
          
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
            {inView && (
              <Canvas 
                shadows={!IS_MOBILE}
                camera={{ position: [0, 0, 10], fov: 40 }}
                dpr={IS_MOBILE ? [1, 1] : [1, 1.5]}
                performance={{ min: 0.5 }}
                gl={{ 
                  antialias: false, 
                  powerPreference: 'high-performance',
                  stencil: false,
                }}
              >
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow={!IS_MOBILE} />
                <pointLight position={[-10, -10, -10]} />
                <Suspense fallback={null}>
                  <Stage environment="city" intensity={0.6}>
                    <RobotModel />
                  </Stage>
                </Suspense>
                <OrbitControls 
                  enableZoom={false} 
                  enablePan={false}
                  minPolarAngle={Math.PI / 2.5}
                  maxPolarAngle={Math.PI / 1.5}
                />
              </Canvas>
            )}
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] text-accent uppercase tracking-widest bg-background-primary/80 backdrop-blur-md px-4 py-2 rounded-full border border-accent opacity-0 group-hover:opacity-100 transition-opacity">
            Интерактивная 3D-модель
          </div>
        </motion.div>
      </div>

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10" />
    </section>
  );
}
