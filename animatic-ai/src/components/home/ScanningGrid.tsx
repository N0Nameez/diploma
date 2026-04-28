import React from 'react';

/**
 * Background grid with a scanning effect.
 */
export function ScanningGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)'
      }}
    >
      {/* Basic grid of dots */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--text-primary) 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
          backgroundPosition: 'center',
        }}
      />

      {/* Animated gradient ("scanner") */}
      <div
        className="absolute inset-0 w-full h-[200%] opacity-30 mix-blend-screen animate-scanner"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(236,72,153,0.05) 48%, rgba(236,72,153,0.2) 50%, rgba(236,72,153,0.05) 52%, transparent 55%, transparent 100%)',
        }}
      />
    </div>
  );
}
