import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * BackgroundParticles component that adds floating ambient particles for depth.
 */
export function BackgroundParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 1 + 10,
      delay: Math.random() * 10,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: 0 }}
          animate={{
            opacity: [0, 0.4, 0.4, 0],
            y: [-20, 100],
            x: [0, 20, -20, 10],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute bg-white/15 rounded-sm blur-[1px]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
        />
      ))}
      
      {/* Accent "sakura" distant petals */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 15;
        
        return (
          <motion.div
            key={`accent-${i}`}
            initial={{ opacity: 0, x: 0 }}
            animate={{
              opacity: [0, 0.5, 0.5, 0],
              y: [-30, 120],
              x: [0, 30, -30, 15],
              rotate: [0, 360, 720],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "linear"
            }}
            className="absolute bg-[#ffb7c5]/30 rounded-sm blur-[1.5px]"
            style={{
              width: size,
              height: size * 0.7,
              left: `${left}%`,
              top: `${top}%`,
            }}
          />
        );
      })}
    </div>
  );
}
