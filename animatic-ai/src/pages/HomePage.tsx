import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HeroScene } from '@/components/home/HeroScene';
import { AboutSection } from '@/components/home/AboutSection';
import { ProcessSection } from '@/components/home/ProcessSection';
import { CharacterSection } from '@/components/home/CharacterSection';
import { PricingSection } from '@/components/home/PricingSection';
import { FAQSection } from '@/components/home/FAQSection';
import { CTASection } from '@/components/home/CTASection';
import { WorkExamples } from '@/components/home/WorkExamples';
import { SectionDivider } from '@/components/home/SectionDivider';
import { useProgress } from '@react-three/drei';
// Triggers module-level useGLTF.preload() for all landing page models
import '@/components/home/ModelPreloader';

import type { User } from "@supabase/supabase-js";

interface HomePageProps {
  onRegisterClick: () => void;
  user: User | null;
}

/**
 * Main landing page component assembling all home sections.
 * Waits for all 3D assets to fully load before revealing content.
 */
export function HomePage({ onRegisterClick, user }: HomePageProps) {
  const { progress, active } = useProgress();
  const [isLoaded, setIsLoaded] = useState(false);
  const hasSeenActive = useRef(false);

  // Track whether loading has actually started
  useEffect(() => {
    if (active) {
      hasSeenActive.current = true;
    }
  }, [active]);

  useEffect(() => {
    // Only mark as loaded when:
    // 1. Loading has started at some point (hasSeenActive)
    // 2. Progress reached 100%
    // 3. Loading manager is no longer active
    if (hasSeenActive.current && progress >= 100 && !active) {
      const timer = setTimeout(() => setIsLoaded(true), 600);
      return () => clearTimeout(timer);
    }
  }, [progress, active]);

  useEffect(() => {
    // Safety fallback: show content after 20s no matter what
    const safety = setTimeout(() => setIsLoaded(true), 20000);
    return () => clearTimeout(safety);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isLoaded]);

  return (
    <>
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="min-h-screen bg-background-primary"
      >
        <HeroScene onRegisterClick={onRegisterClick} user={user} />
        <SectionDivider />
        <AboutSection />
        <SectionDivider className="opacity-50" />
        <ProcessSection />
        <SectionDivider />
        <WorkExamples />
        <SectionDivider />
        <CharacterSection />
        <SectionDivider className="opacity-50" />
        <PricingSection onRegisterClick={onRegisterClick} />
        <SectionDivider />
        <FAQSection />
        <CTASection onRegisterClick={onRegisterClick} />
      </motion.main>
    </>
  );
}
