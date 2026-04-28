import { useMemo } from 'react';
import { motion } from 'framer-motion';

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * BackgroundParticles component that adds floating ambient particles for depth.
 * Reduced count on mobile for performance. Uses CSS will-change for GPU compositing.
 */
export function BackgroundParticles({ count = 20 }: { count?: number }) {
  // Further reduce particles on mobile
  const effectiveCount = IS_MOBILE ? Math.min(count, 8) : count;
  const pCount = Math.floor(effectiveCount * 0.6);
  const aCount = Math.floor(effectiveCount * 0.4);

  const particles = useMemo(() => 
    Array.from({ length: pCount }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10,
    })), [pCount]);

  const accents = useMemo(() => 
    Array.from({ length: aCount }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 15,
    })), [aCount]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.3, 0.3, 0],
            y: [-20, 100],
            x: [0, 15, -15, 5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute bg-text-primary/10 rounded-full will-change-transform"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
        />
      ))}
      
      {/* Accent distant petals — skip on mobile */}
      {!IS_MOBILE && accents.map((p) => (
        <motion.div
          key={`accent-${p.id}`}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.4, 0.4, 0],
            y: [-30, 120],
            x: [0, 20, -20, 10],
            rotate: [0, 360],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute bg-[#ffb7c5]/20 rounded-full will-change-transform"
          style={{
            width: p.size,
            height: p.size * 0.8,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
        />
      ))}
    </div>
  );
}
