import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
import { LoadingScreen } from '@/components/LoadingScreen/LoadingScreen';

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
  const navigate = useNavigate();

  const handleCTAAction = () => {
    if (user) {
      navigate('/generation');
    } else {
      onRegisterClick();
    }
  };

  useEffect(() => {
    // We consider it ready when progress is 100 AND loading is no longer active
    // This handles both fresh loads and cached assets
    if (progress >= 100 && !active && !isLoaded) {
      const timer = setTimeout(() => setIsLoaded(true), 2000);
      return () => clearTimeout(timer);
    }
    // Remove the `else if (active)` block that reverts isLoaded to false
  }, [progress, active, isLoaded]);

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
      <LoadingScreen />
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="min-h-screen bg-background-primary"
      >
        <HeroScene onRegisterClick={handleCTAAction} user={user} />
        <SectionDivider />
        <AboutSection />
        <SectionDivider className="opacity-50" />
        <ProcessSection />
        <SectionDivider />
        <WorkExamples onCTAAction={handleCTAAction} />
        <SectionDivider />
        <CharacterSection />
        <SectionDivider className="opacity-50" />
        <PricingSection onRegisterClick={handleCTAAction} />
        <SectionDivider />
        <FAQSection />
        <CTASection onRegisterClick={handleCTAAction} />
      </motion.main>
    </>
  );
}
