import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LoadingScreen - Premium loading experience for the landing page.
 * Tracks 3D model loading progress and provides a smooth transition.
 */
export function LoadingScreen() {
  const { progress, active } = useProgress();
  const [shouldShow, setShouldShow] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Safety timeout: if loading takes too long, force ready state
    const safetyTimer = setTimeout(() => {
      if (!isReady) {
        console.warn('LoadingScreen: Safety timeout reached. Forcing ready state.');
        setIsReady(true);
        setTimeout(() => setShouldShow(false), 1000);
      }
    }, 15000); // 15 seconds max

    // We consider it ready when progress is 100 AND loading is no longer active
    if (progress === 100 && !active) {
      const timer = setTimeout(() => {
        setIsReady(true);
        setTimeout(() => setShouldShow(false), 1000);
      }, 800);
      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }

    return () => clearTimeout(safetyTimer);
  }, [progress, active, isReady]);

  if (!shouldShow) return null;

  const statusMessages = [
    "Загружаем нейроны...",
    "Загружаем 3D модели...",
    "Оптимизируем геометрию...",
    "Синхронизируем шейдеры...",
    "Готовы к запуску"
  ];

  const currentStatusIndex = Math.min(
    Math.floor((progress / 100) * (statusMessages.length - 1)),
    statusMessages.length - 1
  );

  return (
    <AnimatePresence mode="wait">
      {!isReady && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
          }}
          className="fixed inset-0 z-[9999] bg-background-primary flex flex-col items-center justify-center p-6 overflow-hidden"
        >
          
          <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
            {/* Logo Section */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <h1 className="text-2xl font-bold tracking-[0.2em] text-text-primary uppercase">
                  ANIMATIC <span className="text-accent">AI</span>
                </h1>
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse delay-75" />
              </div>
              <motion.p 
                key={currentStatusIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-text-muted text-[10px] font-mono tracking-[0.3em] uppercase h-4"
              >
                {statusMessages[currentStatusIndex]}
              </motion.p>
            </motion.div>

            {/* Progress Visualization */}
            <div className="w-full space-y-6">
              <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent via-accent2 to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              <div className="flex justify-between items-center font-mono text-[9px] text-text-muted uppercase tracking-widest right-0">
                <span className="text-accent font-bold tabular-nums ">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="absolute bottom-12 right-12 flex justify-between items-end">
            <div className="flex gap-6 items-center">
               <div className="h-px w-12 bg-white/5" />
               <span className="font-mono text-[8px] text-text-muted/40 uppercase tracking-[0.2em]">
                 Animatic AI System v1.0
               </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

