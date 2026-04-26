import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { ArrowRight } from 'lucide-react';
import { Magnetic } from '@/components/Magnetic';

interface TreeCTAProps {
  onStartClick: () => void;
}

/**
 * TreeCTA section that appears after Hero scroll.
 * Features large premium typography and a call to action.
 */
export function TreeCTA({ onStartClick }: TreeCTAProps) {
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-center px-6 lg:px-10 overflow-hidden">
      {/* Background Overlay for contrast */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-background-primary/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.6)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className="flex flex-col items-center p-10 md:p-16 lg:p-20 rounded-[40px] md:rounded-[60px] border border-white/10 bg-black/20 backdrop-blur-xl shadow-[0_0_100px_rgba(0,0,0,0.3)]">
          <div className="font-mono text-[11px] font-normal text-accent tracking-[3px] mb-8 uppercase px-4 py-1.5 border border-accent/20 rounded-full bg-accent/5 backdrop-blur-sm">
            Будущее уже здесь
          </div>

          <h2 className="font-tight text-[clamp(32px,7vw,88px)] font-medium leading-[0.95] mb-10 text-text-primary drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            Создавай 3D модели <br />
            <span className="inline-block pr-4 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-accent via-white to-accent animate-gradient-x italic font-light tracking-[-1px] lg:tracking-[-2px] opacity-90">
              одним касанием
            </span>
          </h2>
          
          <p className="font-mono text-text-tertiary text-[14px] lg:text-[16px] max-w-[650px] mx-auto mb-14 leading-relaxed tracking-[0.05em] uppercase opacity-80">
            Воплощай свои идеи в реальность с помощью <br className="hidden md:block" /> мощнейшего ИИ нового поколения
          </p>

          <Magnetic strength={0.1}>
            <Button 
              label="Начать" 
              onClick={onStartClick}
              variant="hero-primary"
              icon={<ArrowRight className="w-5 h-5 ml-2" />}
              className="rounded-full px-12 py-7 text-xl shadow-[0_20px_60px_rgba(236,72,153,0.35)] hover:shadow-[0_25px_80px_rgba(236,72,153,0.5)] transition-all duration-500"
            />
          </Magnetic>
        </div>
      </div>

      {/* Decorative radial glow behind the card */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-accent/10 blur-[180px] rounded-full opacity-40" />
      </div>
    </div>
  );
}
