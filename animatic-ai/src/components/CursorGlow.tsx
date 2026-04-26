import React, { useEffect, useRef } from 'react';

const CursorGlow = () => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursorGlow = glowRef.current;
    if (!cursorGlow) return;

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animateGlow = () => {
      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      cursorGlow.style.left = `${glowX}px`;
      cursorGlow.style.top = `${glowY}px`;
      
      // Make it visible once mouse moves
      if (cursorGlow.style.opacity !== '1') {
          cursorGlow.style.opacity = '1';
      }

      animationFrameId = requestAnimationFrame(animateGlow);
    };

    document.addEventListener('mousemove', handleMouseMove);
    animateGlow();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed w-[100px] h-[100px] rounded-full bg-cursor-glow pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 opacity-0"
    />
  );
};

export default CursorGlow;
