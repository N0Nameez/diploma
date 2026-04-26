import React, { useRef } from 'react';
import { useScroll, useTransform, motion, useSpring, MotionValue } from 'framer-motion';
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { SakuraModel } from "@/components/home/SakuraModel";
import { Hero } from "@/components/home/Hero";
import { TreeCTA } from "@/components/home/TreeCTA";
import CursorGlow from "@/components/CursorGlow";
import { BackgroundParticles } from "@/components/home/BackgroundParticles";
import type { User } from "@supabase/supabase-js";

interface HeroSceneProps {
  onRegisterClick: () => void;
  user: User | null;
}

/**
 * HeroScene orchestrates the transition between the Hero content and TreeCTA.
 * It uses a sticky 3D background that responds to scroll progress.
 */
export function HeroScene({ onRegisterClick, user }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll progress for 3D transitions
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // UI Content Animations
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.15], [0, -50]);
  
  const ctaOpacity = useTransform(smoothProgress, [0.6, 0.8], [0, 1]);
  const ctaScale = useTransform(smoothProgress, [0.6, 0.8], [0.9, 1]);
  const ctaY = useTransform(smoothProgress, [0.6, 0.8], [30, 0]);

  // Blur effect for the tree as it scales up
  const treeBlur = useTransform(smoothProgress, [0.5, 0.8], [0, 12]);

  return (
    <div ref={containerRef} className="relative h-[350vh] bg-background-primary">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Persistent Background Elements */}
        <CursorGlow />
        <BackgroundParticles />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* 3D Scene Wrapper with Dynamic Blur */}
        <motion.div 
          style={{ 
            filter: useTransform(treeBlur, (v) => `blur(${v}px)`)
          }}
          className="absolute inset-0 z-0"
        >
          <Canvas 
            camera={{ position: [0, 0, 8], fov: 45 }} 
            eventSource={document.body} 
            eventPrefix="client"
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={2} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <directionalLight position={[-10, -10, -5]} intensity={1} color="#EC4899" />
            <SceneContent progress={smoothProgress} />
          </Canvas>
        </motion.div>

        {/* Hero Section Overlay */}
        <motion.div 
          style={{ 
            opacity: heroOpacity, 
            y: heroY,
            pointerEvents: useTransform(smoothProgress, (v) => v < 0.15 ? "auto" : "none") as any
          }}
          className="absolute inset-0 z-10 flex flex-col justify-end pb-20"
        >
          <Hero onRegisterClick={onRegisterClick} user={user} hideCanvas />
        </motion.div>

        {/* Tree CTA Section Overlay */}
        <motion.div 
          style={{ 
            opacity: ctaOpacity, 
            scale: ctaScale, 
            y: ctaY,
            pointerEvents: useTransform(smoothProgress, (v) => v > 0.7 ? "auto" : "none") as any
          }}
          className="absolute inset-0 z-20"
        >
           <div className="h-full flex items-center justify-center">
              <TreeCTA onStartClick={onRegisterClick} />
           </div>
        </motion.div>

        {/* Bottom fog fade */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-background-primary via-background-primary/80 to-transparent pointer-events-none z-30" />
      </div>
    </div>
  );
}

/**
 * SceneContent manages the 3D model properties by subscribing to scroll progress.
 */
function SceneContent({ progress }: { progress: MotionValue<number> }) {
  const { viewport, size } = useThree();
  const isMobile = size.width < 768;
  const modelRef = useRef<any>(null);

  // Derived transforms for Three.js
  // Note: We'll apply these in useFrame for maximum smoothness
  useFrame(() => {
    if (!modelRef.current) return;

    const p = progress.get();

    // 1. Position Transition (Right to Center)
    const currentP = Math.max(0, Math.min(1, (p - 0.1) / 0.4)); // 0.1 to 0.5 range
    const startX = isMobile ? 0 : viewport.width / 4;
    const endX = 0;
    const currentX = startX + (endX - startX) * currentP;

    const startY = isMobile ? -0.8 : 0;
    const endY = 0;
    const currentY = startY + (endY - startY) * currentP;

    // 2. Scale Transition (Growth)
    const startScale = isMobile ? viewport.width * 0.28 : 3;
    const midScale = isMobile ? viewport.width * 0.28 : 3;
    const endScale = isMobile ? viewport.width * 0.5 : 5.5;
    
    let currentScale;
    if (p < 0.5) {
      currentScale = startScale;
    } else {
      const scaleFactor = Math.max(0, Math.min(1, (p - 0.5) / 0.3)); // 0.5 to 0.8 range
      currentScale = midScale + (endScale - midScale) * scaleFactor;
    }

    // 3. Rotation (Slow rotation as it scales)
    const currentRotationY = p * Math.PI * 0.4;

    // Apply to group
    modelRef.current.position.set(currentX, currentY, 0);
    modelRef.current.scale.setScalar(currentScale);
    modelRef.current.rotation.set(0, currentRotationY, 0);
  });

  return (
    <group ref={modelRef}>
      <SakuraModel position={[0, 0, 0]} scale={1} />
    </group>
  );
}
