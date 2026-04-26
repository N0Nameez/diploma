import React from 'react';
import { motion } from 'framer-motion';

interface SectionDividerProps {
  className?: string;
}

/**
 * SectionDivider component to add visual interest between major landing page sections.
 * Features a glowing line with a subtle pulse.
 */
export function SectionDivider({ className = '' }: SectionDividerProps) {
  return (
    <div className={`relative w-full h-px bg-gradient-to-r from-transparent via-border to-transparent ${className}`}>
      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scaleX: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent blur-[2px]"
      />
    </div>
  );
}
