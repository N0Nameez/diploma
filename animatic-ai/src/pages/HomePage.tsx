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
// Background preloader for secondary models
import { preloadBackgroundModels } from '@/components/home/ModelPreloader';
import { LoadingScreen } from '@/components/LoadingScreen/LoadingScreen';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModelProgress } from '@/hooks/useModelProgress';

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
  const storeIsLoaded = useModelProgress(s => s.isLoaded);
  const storeProgress = useModelProgress(s => s.progress);
  const isMobile = useIsMobile();
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
    // On mobile, we bypass the 3D model loading screen entirely
    if (isMobile) {
      setIsLoaded(true);
      return;
    }

    // We consider it ready when our custom store says it's loaded and progress is 100
    if (storeProgress >= 100 && storeIsLoaded && !isLoaded) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
        // Start preloading the rest of the models in the background
        preloadBackgroundModels();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storeProgress, storeIsLoaded, isLoaded, isMobile]);

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
      {!isMobile && <LoadingScreen />}
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
