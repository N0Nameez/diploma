import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MagneticProps {
  children: React.ReactElement;
  strength?: number;
  className?: string;
}

/**
 * Magnetic component that attracts children to the mouse cursor within a certain range.
 * Adds a very premium interactive feel to buttons and icons.
 */
export function Magnetic({ children, strength = 0.2, className = "" }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Calculate distance from center
    const x = (clientX - centerX) * strength;
    const y = (clientY - centerY) * strength;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x, y }}
      transition={{ 
        type: "spring", 
        stiffness: 80, 
        damping: 20, 
        mass: 0.1,
        restDelta: 0.001 
      }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
